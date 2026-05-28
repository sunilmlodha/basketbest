import { useNavigate } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpgradeBannerProps {
  onDismiss: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UpgradeBanner({ onDismiss }: UpgradeBannerProps) {
  const navigate = useNavigate()

  function handleUpgradeClick() {
    navigate('/pricing')
  }

  return (
    <div
      role="banner"
      className="w-full bg-gradient-to-r from-brand-600 to-brand-700 px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm"
    >
      {/* Message + CTA */}
      <button
        type="button"
        onClick={handleUpgradeClick}
        className="flex items-center gap-2 min-w-0 text-left group"
        aria-label="Upgrade to Plus"
      >
        <span className="text-base shrink-0" aria-hidden="true">
          💎
        </span>
        <span className="text-sm font-medium text-white leading-snug truncate">
          <span className="font-semibold">Upgrade to Plus</span>
          {' — '}
          unlimited comparisons + AI meal planning.{' '}
          <span className="font-semibold text-brand-100">£2.99/mo</span>
        </span>
        <ArrowRight className="w-4 h-4 text-brand-100 shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss banner"
        className="shrink-0 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
