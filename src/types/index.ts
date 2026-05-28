export type StoreId = 'tesco' | 'asda' | 'sainsburys' | 'morrisons' | 'ocado' | 'waitrose'

export interface StoreInfo {
  id: StoreId
  name: string
  color: string
  bgColor: string
  borderColor: string
  logoText: string
  hasDelivery: boolean
}

export const STORES: Record<StoreId, StoreInfo> = {
  tesco:       { id: 'tesco',       name: 'Tesco',        color: 'text-blue-700',   bgColor: 'bg-blue-50',   borderColor: 'border-blue-200',  logoText: 'T',  hasDelivery: true },
  asda:        { id: 'asda',        name: 'Asda',         color: 'text-green-700',  bgColor: 'bg-green-50',  borderColor: 'border-green-200', logoText: 'A',  hasDelivery: true },
  sainsburys:  { id: 'sainsburys',  name: "Sainsbury's",  color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200',logoText: 'S',  hasDelivery: true },
  morrisons:   { id: 'morrisons',   name: 'Morrisons',    color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200',logoText: 'M',  hasDelivery: true },
  ocado:       { id: 'ocado',       name: 'Ocado',        color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200',logoText: 'O',  hasDelivery: true },
  waitrose:    { id: 'waitrose',    name: 'Waitrose',     color: 'text-gray-700',   bgColor: 'bg-gray-50',   borderColor: 'border-gray-200',  logoText: 'W',  hasDelivery: true },
}

export const STORE_LIST = Object.values(STORES)

export interface LoyaltyScheme {
  storeId: StoreId
  cardName: string        // "Clubcard", "Nectar", "MyMorrisons"
  earnRate: number        // points per £1 spent, e.g. 1 = 1p per £1
  earnUnit: 'pence'       // currently only pence
  isActive: boolean
}

export const LOYALTY_SCHEMES: Partial<Record<StoreId, LoyaltyScheme>> = {
  tesco:      { storeId: 'tesco',     cardName: 'Clubcard',    earnRate: 1,   earnUnit: 'pence', isActive: false },
  asda:       { storeId: 'asda',      cardName: 'Asda Rewards',earnRate: 1,   earnUnit: 'pence', isActive: false },
  sainsburys: { storeId: 'sainsburys',cardName: 'Nectar',      earnRate: 0.5, earnUnit: 'pence', isActive: false },
  morrisons:  { storeId: 'morrisons', cardName: 'More Card',   earnRate: 1,   earnUnit: 'pence', isActive: false },
  waitrose:   { storeId: 'waitrose',  cardName: 'myWaitrose',  earnRate: 0,   earnUnit: 'pence', isActive: false },
}

export interface UserProfile {
  id: string
  fullName: string
  email: string
  phone?: string
  postcode?: string
  loyaltyCards: Partial<Record<StoreId, boolean>>
  createdAt: string
}

export interface Address {
  id: string
  userId: string
  label: string
  line1: string
  line2?: string
  city: string
  postcode: string
  isDefault: boolean
}

export type ProductCategory =
  | 'fresh'
  | 'frozen'
  | 'pantry'
  | 'drinks'
  | 'household'
  | 'personal-care'
  | 'snacks'
  | 'bakery'
  | 'dairy'
  | 'meat-fish'
  | 'breakfast'

export interface Product {
  id: string
  name: string
  brand?: string
  category: ProductCategory
  subcategory?: string
  unitType: 'each' | 'kg' | 'L' | 'pack' | 'g' | 'ml'
  imageUrl?: string
  barcode?: string
}

export interface BasketItem {
  id: string
  basketId: string
  product: Product
  quantity: number
  unit: string
  notes?: string
}

export type BasketStatus = 'draft' | 'scheduled' | 'comparing' | 'pending_approval' | 'approved' | 'completed' | 'cancelled'

export interface Basket {
  id: string
  userId: string
  name: string
  status: BasketStatus
  items: BasketItem[]
  createdAt: string
  updatedAt: string
  isRecurring?: boolean
  recurringDayOfWeek?: number // 0=Sun … 6=Sat
}

export type DeliverySlot = 'AM' | 'PM' | 'EVENING'

export interface Delivery {
  id: string
  basketId: string
  userId: string
  addressId: string
  address?: Address
  scheduledDate: string // ISO date YYYY-MM-DD
  scheduledSlot: DeliverySlot
  status: 'pending' | 'comparing' | 'awaiting_approval' | 'approved' | 'placed' | 'delivered' | 'cancelled'
  chosenStore?: StoreId
  totalPrice?: number
  deliveryFee: number
  stripeSession?: string
  createdAt: string
}

export type StoreFetchStatus = 'idle' | 'fetching' | 'done' | 'failed' | 'stale'

export interface StoreFetchResult {
  store: StoreId
  status: StoreFetchStatus
  percent: number
  itemsMatched: number
  totalItems: number
  totalPrice?: number
  totalAfterLoyalty?: number
  loyaltySaving?: number
  reason?: string        // human-readable error or stale notice
  fetchedAt?: string
}

export interface ComparisonLineItem {
  productId: string
  productName: string
  quantity: number
  unit: string
  results: Partial<Record<StoreId, {
    price: number
    unitPrice?: number
    available: boolean
    isSubstitute: boolean
    substituteName?: string
  }>>
  cheapestStore?: StoreId
}

export interface StoreRecommendation {
  rank: 1 | 2 | 3
  store: StoreId
  totalPrice: number
  totalAfterLoyalty: number
  loyaltySaving: number
  savingsVsMax: number
  itemsCovered: number
  totalItems: number
  unavailableItems: string[]
  substitutions: number
  deliveryFee: number
  deliveryEta: string
}

export interface ComparisonResult {
  id: string
  deliveryId: string
  storeResults: StoreFetchResult[]
  lineItems: ComparisonLineItem[]
  recommendations: StoreRecommendation[]
  savingsVsMax: number
  createdAt: string
}

export interface Order {
  id: string
  deliveryId: string
  userId: string
  store: StoreId
  storeOrderId?: string
  status: 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled'
  totalPaid: number
  confirmedAt?: string
  createdAt: string
}

export interface RealtimeProgressEvent {
  store: StoreId
  status: StoreFetchStatus
  percent: number
  itemsMatched: number
}

export interface ApiError {
  code: string
  message: string
  hint?: string
}
