/**
 * trolley-adapter.ts
 *
 * Adapter for the Trolley.co.uk real-time UK grocery price API.
 * Docs: https://dev.trolley.co.uk
 *
 * Exported API:
 *   searchTrolley(query, apiKey)         → TrolleyProduct[]
 *   fetchBasketPrices(names, apiKey)     → Map<productName, storePrice record>
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrolleyProduct {
  id: string
  full_name: string
  brand: string | null
  supermarket_prices: Partial<Record<string, number>>
}

/** Shape returned directly by the Trolley /products/search endpoint. */
interface TrolleyApiProduct {
  id: string
  full_name: string
  brand?: string | null
  image?: string | null
  supermarket_prices?: Partial<Record<string, number>>
}

interface TrolleySearchResponse {
  products: TrolleyApiProduct[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TROLLEY_BASE_URL = 'https://dev.trolley.co.uk'
const SEARCH_LIMIT = 10

// Stores the app cares about — used to narrow the prices map
const SUPPORTED_STORES = ['tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose'] as const

// ─── Core fetch helper ──────────────────────────────────────────────────────

/**
 * Makes a single GET request to the Trolley search endpoint.
 * Throws on non-2xx responses so callers can decide how to handle failures.
 */
async function trolleyGet<T>(path: string, apiKey: string): Promise<T> {
  const url = `${TROLLEY_BASE_URL}${path}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `Trolley API error ${response.status} ${response.statusText} — ${body.slice(0, 200)}`
    )
  }

  return response.json() as Promise<T>
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Search for a single product by name.
 * Returns up to `SEARCH_LIMIT` matches with prices across all supported stores.
 *
 * @param query   Free-text product name (e.g. "Warburtons Toastie White Bread 800g")
 * @param apiKey  Trolley API key from Deno.env.get('TROLLEY_API_KEY')
 */
export async function searchTrolley(query: string, apiKey: string): Promise<TrolleyProduct[]> {
  if (!query.trim()) return []

  const encodedQuery = encodeURIComponent(query.trim())
  const path = `/api/v2/products/search?query=${encodedQuery}&limit=${SEARCH_LIMIT}`

  const data = await trolleyGet<TrolleySearchResponse>(path, apiKey)

  if (!Array.isArray(data?.products)) {
    console.warn(`[trolley-adapter] Unexpected response shape for query "${query}":`, data)
    return []
  }

  return data.products.map((p): TrolleyProduct => {
    // Narrow to only the stores we support and coerce falsy values to undefined
    const prices: Partial<Record<string, number>> = {}
    for (const store of SUPPORTED_STORES) {
      const raw = p.supermarket_prices?.[store]
      if (typeof raw === 'number' && raw > 0) {
        prices[store] = raw
      }
    }

    return {
      id: p.id,
      full_name: p.full_name,
      brand: p.brand ?? null,
      supermarket_prices: prices,
    }
  })
}

/**
 * Fetch prices for an entire basket of products, issuing parallel requests
 * up to MAX_CONCURRENCY at a time.
 *
 * @param productNames  Array of human-readable product names to search
 * @param apiKey        Trolley API key
 * @returns             Map keyed by the original product name (as provided).
 *                      Value is a merged price record from the top search hit.
 *                      If a search fails or returns no results the name is
 *                      absent from the map (caller should fall back to cache).
 */
export async function fetchBasketPrices(
  productNames: string[],
  apiKey: string
): Promise<Map<string, Partial<Record<string, number>>>> {
  const MAX_CONCURRENCY = 6
  const result = new Map<string, Partial<Record<string, number>>>()

  if (!productNames.length) return result

  // Process in batches to respect the concurrency cap
  for (let i = 0; i < productNames.length; i += MAX_CONCURRENCY) {
    const batch = productNames.slice(i, i + MAX_CONCURRENCY)

    const settled = await Promise.allSettled(
      batch.map(async (name) => {
        const products = await searchTrolley(name, apiKey)
        // Take the first (best-match) result
        const top = products[0]
        return { name, prices: top?.supermarket_prices ?? null }
      })
    )

    for (const outcome of settled) {
      if (outcome.status === 'fulfilled' && outcome.value.prices !== null) {
        result.set(outcome.value.name, outcome.value.prices)
      } else if (outcome.status === 'rejected') {
        // Log but continue — callers handle missing entries as cache misses
        console.warn('[trolley-adapter] Search failed:', outcome.reason?.message ?? outcome.reason)
      }
    }
  }

  return result
}
