import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  ShoppingBasket,
  TrendingDown,
} from 'lucide-react'
import { useAppStore } from '../../store'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Feature {
  label: string
  included: boolean
}

interface Tier {
  id: 'free' | 'plus' | 'family'
  name: string
  icon: React.ReactNode
  monthlyPrice: number
  annualMonthlyPrice: number
  tagline: string
  features: Feature[]
  ctaLabel: string
  highlighted: boolean
  badge?: string
}

interface FaqItem {
  question: string
  answer: string
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    icon: <ShoppingBasket className="w-5 h-5" />,
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    tagline: 'Get started with smart grocery savings',
    features: [
      { label: '2 price comparisons per month', included: true },
      { label: '1 basket', included: true },
      { label: 'Basic AI chat', included: true },
      { label: 'Unlimited comparisons', included: false },
      { label: 'AI meal planning', included: false },
      { label: 'Price alerts', included: false },
      { label: 'Receipt scanning', included: false },
      { label: 'Up to 5 baskets', included: false },
      { label: 'Household members', included: false },
      { label: 'Family budget dashboard', included: false },
    ],
    ctaLabel: 'Start free',
    highlighted: false,
  },
  {
    id: 'plus',
    name: 'Plus',
    icon: <Star className="w-5 h-5 fill-current" />,
    monthlyPrice: 2.99,
    annualMonthlyPrice: 2.39,
    tagline: 'Everything you need to save more every week',
    badge: 'Most popular',
    features: [
      { label: 'Unlimited price comparisons', included: true },
      { label: 'Up to 5 baskets', included: true },
      { label: 'Full AI chat', included: true },
      { label: 'AI meal planning', included: true },
      { label: 'Price alerts', included: true },
      { label: 'Receipt scanning', included: true },
      { label: 'Household members', included: false },
      { label: 'Shared baskets', included: false },
      { label: 'Family budget dashboard', included: false },
    ],
    ctaLabel: 'Get Plus',
    highlighted: true,
  },
  {
    id: 'family',
    name: 'Family',
    icon: <TrendingDown className="w-5 h-5" />,
    monthlyPrice: 5.99,
    annualMonthlyPrice: 4.79,
    tagline: 'Save together with the whole household',
    features: [
      { label: 'Everything in Plus', included: true },
      { label: 'Up to 3 household members', included: true },
      { label: 'Shared baskets', included: true },
      { label: 'Family budget dashboard', included: true },
      { label: 'Unlimited price comparisons', included: true },
      { label: 'AI meal planning', included: true },
      { label: 'Price alerts', included: true },
      { label: 'Receipt scanning', included: true },
    ],
    ctaLabel: 'Get Family',
    highlighted: false,
  },
]

const FAQS: FaqItem[] = [
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes, absolutely. You can cancel your subscription at any time from your account settings. You will retain access to your paid features until the end of your current billing period, and you will never be charged again after cancelling.',
  },
  {
    question: 'Which stores are included?',
    answer:
      'BasketBest compares prices across Tesco, Asda, Sainsbury\'s, Morrisons, Ocado, and Waitrose. We are continuously adding more stores. All comparisons include available loyalty card discounts such as Clubcard and Nectar prices.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Your data is encrypted in transit and at rest. We never sell your personal information to third parties. Payment processing is handled securely by Stripe and we never store your card details. You can request deletion of your account and all associated data at any time.',
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AnnualToggle({
  annual,
  onChange,
}: {
  annual: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`text-sm font-medium transition-colors ${
          !annual ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={annual}
        onClick={() => onChange(!annual)}
        className={`relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          annual ? 'bg-brand-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            annual ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className={`text-sm font-medium transition-colors ${annual ? 'text-gray-900' : 'text-gray-400'}`}>
        Annual
        {annual && (
          <span className="ml-1.5 badge-green text-xs">Save 20%</span>
        )}
      </span>
    </div>
  )
}

function FeatureRow({ feature }: { feature: Feature }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      {feature.included ? (
        <Check className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
      ) : (
        <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
      )}
      <span
        className={`text-sm leading-snug ${
          feature.included ? 'text-gray-700' : 'text-gray-400'
        }`}
      >
        {feature.label}
      </span>
    </li>
  )
}

function TierCard({
  tier,
  annual,
  isDemoMode,
  onSelect,
}: {
  tier: Tier
  annual: boolean
  isDemoMode: boolean
  onSelect: (tierId: Tier['id']) => void
}) {
  const price = annual ? tier.annualMonthlyPrice : tier.monthlyPrice
  const isFree = tier.id === 'free'

  return (
    <div
      className={`card relative flex flex-col gap-5 p-5 transition-shadow ${
        tier.highlighted
          ? 'border-2 border-brand-500 shadow-md'
          : 'border border-gray-100'
      }`}
    >
      {tier.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-green px-3 py-1 text-xs font-semibold shadow-sm">
          {tier.badge}
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span
          className={`p-2 rounded-xl ${
            tier.highlighted
              ? 'bg-brand-50 text-brand-600'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {tier.icon}
        </span>
        <div>
          <h3 className="text-base font-bold text-gray-900">{tier.name}</h3>
          <p className="text-xs text-gray-500">{tier.tagline}</p>
        </div>
      </div>

      {/* Price */}
      <div className="flex items-end gap-1">
        {isFree ? (
          <span className="text-3xl font-extrabold text-gray-900">Free</span>
        ) : (
          <>
            <span className="text-3xl font-extrabold text-gray-900">
              £{price.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 mb-1">/month</span>
          </>
        )}
      </div>
      {annual && !isFree && (
        <p className="text-xs text-gray-400 -mt-4">
          Billed annually (£{(price * 12).toFixed(2)}/yr)
        </p>
      )}

      {/* CTA */}
      <button
        type="button"
        disabled={isDemoMode && !isFree}
        onClick={() => onSelect(tier.id)}
        className={`w-full ${
          tier.highlighted ? 'btn-primary-lg' : 'btn-secondary'
        } ${isDemoMode && !isFree ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDemoMode && !isFree ? 'Upgrade — coming soon' : tier.ctaLabel}
      </button>

      {/* Feature list */}
      <ul className="space-y-0.5 border-t border-gray-50 pt-4">
        {tier.features.map((f) => (
          <FeatureRow key={f.label} feature={f} />
        ))}
      </ul>
    </div>
  )
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div key={item.question} className="card overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-gray-900">
                {item.question}
              </span>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
              )}
            </button>
            {isOpen && (
              <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                {item.answer}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PricingPage() {
  const navigate = useNavigate()
  const { isDemoMode } = useAppStore()
  const [annual, setAnnual] = useState(false)

  function handleTierSelect(tierId: Tier['id']) {
    if (isDemoMode) return
    if (tierId === 'free') {
      navigate('/')
      return
    }
    // In a real integration this would redirect to Stripe Checkout
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      console.warn('VITE_STRIPE_PUBLISHABLE_KEY not set')
    }
    // Navigate to signup / checkout for paid tiers
    navigate(`/checkout?plan=${tierId}&billing=${annual ? 'annual' : 'monthly'}`)
  }

  return (
    <div className="page-container space-y-8">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="btn-ghost -ml-1"
        aria-label="Go back"
      >
        <ChevronLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      {/* Hero */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">
          Simple, transparent pricing
        </h1>
        <p className="text-sm text-gray-500">
          Choose the plan that fits your household. Cancel any time.
        </p>
      </div>

      {/* Billing toggle */}
      <AnnualToggle annual={annual} onChange={setAnnual} />

      {/* Tier cards */}
      <div className="space-y-5">
        {TIERS.map((tier) => (
          <TierCard
            key={tier.id}
            tier={tier}
            annual={annual}
            isDemoMode={isDemoMode}
            onSelect={handleTierSelect}
          />
        ))}
      </div>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">
          Frequently asked questions
        </h2>
        <FaqAccordion items={FAQS} />
      </section>

      {/* Value proof bar */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-5 py-4 flex items-center gap-3 text-white shadow-md">
        <TrendingDown className="w-6 h-6 shrink-0 opacity-90" />
        <p className="text-sm font-semibold leading-snug">
          BasketBest users save an average of{' '}
          <span className="text-brand-100">£20+ per week</span> on their grocery
          shop.
        </p>
      </div>
    </div>
  )
}
