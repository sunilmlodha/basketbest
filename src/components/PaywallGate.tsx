import { useNavigate } from 'react-router-dom'
import { Lock, Sparkles, UtensilsCrossed, Bell, Camera, Users, ShoppingBasket } from 'lucide-react'
import { useAppStore } from '../store'
import type { SubscriptionTier } from '../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PaywallFeature =
  | 'comparisons'
  | 'baskets'
  | 'ai_meal'
  | 'price_alerts'
  | 'receipts'
  | 'household'

export interface PaywallGateProps {
  feature: PaywallFeature
  children: React.ReactNode
  /** If true, renders children blurred with an overlay instead of replacing content */
  blur?: boolean
}

// ---------------------------------------------------------------------------
// Feature metadata
// ---------------------------------------------------------------------------

interface FeatureMeta {
  label: string
  description: string
  icon: React.ReactNode
}

const FEATURE_META: Record<PaywallFeature, FeatureMeta> = {
  comparisons: {
    label: 'Unlimited price comparisons',
    description: 'Compare across all UK supermarkets as many times as you like, every week.',
    icon: <ShoppingBasket className="w-6 h-6" />,
  },
  baskets: {
    label: 'Multiple baskets',
    description: 'Organise your shopping into up to 5 separate baskets — weekly shop, party supplies, and more.',
    icon: <ShoppingBasket className="w-6 h-6" />,
  },
  ai_meal: {
    label: 'AI meal planning',
    description: 'Let our AI plan your weekly meals and automatically build a price-optimised basket.',
    icon: <UtensilsCrossed className="w-6 h-6" />,
  },
  price_alerts: {
    label: 'Price alerts',
    description: 'Get notified the moment a product you love drops in price at any supermarket.',
    icon: <Bell className="w-6 h-6" />,
  },
  receipts: {
    label: 'Receipt scanning',
    description: 'Scan any supermarket receipt to track spending and find where you overpaid.',
    icon: <Camera className="w-6 h-6" />,
  },
  household: {
    label: 'Household members',
    description: 'Invite up to 3 family members to share baskets and collaborate on your weekly shop.',
    icon: <Users className="w-6 h-6" />,
  },
}

// ---------------------------------------------------------------------------
// Upgrade prompt card
// ---------------------------------------------------------------------------

function UpgradePrompt({
  feature,
  isDemoMode,
}: {
  feature: PaywallFeature
  isDemoMode: boolean
}) {
  const navigate = useNavigate()
  const meta = FEATURE_META[feature]

  return (
    <div className="card p-5 flex flex-col items-center text-center gap-4">
      {/* Icon */}
      <span className="p-3 rounded-2xl bg-brand-50 text-brand-600">
        {meta.icon}
      </span>

      {/* Copy */}
      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-gray-900">{meta.label}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{meta.description}</p>
      </div>

      {/* CTA */}
      {isDemoMode ? (
        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Sign up free to unlock this
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth/signup')}
            className="btn-primary-lg w-full"
          >
            <Sparkles className="w-4 h-4" />
            Create free account
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="btn-primary-lg w-full"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Plus — £2.99/mo
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Blur overlay
// ---------------------------------------------------------------------------

function BlurOverlay({
  feature,
  isDemoMode,
  children,
}: {
  feature: PaywallFeature
  isDemoMode: boolean
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const meta = FEATURE_META[feature]

  return (
    <div className="relative">
      {/* Blurred children */}
      <div className="select-none pointer-events-none" aria-hidden="true">
        <div className="blur-sm opacity-50">{children}</div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-5 flex flex-col items-center text-center gap-3 w-full max-w-xs">
          <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
            <Lock className="w-5 h-5" />
          </span>

          <div className="space-y-1">
            <p className="text-sm font-bold text-gray-900">{meta.label}</p>
            <p className="text-xs text-gray-500">is a Plus feature</p>
          </div>

          {isDemoMode ? (
            <button
              type="button"
              onClick={() => navigate('/auth/signup')}
              className="btn-primary w-full text-xs"
            >
              Sign up free to unlock
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="btn-primary w-full text-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Upgrade to Plus — £2.99/mo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function PaywallGate({ feature, children, blur = false }: PaywallGateProps) {
  const { user, isDemoMode, subscriptionTier } = useAppStore()

  // Free tier: no user, demo mode, or explicitly on free plan
  const isFreeTier: boolean =
    isDemoMode ||
    !user ||
    (subscriptionTier as SubscriptionTier) === 'free'

  if (!isFreeTier) {
    // Paid subscriber — render children without restriction
    return <>{children}</>
  }

  if (blur) {
    return (
      <BlurOverlay feature={feature} isDemoMode={isDemoMode}>
        {children}
      </BlurOverlay>
    )
  }

  return <UpgradePrompt feature={feature} isDemoMode={isDemoMode} />
}
