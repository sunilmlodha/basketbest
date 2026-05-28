/**
 * Apify adapter for UK supermarket price scraping
 *
 * Tesco:        jupri/tesco-grocery  (live, 20k+ runs)
 * Other stores: Apify generic web scraper configured per store
 *               OR manual CSV fallback until actors are available
 */

const APIFY_BASE = 'https://api.apify.com/v2'

export type StoreId = 'tesco' | 'asda' | 'sainsburys' | 'morrisons' | 'ocado' | 'waitrose'

export interface ScrapedPrice {
  store: StoreId
  productName: string
  price: number
  unitPrice?: string
  available: boolean
  url?: string
  imageUrl?: string
  matchScore?: number   // 0-1 how well it matched the search query
}

// ─── Tesco via jupri/tesco-grocery ───────────────────────────────────────────

interface TescoActorItem {
  name?: string
  title?: string
  price?: number | string
  pricePerUnit?: string
  unitPrice?: string
  available?: boolean
  inStock?: boolean
  url?: string
  image?: string
  imageUrl?: string
}

export async function searchTesco(
  query: string,
  apifyToken: string,
  maxItems = 3
): Promise<ScrapedPrice[]> {
  // Run the actor synchronously and get results back immediately
  const url = `${APIFY_BASE}/acts/jupri~tesco-grocery/run-sync-get-dataset-items?token=${apifyToken}&timeout=90&memory=256`

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchQuery: query,
      maxItems,
      // Don't scrape categories — just search results
      startUrls: [],
    }),
  })

  if (!resp.ok) {
    throw new Error(`Tesco Apify actor failed: ${resp.status} ${await resp.text()}`)
  }

  const items: TescoActorItem[] = await resp.json()

  return items
    .filter((item) => item.price !== undefined && item.price !== null)
    .map((item) => {
      const rawPrice = typeof item.price === 'string'
        ? parseFloat(item.price.replace(/[^0-9.]/g, ''))
        : item.price as number

      const name = item.name || item.title || query

      return {
        store: 'tesco' as StoreId,
        productName: name,
        price: rawPrice,
        unitPrice: item.pricePerUnit || item.unitPrice,
        available: item.available ?? item.inStock ?? true,
        url: item.url,
        imageUrl: item.image || item.imageUrl,
        matchScore: calculateMatchScore(query, name),
      }
    })
    .filter((item) => !isNaN(item.price) && item.price > 0)
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, maxItems)
}

// ─── Generic Apify Web Scraper for other stores ───────────────────────────────
// Uses Apify's built-in web-scraper actor configured with store-specific selectors

interface StoreScraperConfig {
  actorId: string
  searchUrlTemplate: string   // {query} is replaced with encoded search term
  selectors: {
    items: string
    name: string
    price: string
    available?: string
    image?: string
  }
}

const STORE_CONFIGS: Partial<Record<StoreId, StoreScraperConfig>> = {
  asda: {
    actorId: 'apify/web-scraper',
    searchUrlTemplate: 'https://groceries.asda.com/search/{query}',
    selectors: {
      items: '[data-auto-id="productCard"]',
      name: '[class*="product-title"]',
      price: '[class*="price-current"]',
      available: '[class*="add-to-trolley-button"]',
      image: 'img[class*="product-image"]',
    },
  },
  sainsburys: {
    actorId: 'apify/web-scraper',
    searchUrlTemplate: 'https://www.sainsburys.co.uk/gol-ui/SearchDisplayView?filters[query]={query}',
    selectors: {
      items: '[class*="product-card"]',
      name: '[class*="product-name"]',
      price: '[class*="price-per-unit"]',
      image: 'img[class*="product-image"]',
    },
  },
  morrisons: {
    actorId: 'apify/web-scraper',
    searchUrlTemplate: 'https://groceries.morrisons.com/search?entry={query}',
    selectors: {
      items: '[class*="product-pod"]',
      name: '[class*="product-title"]',
      price: '[class*="product-price"]',
      image: 'img[class*="product-image"]',
    },
  },
  ocado: {
    actorId: 'apify/web-scraper',
    searchUrlTemplate: 'https://www.ocado.com/search?entry={query}',
    selectors: {
      items: '[class*="product-card"]',
      name: '[class*="product-title"]',
      price: '[class*="product-price"]',
      image: 'img[class*="product-image"]',
    },
  },
}

export async function searchStore(
  store: StoreId,
  query: string,
  apifyToken: string,
  maxItems = 3
): Promise<ScrapedPrice[]> {
  if (store === 'tesco') {
    return searchTesco(query, apifyToken, maxItems)
  }

  const config = STORE_CONFIGS[store]
  if (!config) {
    // Waitrose and unconfigured stores — return empty (will use cache/demo fallback)
    return []
  }

  const searchUrl = config.searchUrlTemplate.replace('{query}', encodeURIComponent(query))

  const url = `${APIFY_BASE}/acts/${config.actorId.replace('/', '~')}/run-sync-get-dataset-items?token=${apifyToken}&timeout=45&memory=512`

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
        pageFunction: buildPageFunction(config.selectors, maxItems),
        maxCrawlingDepth: 0,
        maxPagesPerCrawl: 1,
      }),
    })

    if (!resp.ok) return []

    const items = await resp.json()

    return (items as Array<{ name: string; price: string; available?: boolean; image?: string }>)
      .map((item) => ({
        store,
        productName: item.name,
        price: parseFloat(String(item.price).replace(/[^0-9.]/g, '')),
        available: item.available !== false,
        imageUrl: item.image,
        matchScore: calculateMatchScore(query, item.name),
      }))
      .filter((item) => !isNaN(item.price) && item.price > 0)
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, maxItems)
  } catch {
    return []
  }
}

// ─── Fetch prices for a whole basket across all stores ────────────────────────

export async function fetchBasketPricesApify(
  products: Array<{ id: string; name: string }>,
  apifyToken: string
): Promise<Map<string, Partial<Record<StoreId, number>>>> {
  const STORES: StoreId[] = ['tesco', 'asda', 'sainsburys', 'morrisons', 'ocado', 'waitrose']
  const results = new Map<string, Partial<Record<StoreId, number>>>()

  // Initialise all products
  for (const p of products) {
    results.set(p.id, {})
  }

  // Run Tesco searches in parallel (most reliable) — 6 at a time max
  const CHUNK = 6
  for (let i = 0; i < products.length; i += CHUNK) {
    const chunk = products.slice(i, i + CHUNK)
    await Promise.allSettled(
      chunk.map(async (product) => {
        try {
          const prices = await searchTesco(product.name, apifyToken, 1)
          if (prices.length > 0) {
            const current = results.get(product.id) ?? {}
            current.tesco = prices[0].price
            results.set(product.id, current)
          }
        } catch {
          // silent — will fall back to cache
        }
      })
    )
  }

  // For other stores — attempt generic scrapers but accept failures gracefully
  // In practice, you'll want to add more dedicated Apify actors as they become available
  for (const store of STORES.filter((s) => s !== 'tesco')) {
    for (let i = 0; i < products.length; i += CHUNK) {
      const chunk = products.slice(i, i + CHUNK)
      await Promise.allSettled(
        chunk.map(async (product) => {
          try {
            const prices = await searchStore(store, product.name, apifyToken, 1)
            if (prices.length > 0) {
              const current = results.get(product.id) ?? {}
              current[store] = prices[0].price
              results.set(product.id, current)
            }
          } catch {
            // silent
          }
        })
      )
      // Small delay between store requests to avoid rate limits
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return results
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateMatchScore(query: string, productName: string): number {
  const q = query.toLowerCase()
  const name = productName.toLowerCase()
  if (name === q) return 1
  if (name.startsWith(q)) return 0.9
  if (name.includes(q)) return 0.7
  const words = q.split(/\s+/)
  const matchedWords = words.filter((w) => name.includes(w))
  return matchedWords.length / words.length * 0.6
}

function buildPageFunction(
  selectors: StoreScraperConfig['selectors'],
  maxItems: number
): string {
  return `
    async function pageFunction(context) {
      const { $ } = context;
      const items = [];
      $('${selectors.items}').slice(0, ${maxItems}).each((_, el) => {
        const name = $('${selectors.name}', el).first().text().trim();
        const priceText = $('${selectors.price}', el).first().text().trim();
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        const available = ${selectors.available
          ? `$('${selectors.available}', el).length > 0`
          : 'true'};
        const image = $('${selectors.image ?? 'img'}', el).first().attr('src') || '';
        if (name && !isNaN(price)) {
          items.push({ name, price: priceText, available, image });
        }
      });
      return items;
    }
  `
}
