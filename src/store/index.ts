import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  UserProfile, Basket, BasketItem, Product, Delivery,
  ComparisonResult,
} from '../types'
import { DEMO_BASKET, DEMO_PRODUCTS } from '../lib/demo-data'

export type SubscriptionTier = 'free' | 'plus' | 'family'

export const TIER_LIMITS: Record<SubscriptionTier, { comparisons: number; baskets: number; members: number }> = {
  free:   { comparisons: 2,         baskets: 1, members: 1 },
  plus:   { comparisons: Infinity,  baskets: 5, members: 1 },
  family: { comparisons: Infinity,  baskets: 10, members: 3 },
}

interface AuthState {
  user: UserProfile | null
  isLoading: boolean
  isDemoMode: boolean
  subscriptionTier: SubscriptionTier
  comparisonsUsedThisMonth: number
}

interface BasketState {
  baskets: Basket[]
  activeBasketId: string | null
}

interface ComparisonState {
  currentComparison: ComparisonResult | null
  isComparing: boolean
  compareProgress: Record<string, number>
}

interface DeliveryState {
  pendingDelivery: Partial<Delivery> | null
  deliveries: Delivery[]
}

interface AppState extends AuthState, BasketState, ComparisonState, DeliveryState {
  // Auth actions
  setUser: (user: UserProfile | null) => void
  setLoading: (v: boolean) => void
  setDemoMode: (v: boolean) => void
  enterDemoMode: () => void
  setSubscriptionTier: (tier: SubscriptionTier) => void
  incrementComparisons: () => void
  canRunComparison: () => boolean

  // Basket actions
  addBasket: (name: string) => Basket
  setActiveBasket: (id: string) => void
  addItemToBasket: (basketId: string, product: Product, quantity?: number) => void
  removeItemFromBasket: (basketId: string, itemId: string) => void
  updateItemQuantity: (basketId: string, itemId: string, quantity: number) => void
  renameBasket: (basketId: string, name: string) => void
  deleteBasket: (basketId: string) => void
  getActiveBasket: () => Basket | null

  clearBasket: (basketId: string) => void

  // Comparison actions
  setComparison: (result: ComparisonResult | null) => void
  setComparing: (v: boolean) => void
  updateProgress: (store: string, percent: number) => void

  // Delivery actions
  setPendingDelivery: (d: Partial<Delivery>) => void
  clearPendingDelivery: () => void
  addDelivery: (d: Delivery) => void
}

let basketCounter = 2

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      isLoading: true,
      isDemoMode: false,
      subscriptionTier: 'free' as SubscriptionTier,
      comparisonsUsedThisMonth: 0,

      // Basket state
      baskets: [DEMO_BASKET],
      activeBasketId: DEMO_BASKET.id,

      // Comparison state
      currentComparison: null,
      isComparing: false,
      compareProgress: {},

      // Delivery state
      pendingDelivery: null,
      deliveries: [],

      // Auth actions
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setDemoMode: (isDemoMode) => set({ isDemoMode }),
      setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),
      incrementComparisons: () => set((s) => ({ comparisonsUsedThisMonth: s.comparisonsUsedThisMonth + 1 })),
      canRunComparison: () => {
        const { subscriptionTier, comparisonsUsedThisMonth, isDemoMode } = get()
        if (isDemoMode) return true
        const limit = TIER_LIMITS[subscriptionTier].comparisons
        return comparisonsUsedThisMonth < limit
      },
      enterDemoMode: () => {
        const demoUser: UserProfile = {
          id: 'demo-user',
          fullName: 'Demo User',
          email: 'demo@basketbest.co.uk',
          postcode: 'SW1A 1AA',
          loyaltyCards: { tesco: true, asda: false },
          createdAt: new Date().toISOString(),
        }
        set({ user: demoUser, isDemoMode: true, isLoading: false, baskets: [DEMO_BASKET], activeBasketId: DEMO_BASKET.id })
      },

      // Basket actions
      addBasket: (name) => {
        const basket: Basket = {
          id: `basket-${++basketCounter}`,
          userId: get().user?.id || 'demo-user',
          name,
          status: 'draft',
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({ baskets: [...s.baskets, basket], activeBasketId: basket.id }))
        return basket
      },

      setActiveBasket: (id) => set({ activeBasketId: id }),

      addItemToBasket: (basketId, product, quantity = 1) => {
        set((s) => ({
          baskets: s.baskets.map((b) => {
            if (b.id !== basketId) return b
            const exists = b.items.find((i) => i.product.id === product.id)
            if (exists) {
              return {
                ...b,
                items: b.items.map((i) =>
                  i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
                ),
                updatedAt: new Date().toISOString(),
              }
            }
            const newItem: BasketItem = {
              id: `item-${Date.now()}`,
              basketId,
              product,
              quantity,
              unit: product.unitType,
            }
            return { ...b, items: [...b.items, newItem], updatedAt: new Date().toISOString() }
          }),
        }))
      },

      removeItemFromBasket: (basketId, itemId) => {
        set((s) => ({
          baskets: s.baskets.map((b) =>
            b.id !== basketId ? b : {
              ...b,
              items: b.items.filter((i) => i.id !== itemId),
              updatedAt: new Date().toISOString(),
            }
          ),
        }))
      },

      updateItemQuantity: (basketId, itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItemFromBasket(basketId, itemId)
          return
        }
        set((s) => ({
          baskets: s.baskets.map((b) =>
            b.id !== basketId ? b : {
              ...b,
              items: b.items.map((i) => i.id === itemId ? { ...i, quantity } : i),
              updatedAt: new Date().toISOString(),
            }
          ),
        }))
      },

      renameBasket: (basketId, name) => {
        set((s) => ({
          baskets: s.baskets.map((b) =>
            b.id !== basketId ? b : { ...b, name, updatedAt: new Date().toISOString() }
          ),
        }))
      },

      clearBasket: (basketId) => {
        set((s) => ({
          baskets: s.baskets.map((b) =>
            b.id !== basketId ? b : { ...b, items: [], updatedAt: new Date().toISOString() }
          ),
        }))
      },

      deleteBasket: (basketId) => {
        set((s) => {
          const remaining = s.baskets.filter((b) => b.id !== basketId)
          return {
            baskets: remaining,
            activeBasketId: s.activeBasketId === basketId
              ? (remaining[0]?.id ?? null)
              : s.activeBasketId,
          }
        })
      },

      getActiveBasket: () => {
        const { baskets, activeBasketId } = get()
        return baskets.find((b) => b.id === activeBasketId) ?? null
      },

      // Comparison actions
      setComparison: (currentComparison) => set({ currentComparison }),
      setComparing: (isComparing) => set({ isComparing }),
      updateProgress: (store, percent) =>
        set((s) => ({ compareProgress: { ...s.compareProgress, [store]: percent } })),

      // Delivery actions
      setPendingDelivery: (pendingDelivery) => set({ pendingDelivery }),
      clearPendingDelivery: () => set({ pendingDelivery: null }),
      addDelivery: (d) => set((s) => ({ deliveries: [d, ...s.deliveries] })),
    }),
    {
      name: 'basketbest-store',
      partialize: (s) => ({
        baskets: s.baskets,
        activeBasketId: s.activeBasketId,
        user: s.user,
        isDemoMode: s.isDemoMode,
        deliveries: s.deliveries,
        subscriptionTier: s.subscriptionTier,
        comparisonsUsedThisMonth: s.comparisonsUsedThisMonth,
      }),
    }
  )
)

// Product search (client-side over demo catalogue)
export function searchProducts(query: string): Product[] {
  if (!query.trim()) return DEMO_PRODUCTS
  const q = query.toLowerCase()
  return DEMO_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category.includes(q)
  )
}
