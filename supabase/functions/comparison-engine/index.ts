/**
 * comparison-engine — aggregates per-store price results into ranked recommendations.
 *
 * Called by Fly workers after all store fetches complete (or timeout).
 * Auth: service-role only (called internally, not by frontend directly).
 *
 * Realtime channel: price-fetch:${deliveryId}
 * Progress event payload: { store, status, percent, itemsMatched }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { StoreId, PriceResult } from '../_shared/types.ts'
import type { ApiError } from '../_shared/types.ts'

const STORES: StoreId[] = ['tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose']
const LOYALTY_EARN_RATES: Partial<Record<StoreId, number>> = {
  tesco:      0.01,  // 1p per £1
  asda:       0.01,
  sainsburys: 0.005, // 0.5p per £1 (Nectar)
  morrisons:  0.01,
}

const DELIVERY_FEE = 3.99

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED', message: 'POST required' } as ApiError, 405)

  // Service role auth: validate WORKER_SECRET
  const workerSecret = req.headers.get('x-worker-secret')
  if (workerSecret !== Deno.env.get('WORKER_SECRET')) {
    return json({ code: 'UNAUTHORIZED', message: 'Invalid worker secret' } as ApiError, 401)
  }

  const { deliveryId } = await req.json()
  if (!deliveryId) return json({ code: 'BAD_REQUEST', message: 'deliveryId required' } as ApiError, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Load basket items for this delivery
  const { data: delivery } = await supabase
    .from('deliveries')
    .select('basket_id, user_id')
    .eq('id', deliveryId)
    .single()

  if (!delivery) return json({ code: 'NOT_FOUND', message: 'Delivery not found' } as ApiError, 404)

  const { data: items } = await supabase
    .from('basket_items')
    .select('id, product_id, quantity, unit, products(name, brand)')
    .eq('basket_id', delivery.basket_id)

  if (!items?.length) return json({ code: 'EMPTY_BASKET', message: 'No items in basket' } as ApiError, 400)

  // Load user loyalty preferences
  const { data: profile } = await supabase
    .from('profiles')
    .select('loyalty_cards')
    .eq('id', delivery.user_id)
    .single()

  const userLoyaltyCards = (profile?.loyalty_cards || {}) as Partial<Record<StoreId, boolean>>
  const productIds = items.map((i: any) => i.product_id)

  // Load price cache for all products × stores
  const { data: prices } = await supabase
    .from('price_cache')
    .select('product_id, store, price, available, substitute_id, fetched_at')
    .in('product_id', productIds)

  if (!prices) return json({ code: 'NO_PRICES', message: 'No cached prices available', hint: 'Run price-fetch first' } as ApiError, 503)

  // Build store totals
  const storeTotals: Record<StoreId, {
    total: number; matched: number; unavailable: string[]; substitutions: number;
  }> = {} as any

  for (const store of STORES) {
    storeTotals[store] = { total: 0, matched: 0, unavailable: [], substitutions: 0 }
  }

  // Line items with per-store breakdown
  const lineItems = items.map((item: any) => {
    const storeResults: Record<string, { price: number; available: boolean; isSubstitute: boolean }> = {}

    for (const store of STORES) {
      const cached = prices.find((p: any) => p.product_id === item.product_id && p.store === store)
      if (cached && cached.available) {
        const linePrice = cached.price * item.quantity
        storeResults[store] = { price: cached.price, available: true, isSubstitute: !!cached.substitute_id }
        storeTotals[store].total += linePrice
        storeTotals[store].matched++
        if (cached.substitute_id) storeTotals[store].substitutions++
      } else {
        storeResults[store] = { price: 0, available: false, isSubstitute: false }
        const productName = (item.products as any)?.name || 'Unknown'
        if (!storeTotals[store].unavailable.includes(productName)) {
          storeTotals[store].unavailable.push(productName)
        }
      }
    }

    const storeWithPrice = Object.entries(storeResults)
      .filter(([, v]) => v.available)
      .sort(([, a], [, b]) => a.price - b.price)
    const cheapestStore = storeWithPrice[0]?.[0] as StoreId | undefined

    return {
      productId: item.product_id,
      productName: (item.products as any)?.name || 'Unknown',
      quantity: item.quantity,
      unit: item.unit,
      results: storeResults,
      cheapestStore,
    }
  })

  // Build ranked recommendations with loyalty adjustments
  const maxTotal = Math.max(...STORES.map(s => storeTotals[s].total))

  const recommendations = STORES
    .filter(store => storeTotals[store].matched > 0)
    .map(store => {
      const { total, matched, unavailable, substitutions } = storeTotals[store]
      const earnRate = (userLoyaltyCards[store] && LOYALTY_EARN_RATES[store]) ? LOYALTY_EARN_RATES[store]! : 0
      const loyaltySaving = parseFloat((total * earnRate).toFixed(2))
      const totalAfterLoyalty = parseFloat((total - loyaltySaving).toFixed(2))

      return {
        store,
        totalPrice: parseFloat(total.toFixed(2)),
        totalAfterLoyalty,
        loyaltySaving,
        savingsVsMax: parseFloat((maxTotal - total).toFixed(2)),
        itemsCovered: matched,
        totalItems: items.length,
        unavailableItems: unavailable,
        substitutions,
        deliveryFee: DELIVERY_FEE,
        deliveryEta: '09:00 - 11:00',
      }
    })
    .sort((a, b) => a.totalAfterLoyalty - b.totalAfterLoyalty)
    .slice(0, 3)
    .map((rec, i) => ({ ...rec, rank: (i + 1) as 1 | 2 | 3 }))

  const savingsVsMax = recommendations[0]
    ? parseFloat((maxTotal - recommendations[0].totalPrice).toFixed(2))
    : 0

  // Store comparison result
  const { data: compResult, error: compError } = await supabase
    .from('comparison_results')
    .insert({ delivery_id: deliveryId, recommendations, savings_vs_max: savingsVsMax })
    .select('id')
    .single()

  if (compError) console.error('Failed to save comparison result:', compError)

  // Store line items
  if (compResult) {
    await supabase.from('comparison_line_items').insert(
      lineItems.map(li => ({
        comparison_id: compResult.id,
        product_id: li.productId,
        product_name: li.productName,
        quantity: li.quantity,
        unit: li.unit,
        cheapest_store: li.cheapestStore,
        store_prices: li.results,
      }))
    )
  }

  // Update delivery status
  await supabase
    .from('deliveries')
    .update({ status: 'awaiting_approval' })
    .eq('id', deliveryId)

  // Broadcast completion via Realtime
  await supabase.channel(`price-fetch:${deliveryId}`).send({
    type: 'broadcast',
    event: 'completed',
    payload: { deliveryId, topStore: recommendations[0]?.store, savings: savingsVsMax },
  })

  return json({ success: true, deliveryId, recommendations }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
