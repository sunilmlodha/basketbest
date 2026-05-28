/**
 * price-feed — Supabase Edge Function
 *
 * Fetches real UK grocery prices via Apify actors for a list of products,
 * upserts fresh data into `price_cache`, and returns a structured
 * per-product, per-store price result.
 *
 * Tesco:        jupri/tesco-grocery  (dedicated actor, live)
 * Other stores: Apify generic web-scraper with store-specific CSS selectors
 *               Falls back to cache if scraper returns nothing.
 *
 * POST /functions/v1/price-feed
 * Body: { products: Array<{ id: string; name: string }>, basketId?: string }
 *
 * Response:
 * {
 *   results: Array<{
 *     productId: string
 *     productName: string
 *     prices: Record<StoreId, number | null>
 *     source: 'live' | 'cache' | 'unavailable'
 *   }>
 *   fetchedAt: string  // ISO-8601
 * }
 *
 * Env vars required:
 *   SUPABASE_URL              — set automatically by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — set automatically by Supabase runtime
 *   APIFY_TOKEN               — from https://console.apify.com/account/integrations
 */

import { createClient } from 'npm:@supabase/supabase-js@2'
import { fetchBasketPricesApify } from './apify-adapter.ts'
import type { StoreId } from '../_shared/types.ts'

// ─── Constants ───────────────────────────────────────────────────────────────

const STORES: StoreId[] = ['tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose']
const TTL_HOURS = 26 // same cadence as the CSV import job
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface RequestProduct {
  id: string
  name: string
}

interface RequestBody {
  products: RequestProduct[]
  basketId?: string
}

type PriceSource = 'live' | 'cache' | 'unavailable'

interface ProductResult {
  productId: string
  productName: string
  prices: Record<StoreId, number | null>
  source: PriceSource
}

interface PriceFeedResponse {
  results: ProductResult[]
  fetchedAt: string
}

interface PriceCacheRow {
  product_id: string
  store: StoreId
  price: number
  available: boolean
  fetched_at: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function emptyPriceRecord(): Record<StoreId, number | null> {
  return Object.fromEntries(STORES.map((s) => [s, null])) as Record<StoreId, number | null>
}

function nowIso(): string {
  return new Date().toISOString()
}

function expiresIso(fromMs: number = Date.now()): string {
  return new Date(fromMs + TTL_HOURS * 60 * 60 * 1000).toISOString()
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // ── CORS pre-flight ────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ code: 'METHOD_NOT_ALLOWED', message: 'POST required' }, 405)
  }

  // ── Parse request body ─────────────────────────────────────────────────────
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ code: 'BAD_REQUEST', message: 'Invalid JSON body' }, 400)
  }

  const { products, basketId } = body

  if (!Array.isArray(products) || products.length === 0) {
    return jsonResponse(
      { code: 'BAD_REQUEST', message: '`products` must be a non-empty array of { id, name }' },
      400
    )
  }

  // Validate individual items — skip malformed but don't abort
  const validProducts: RequestProduct[] = products.filter(
    (p) => typeof p?.id === 'string' && p.id.trim() && typeof p?.name === 'string' && p.name.trim()
  )

  if (!validProducts.length) {
    return jsonResponse(
      { code: 'BAD_REQUEST', message: 'No valid products found — each must have id and name' },
      400
    )
  }

  // ── Initialise clients ─────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const apifyToken = Deno.env.get('APIFY_TOKEN') ?? ''

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const fetchedAt = nowIso()

  // ── Fetch live prices via Apify actors ─────────────────────────────────────
  // fetchBasketPricesApify returns Map<productName, Partial<Record<StoreId, number>>>
  let livePricesMap = new Map<string, Partial<Record<string, number>>>()

  if (apifyToken) {
    try {
      livePricesMap = await fetchBasketPricesApify(validProducts, apifyToken)
    } catch (err) {
      // Non-fatal: log and fall through to cache-only path
      console.error('[price-feed] Apify batch error:', err)
    }
  } else {
    console.warn('[price-feed] APIFY_TOKEN not set — serving from cache only')
  }

  // ── Load existing cache rows for fallback ──────────────────────────────────
  const productIds = validProducts.map((p) => p.id)
  let cacheRows: PriceCacheRow[] = []

  const { data: cacheData, error: cacheError } = await supabase
    .from('price_cache')
    .select('product_id, store, price, available, fetched_at')
    .in('product_id', productIds)

  if (cacheError) {
    console.error('[price-feed] Failed to load price cache:', cacheError.message)
  } else {
    cacheRows = (cacheData ?? []) as PriceCacheRow[]
  }

  // Index cache by "productId|storeId" for O(1) lookups
  const cacheIndex = new Map<string, PriceCacheRow>()
  for (const row of cacheRows) {
    cacheIndex.set(`${row.product_id}|${row.store}`, row)
  }

  // ── Build results & collect upsert records ─────────────────────────────────
  const results: ProductResult[] = []
  const upsertRecords: PriceCacheRow[] = []

  for (const product of validProducts) {
    // Apify adapter keys by product.id (see fetchBasketPricesApify)
    const livePrices = livePricesMap.get(product.id)
    const prices = emptyPriceRecord()
    let source: PriceSource = 'unavailable'
    let hasAnyPrice = false

    if (livePrices) {
      // We got live data — fill from API response, fall back store-by-store to cache
      for (const store of STORES) {
        const livePrice = livePrices[store]
        if (typeof livePrice === 'number' && livePrice > 0) {
          prices[store] = livePrice
          hasAnyPrice = true

          upsertRecords.push({
            product_id: product.id,
            store,
            price: livePrice,
            available: true,
            fetched_at: fetchedAt,
          })
        } else {
          // Store not returned by API — use cache if available and not expired
          const cached = cacheIndex.get(`${product.id}|${store}`)
          if (cached && cached.available && (Date.now() - new Date(cached.fetched_at).getTime()) < TTL_HOURS * 3600_000) {
            prices[store] = cached.price
            hasAnyPrice = true
          }
        }
      }
      source = hasAnyPrice ? 'live' : 'unavailable'
    } else {
      // No live data for this product — try full cache fallback
      for (const store of STORES) {
        const cached = cacheIndex.get(`${product.id}|${store}`)
        if (cached && cached.available && (Date.now() - new Date(cached.fetched_at).getTime()) < TTL_HOURS * 3600_000) {
          prices[store] = cached.price
          hasAnyPrice = true
        }
      }
      source = hasAnyPrice ? 'cache' : 'unavailable'
    }

    results.push({
      productId: product.id,
      productName: product.name,
      prices,
      source,
    })
  }

  // ── Upsert fresh prices back into price_cache ──────────────────────────────
  if (upsertRecords.length > 0) {
    const CHUNK_SIZE = 500
    for (let i = 0; i < upsertRecords.length; i += CHUNK_SIZE) {
      const chunk = upsertRecords.slice(i, i + CHUNK_SIZE)
      const { error: upsertError } = await supabase
        .from('price_cache')
        .upsert(chunk, { onConflict: 'product_id,store' })

      if (upsertError) {
        // Log but don't fail the request — the caller still gets price data
        console.error(
          `[price-feed] Cache upsert failed at chunk ${i}–${i + chunk.length}:`,
          upsertError.message
        )
      }
    }
  }

  // ── Optionally log basket-level fetch metadata ─────────────────────────────
  if (basketId) {
    const liveCount = results.filter((r) => r.source === 'live').length
    const cacheCount = results.filter((r) => r.source === 'cache').length
    const unavailCount = results.filter((r) => r.source === 'unavailable').length
    console.log(
      `[price-feed] basketId=${basketId} products=${validProducts.length} ` +
        `live=${liveCount} cache=${cacheCount} unavailable=${unavailCount}`
    )
  }

  // ── Return response ────────────────────────────────────────────────────────
  const responseBody: PriceFeedResponse = {
    results,
    fetchedAt,
  }

  return jsonResponse(responseBody, 200)
})
