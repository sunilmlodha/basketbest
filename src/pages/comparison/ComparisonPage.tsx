import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, AlertCircle, ChevronRight, ChevronDown, ChevronUp,
  Trophy, TrendingDown, Package, AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { DEMO_COMPARISON } from '../../lib/demo-data'
import { STORES, type StoreId, type ComparisonResult } from '../../types'
import { StoreChip } from '../../components/StoreChip'
import { ProgressBar } from '../../components/ProgressBar'
import { formatGBP } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

const FETCH_STEPS: Array<{ store: StoreId; delay: number }> = [
  { store: 'tesco',      delay: 800  },
  { store: 'asda',       delay: 1400 },
  { store: 'sainsburys', delay: 2200 },
  { store: 'morrisons',  delay: 3100 },
  { store: 'ocado',      delay: 4200 },
  { store: 'waitrose',   delay: 5500 },
]

/** Build a ComparisonResult from raw price data returned by the price-feed function */
function buildComparison(
  basketItems: Array<{ id: string; name: string; quantity: number }>,
  priceResults: Array<{ productId: string; productName: string; prices: Record<StoreId, number | null> }>
): ComparisonResult {
  const STORES_LIST: StoreId[] = ['tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose']
  const DELIVERY_FEES: Record<StoreId, number> = {
    tesco: 3.99, asda: 3.50, sainsburys: 3.99, morrisons: 4.49, ocado: 3.99, waitrose: 4.99,
  }

  // Per-store totals
  const storeTotals: Record<StoreId, number> = {} as Record<StoreId, number>
  STORES_LIST.forEach(s => { storeTotals[s] = 0 })

  const lineItems = priceResults.map(r => {
    const qty = basketItems.find(b => b.id === r.productId)?.quantity ?? 1
    const results: ComparisonResult['lineItems'][0]['results'] = {}
    let cheapestStore: StoreId | undefined
    let cheapestPrice = Infinity

    STORES_LIST.forEach(s => {
      const p = r.prices[s]
      if (p != null && p > 0) {
        results[s] = { price: p * qty, unitPrice: p, available: true, isSubstitute: false }
        storeTotals[s] += p * qty
        if (p < cheapestPrice) { cheapestPrice = p; cheapestStore = s }
      }
    })
    return { productId: r.productId, productName: r.productName, quantity: qty, unit: 'each', results, cheapestStore }
  })

  // Build store results
  const maxTotal = Math.max(...STORES_LIST.map(s => storeTotals[s]).filter(t => t > 0))
  const storeResults = STORES_LIST.map(s => ({
    store: s, status: storeTotals[s] > 0 ? 'done' : 'failed' as 'done' | 'failed',
    percent: 100, itemsMatched: storeTotals[s] > 0 ? priceResults.length : 0,
    totalItems: priceResults.length, totalPrice: storeTotals[s] || undefined,
    fetchedAt: new Date().toISOString(),
  }))

  // Top 3 recommendations (stores with prices, sorted cheapest first)
  const ranked = STORES_LIST
    .filter(s => storeTotals[s] > 0)
    .sort((a, b) => storeTotals[a] - storeTotals[b])
    .slice(0, 3)

  const recommendations = ranked.map((s, i) => ({
    rank: (i + 1) as 1 | 2 | 3,
    store: s,
    totalPrice: storeTotals[s],
    totalAfterLoyalty: storeTotals[s],
    loyaltySaving: 0,
    savingsVsMax: maxTotal - storeTotals[s],
    itemsCovered: priceResults.filter(r => r.prices[s] != null).length,
    totalItems: priceResults.length,
    unavailableItems: priceResults.filter(r => !r.prices[s]).map(r => r.productName),
    substitutions: 0,
    deliveryFee: DELIVERY_FEES[s],
    deliveryEta: '2–4 hrs',
  }))

  return {
    id: `cmp-${Date.now()}`,
    deliveryId: '',
    storeResults,
    lineItems,
    recommendations: recommendations.length > 0 ? recommendations : DEMO_COMPARISON.recommendations,
    savingsVsMax: recommendations[0] ? maxTotal - recommendations[0].totalPrice : 0,
    createdAt: new Date().toISOString(),
  }
}

export function ComparisonPage() {
  const navigate = useNavigate()
  const {
    isComparing, setComparing, setComparison,
    currentComparison, getActiveBasket, isDemoMode,
  } = useAppStore()

  const basket = getActiveBasket()
  const [progress, setProgress] = useState<Record<string, 'idle' | 'fetching' | 'done'>>({})
  const [overallPercent, setOverallPercent] = useState(0)
  const [expandedStore, setExpandedStore] = useState<StoreId | null>(null)
  const [selectedRec, setSelectedRec] = useState(0)
  const fetchStarted = useRef(false)

  useEffect(() => {
    if (!isComparing) return
    if (fetchStarted.current) return
    fetchStarted.current = true

    const timers: ReturnType<typeof setTimeout>[] = []
    let doneCount = 0

    // Kick off the real price fetch in the background (non-blocking)
    let livePricePromise: Promise<ComparisonResult | null> = Promise.resolve(null)

    if (!isDemoMode && basket && SUPABASE_URL) {
      livePricePromise = (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const products = basket.items.map(i => ({ id: i.product.id, name: i.product.name }))
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/price-feed`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ products, basketId: basket.id }),
          })
          if (!resp.ok) return null
          const data = await resp.json()
          if (data.results?.length > 0) {
            return buildComparison(
              basket.items.map(i => ({ id: i.product.id, name: i.product.name, quantity: i.quantity })),
              data.results
            )
          }
        } catch (err) {
          console.warn('[comparison] price-feed fetch failed, using demo data', err)
        }
        return null
      })()
    }

    // Animate each store row progressively
    FETCH_STEPS.forEach(({ store, delay }) => {
      timers.push(setTimeout(() => {
        setProgress(p => ({ ...p, [store]: 'fetching' }))
      }, delay))

      timers.push(setTimeout(() => {
        setProgress(p => ({ ...p, [store]: 'done' }))
        doneCount++
        setOverallPercent(Math.round((doneCount / FETCH_STEPS.length) * 100))

        if (doneCount === FETCH_STEPS.length) {
          // Wait for real fetch to resolve, then show results
          setTimeout(async () => {
            const liveResult = await livePricePromise
            setComparing(false)
            setComparison(liveResult ?? DEMO_COMPARISON)
          }, 600)
        }
      }, delay + 800))
    })

    return () => {
      timers.forEach(clearTimeout)
      fetchStarted.current = false
    }
  }, [isComparing, setComparing, setComparison, isDemoMode, basket])

  // Loading / progress screen
  if (isComparing) {
    return (
      <div className="page-container">
        <div className="text-center mb-8 pt-4">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingDown className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Comparing prices…</h1>
          <p className="text-sm text-gray-500">Checking {basket?.items.length || 0} items across 6 UK stores</p>
        </div>

        <ProgressBar percent={overallPercent} className="mb-6 h-2" />

        <div className="space-y-3">
          {FETCH_STEPS.map(({ store }) => {
            const status = progress[store] || 'idle'
            const info = STORES[store]
            return (
              <div key={store} className="card px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                  store === 'tesco'      ? 'bg-blue-600' :
                  store === 'asda'       ? 'bg-green-600' :
                  store === 'sainsburys' ? 'bg-orange-500' :
                  store === 'morrisons'  ? 'bg-yellow-500' :
                  store === 'ocado'      ? 'bg-purple-600' : 'bg-gray-700'
                }`}>{info.logoText}</div>
                <span className="text-sm font-medium text-gray-800 flex-1">{info.name}</span>
                {status === 'idle'     && <span className="text-xs text-gray-300">Waiting…</span>}
                {status === 'fetching' && (
                  <span className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                    <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
                    Fetching
                  </span>
                )}
                {status === 'done' && <CheckCircle2 className="w-5 h-5 text-brand-500" />}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Prices fetched in real time · Updated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    )
  }

  if (!currentComparison) {
    navigate('/basket')
    return null
  }

  const recs = currentComparison.recommendations
  const best = recs[0]

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-brand-600 to-brand-700 px-4 pt-6 pb-8 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-semibold text-brand-100">Best price found!</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-brand-200 text-sm mb-1">Best option</p>
            <h1 className="text-3xl font-bold">{formatGBP(best.totalAfterLoyalty)}</h1>
            {best.loyaltySaving > 0 && (
              <p className="text-brand-200 text-xs mt-0.5">incl. {formatGBP(best.loyaltySaving)} loyalty saving</p>
            )}
          </div>
          <div className="text-right">
            <StoreChip storeId={best.store} className="mb-1" />
            <p className="text-brand-200 text-xs">
              Save <strong className="text-white">{formatGBP(best.savingsVsMax)}</strong> vs most expensive
            </p>
          </div>
        </div>
      </div>

      {/* Store results + tabs */}
      <div className="px-4 -mt-4">
        {/* Top 3 recommendation cards */}
        <div className="space-y-3 mb-6">
          {recs.map((rec, i) => {
            const store = STORES[rec.store]
            const isSelected = selectedRec === i
            const isExpanded = expandedStore === rec.store

            return (
              <div
                key={rec.store}
                className={`card transition-all ${isSelected ? 'ring-2 ring-brand-500' : ''}`}
              >
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => { setSelectedRec(i); setExpandedStore(isExpanded ? null : rec.store) }}
                >
                  {/* Rank badge */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-400 text-yellow-900' :
                    i === 1 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-600'
                  }`}>{i + 1}</div>

                  {/* Store */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                    rec.store === 'tesco'      ? 'bg-blue-600' :
                    rec.store === 'asda'       ? 'bg-green-600' :
                    rec.store === 'sainsburys' ? 'bg-orange-500' :
                    rec.store === 'morrisons'  ? 'bg-yellow-500' :
                    rec.store === 'ocado'      ? 'bg-purple-600' : 'bg-gray-700'
                  }`}>{store.logoText}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{store.name}</span>
                      {i === 0 && <span className="badge-green">Best value</span>}
                      {rec.unavailableItems.length > 0 && (
                        <span className="badge-yellow">{rec.unavailableItems.length} missing</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{rec.itemsCovered}/{rec.totalItems} items</span>
                      {rec.substitutions > 0 && <span className="text-xs text-yellow-600">{rec.substitutions} sub</span>}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold text-gray-900">{formatGBP(rec.totalAfterLoyalty)}</div>
                    {rec.loyaltySaving > 0 && (
                      <div className="text-xs text-brand-600">-{formatGBP(rec.loyaltySaving)} loyalty</div>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto mt-1" />}
                  </div>
                </div>

                {/* Expanded: line items */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                    {rec.unavailableItems.length > 0 && (
                      <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg mb-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-700">
                          Not available: {rec.unavailableItems.join(', ')}
                        </p>
                      </div>
                    )}
                    {currentComparison.lineItems.slice(0, 5).map(item => {
                      const storeResult = item.results[rec.store]
                      return (
                        <div key={item.productId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-gray-300" />
                            <span className="text-xs text-gray-700 truncate max-w-[160px]">
                              {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.productName}
                            </span>
                            {storeResult?.isSubstitute && (
                              <span className="text-xs text-yellow-600">(sub)</span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-gray-900 flex-shrink-0">
                            {storeResult ? formatGBP(storeResult.price) : <span className="text-red-400">N/A</span>}
                          </span>
                        </div>
                      )
                    })}
                    {currentComparison.lineItems.length > 5 && (
                      <p className="text-xs text-gray-400 text-center">+{currentComparison.lineItems.length - 5} more items</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Delivery fee</span>
                      <span className="text-xs text-gray-700">{formatGBP(rec.deliveryFee)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total</span>
                      <span className="text-sm font-bold text-gray-900">{formatGBP(rec.totalAfterLoyalty + rec.deliveryFee)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* All stores comparison (summary row) */}
        <div className="card mb-6">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">All stores compared</h3>
            <p className="text-xs text-gray-400 mt-0.5">Prices as of {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          {currentComparison.storeResults.map(result => (
            <div key={result.store} className="flex items-center px-4 py-2.5 border-b border-gray-50 last:border-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-3 ${
                result.store === 'tesco'      ? 'bg-blue-600' :
                result.store === 'asda'       ? 'bg-green-600' :
                result.store === 'sainsburys' ? 'bg-orange-500' :
                result.store === 'morrisons'  ? 'bg-yellow-500' :
                result.store === 'ocado'      ? 'bg-purple-600' : 'bg-gray-700'
              }`}>{STORES[result.store].logoText}</div>
              <span className="text-sm text-gray-700 flex-1">{STORES[result.store].name}</span>
              {result.status === 'failed' ? (
                <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />Unavailable</span>
              ) : (
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">{result.totalPrice ? formatGBP(result.totalPrice) : '—'}</span>
                  {(result.loyaltySaving ?? 0) > 0 && (
                    <div className="text-xs text-brand-600">-{formatGBP(result.loyaltySaving ?? 0)} loyalty</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loyalty note */}
        <div className="p-3 bg-blue-50 rounded-xl mb-6">
          <p className="text-xs text-blue-700">
            <strong>Loyalty prices</strong> are estimated based on your saved cards and published earn rates. Actual savings may vary.
          </p>
        </div>
      </div>

      {/* Sticky approve CTA */}
      <div className="sticky-bottom">
        <button
          onClick={() => navigate('/checkout')}
          className="btn-primary-lg w-full"
        >
          Approve {STORES[recs[selectedRec].store].name} — {formatGBP(recs[selectedRec].totalAfterLoyalty + recs[selectedRec].deliveryFee)} total
          <ChevronRight className="w-5 h-5" />
        </button>
        <p className="text-center text-xs text-gray-400 mt-1.5">
          Incl. {formatGBP(3.99)} delivery · No commitment until payment
        </p>
      </div>
    </div>
  )
}
