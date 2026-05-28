import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBasket, MapPin, AlertCircle, ChevronRight, SkipForward } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store'
import type { StoreId } from '../../types'

// ─── Loyalty card definitions ────────────────────────────────────────────────

interface LoyaltyCard {
  storeId: StoreId
  cardName: string
  subtext: string
  logoLetter: string
  /** Tailwind colour classes for the card row */
  bg: string
  border: string
  text: string
  checkBg: string
}

const LOYALTY_CARDS: LoyaltyCard[] = [
  {
    storeId: 'tesco',
    cardName: 'Tesco Clubcard',
    subtext: 'Prices personalised to you',
    logoLetter: 'T',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    checkBg: 'bg-blue-600',
  },
  {
    storeId: 'asda',
    cardName: 'Asda Rewards',
    subtext: 'Prices personalised to you',
    logoLetter: 'A',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    checkBg: 'bg-green-600',
  },
  {
    storeId: 'sainsburys',
    cardName: "Sainsbury's Nectar",
    subtext: 'Prices personalised to you',
    logoLetter: 'S',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    checkBg: 'bg-orange-500',
  },
  {
    storeId: 'morrisons',
    cardName: 'Morrisons More Card',
    subtext: 'Prices personalised to you',
    logoLetter: 'M',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    checkBg: 'bg-yellow-500',
  },
  {
    storeId: 'waitrose',
    cardName: 'Waitrose myWaitrose',
    subtext: 'Prices personalised to you',
    logoLetter: 'W',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    checkBg: 'bg-gray-600',
  },
]

// UK postcode regex (case-insensitive)
const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === step
              ? 'w-6 h-2.5 bg-brand-600'
              : i < step
              ? 'w-2.5 h-2.5 bg-brand-300'
              : 'w-2.5 h-2.5 bg-gray-200'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Onboarding() {
  const navigate = useNavigate()
  const { user, setUser } = useAppStore()

  const [step, setStep] = useState(0)
  const [selectedCards, setSelectedCards] = useState<Partial<Record<StoreId, boolean>>>({})
  const [postcode, setPostcode] = useState(user?.postcode ?? '')
  const [postcodeError, setPostcodeError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // ── Helpers ──────────────────────────────────────────────────────────────

  function toggleCard(storeId: StoreId) {
    setSelectedCards(prev => ({ ...prev, [storeId]: !prev[storeId] }))
  }

  function validatePostcode(value: string): boolean {
    if (!value.trim()) {
      setPostcodeError('Please enter your postcode.')
      return false
    }
    if (!UK_POSTCODE_RE.test(value.trim())) {
      setPostcodeError('Please enter a valid UK postcode, e.g. SW1A 1AA.')
      return false
    }
    setPostcodeError('')
    return true
  }

  // ── Skip: go straight to basket ──────────────────────────────────────────

  function handleSkip() {
    navigate('/basket')
  }

  // ── Step 1 → 2 ───────────────────────────────────────────────────────────

  function handleContinue() {
    setStep(1)
  }

  // ── Finish: upsert profile & navigate ────────────────────────────────────

  async function handleFinish() {
    if (!validatePostcode(postcode)) return
    if (!user) {
      navigate('/basket')
      return
    }

    setSaving(true)
    setSaveError('')
    try {
      const normalisedPostcode = postcode.trim().toUpperCase()

      const { error: dbError } = await supabase.from('profiles').upsert({
        id: user.id,
        loyalty_cards: selectedCards,
        postcode: normalisedPostcode,
      })
      if (dbError) throw dbError

      // Update local Zustand state so the rest of the app sees the new data immediately
      setUser({
        ...user,
        loyaltyCards: selectedCards,
        postcode: normalisedPostcode,
      })

      navigate('/basket')
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Could not save your preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Brand header */}
        <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-brand-200">
          <ShoppingBasket className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">BasketBest</h1>
        <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
          Let's personalise your experience in two quick steps.
        </p>

        {/* Progress dots */}
        <ProgressDots step={step} total={2} />

        <div className="w-full max-w-sm">
          {step === 0 ? (
            /* ── Step 1: Loyalty cards ─────────────────────────────────────── */
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1 text-center">Your loyalty cards</h2>
              <p className="text-sm text-gray-500 mb-5 text-center">
                Tell us which cards you have and we'll show prices that apply to you.
              </p>

              <div className="space-y-3 mb-6">
                {LOYALTY_CARDS.map(card => {
                  const checked = !!selectedCards[card.storeId]
                  return (
                    <button
                      key={card.storeId}
                      type="button"
                      onClick={() => toggleCard(card.storeId)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-150 text-left ${
                        checked
                          ? `${card.bg} ${card.border} ring-2 ring-offset-1 ring-brand-400`
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      aria-pressed={checked}
                    >
                      {/* Store logo */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${card.bg} ${card.text}`}
                      >
                        {card.logoLetter}
                      </div>

                      {/* Card info */}
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm ${checked ? card.text : 'text-gray-800'}`}>
                          {card.cardName}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{card.subtext}</div>
                      </div>

                      {/* Custom checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          checked ? `${card.checkBg} border-transparent` : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Actions */}
              <button type="button" onClick={handleContinue} className="btn-primary-lg w-full mb-3">
                <span className="flex items-center justify-center gap-2">
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="btn-ghost w-full flex items-center justify-center gap-2 text-gray-500"
              >
                <SkipForward className="w-4 h-4" />
                Skip for now
              </button>
            </div>
          ) : (
            /* ── Step 2: Postcode ──────────────────────────────────────────── */
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1 text-center">Confirm your postcode</h2>
              <p className="text-sm text-gray-500 mb-5 text-center">
                We use this to check which stores deliver to you and show accurate slot availability.
              </p>

              <div className="mb-5">
                <label htmlFor="postcode" className="label">Postcode</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="postcode"
                    type="text"
                    value={postcode}
                    onChange={e => {
                      setPostcode(e.target.value)
                      if (postcodeError) validatePostcode(e.target.value)
                    }}
                    onBlur={() => postcode && validatePostcode(postcode)}
                    className={`input pl-9 uppercase tracking-wide ${postcodeError ? 'input-error' : ''}`}
                    placeholder="e.g. SW1A 1AA"
                    autoComplete="postal-code"
                    autoFocus
                    maxLength={8}
                  />
                </div>
                {postcodeError && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {postcodeError}
                  </p>
                )}
              </div>

              {saveError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {saveError}
                </div>
              )}

              {/* Actions */}
              <button
                type="button"
                onClick={handleFinish}
                className="btn-primary-lg w-full mb-3"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Finish — go to my basket'}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(0); setSaveError('') }}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="btn-ghost flex-1 text-gray-500"
                >
                  Skip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer — matches Login page */}
      <div className="bg-white border-t border-gray-100 px-6 py-6">
        <div className="flex justify-around max-w-sm mx-auto">
          {[
            { stat: '6', label: 'UK stores compared' },
            { stat: '~60s', label: 'to find best price' },
            { stat: '£20+', label: 'avg weekly saving' },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-brand-600">{stat}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
