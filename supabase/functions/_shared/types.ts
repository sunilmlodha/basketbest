export type StoreId = 'tesco' | 'asda' | 'sainsburys' | 'morrisons' | 'ocado' | 'waitrose'

export type StoreFetchStatus = 'queued' | 'fetching' | 'done' | 'failed' | 'stale'

export interface ApiError {
  code: string
  message: string
  hint?: string
}

export interface PriceResult {
  productId: string
  storeProductId?: string
  price: number
  unitPrice?: number
  available: boolean
  isSubstitute: boolean
  substituteName?: string
  substituteId?: string
  fetchedAt: string
}

/**
 * StoreAdapter interface — implement this to add a new store.
 *
 * How to add a new store:
 * 1. Create a new adapter in workers/adapters/<store-name>.ts implementing this interface
 * 2. Register it in workers/registry.ts
 * 3. Add the store to the store_id enum in the DB migration
 * 4. Add UI label mapping in src/types/index.ts STORES constant
 * 5. Add a mock fixture in workers/fixtures/<store-name>.json for local dev
 */
export interface StoreAdapter {
  storeId: StoreId
  name: string

  /**
   * Fetch prices for a list of products.
   * @param productIds  UUID list from products table
   * @param postcode    UK postcode for store availability check
   * @returns           One PriceResult per product (substitute if not found)
   */
  fetch(productIds: string[], postcode: string): Promise<PriceResult[]>
}

export interface RealtimeProgressEvent {
  store: StoreId
  status: StoreFetchStatus
  percent: number
  itemsMatched: number
}
