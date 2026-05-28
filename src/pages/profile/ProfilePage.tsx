import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, MapPin, CreditCard, Bell, LogOut, ChevronRight, Check } from 'lucide-react'
import { useAppStore } from '../../store'
import { LOYALTY_SCHEMES, type StoreId } from '../../types'
import { supabase } from '../../lib/supabase'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, setUser, setLoading, isDemoMode } = useAppStore()
  const [loyaltyCards, setLoyaltyCards] = useState<Partial<Record<StoreId, boolean>>>(user?.loyaltyCards || {})
  const [saved, setSaved] = useState(false)

  function toggleCard(storeId: StoreId) {
    setLoyaltyCards(c => ({ ...c, [storeId]: !c[storeId] }))
    setSaved(false)
  }

  function handleSave() {
    if (user) {
      useAppStore.getState().setUser({ ...user, loyaltyCards })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  async function handleSignOut() {
    setLoading(true)
    if (!isDemoMode) await supabase.auth.signOut()
    setUser(null)
    navigate('/login')
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="page-container">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Profile</h1>

      {/* User info */}
      <div className="card px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{user.fullName}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            {user.postcode && <p className="text-xs text-gray-400 mt-0.5">📍 {user.postcode}</p>}
          </div>
        </div>
      </div>

      {/* Loyalty cards */}
      <div className="card mb-4">
        <div className="px-4 pt-4 pb-2 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Loyalty cards</h3>
          <p className="text-xs text-gray-400 mt-0.5">We'll show loyalty-adjusted prices in comparisons</p>
        </div>
        <div className="divide-y divide-gray-50">
          {Object.entries(LOYALTY_SCHEMES).map(([storeId, scheme]) => {
            if (!scheme) return null
            const active = loyaltyCards[storeId as StoreId]
            return (
              <div key={storeId} className="flex items-center px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{scheme.cardName}</p>
                  <p className="text-xs text-gray-400">{scheme.earnRate > 0 ? `Earn ~${scheme.earnRate}p per £1` : 'myWaitrose perks'}</p>
                </div>
                <button
                  onClick={() => toggleCard(storeId as StoreId)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${active ? 'bg-brand-600' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            )
          })}
        </div>
        <div className="px-4 pb-4 pt-2">
          <button onClick={handleSave} className={`btn-primary w-full ${saved ? 'bg-brand-500' : ''}`}>
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : 'Save loyalty preferences'}
          </button>
        </div>
      </div>

      {/* Settings links */}
      <div className="card mb-4">
        {[
          { icon: MapPin, label: 'Delivery addresses', action: () => {} },
          { icon: Bell,   label: 'Notifications',      action: () => {} },
          { icon: CreditCard, label: 'Payment methods', action: () => {} },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action} className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
            <Icon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 flex-1">{label}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        ))}
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-red-500 font-medium hover:text-red-600">
        <LogOut className="w-4 h-4" />
        {isDemoMode ? 'Exit demo mode' : 'Sign out'}
      </button>
    </div>
  )
}
