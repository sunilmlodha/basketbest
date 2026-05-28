import { useNavigate } from 'react-router-dom'
import {
  TrendingDown, ShoppingBasket, ChevronRight, Star,
  Package, ArrowRight, Sparkles,
} from 'lucide-react'
import { useAppStore } from '../../store'
import { formatGBP, formatDateShort } from '../../lib/utils'
import { StoreChip } from '../../components/StoreChip'

const SAVINGS_HISTORY = [
  { week: 'This week',    saved: 11.32, store: 'asda' as const,   total: 32.44 },
  { week: 'Last week',    saved: 8.50,  store: 'tesco' as const,  total: 35.20 },
  { week: '2 weeks ago',  saved: 14.10, store: 'asda' as const,   total: 30.10 },
  { week: '3 weeks ago',  saved: 6.75,  store: 'sainsburys' as const, total: 38.60 },
]

const totalSaved = SAVINGS_HISTORY.reduce((s, h) => s + h.saved, 0)

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, getActiveBasket, deliveries, isDemoMode } = useAppStore()
  const basket = getActiveBasket()
  const firstName = user?.fullName?.split(' ')[0] || 'there'
  const itemCount = basket?.items.reduce((s, i) => s + i.quantity, 0) ?? 0

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Hi, {firstName} 👋
        </h1>
        <p className="text-sm text-gray-500">Ready to find the best prices today?</p>
        {isDemoMode && (
          <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs text-yellow-700 font-medium">Demo mode — all data is simulated</span>
          </div>
        )}
      </div>

      {/* Savings hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-5 text-white mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-brand-200 text-xs font-medium mb-1">Total saved this month</p>
            <h2 className="text-3xl font-bold">{formatGBP(totalSaved)}</h2>
            <p className="text-brand-200 text-xs mt-1">vs. always shopping at Waitrose</p>
          </div>
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
        </div>
        {/* Mini savings chart */}
        <div className="flex items-end gap-1.5 h-10">
          {SAVINGS_HISTORY.slice().reverse().map((h, i) => (
            <div key={i} className="flex-1 bg-white/20 rounded-sm" style={{ height: `${(h.saved / 15) * 100}%`, minHeight: '20%' }} />
          ))}
        </div>
        <p className="text-brand-200 text-xs mt-2">Last 4 weeks</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => navigate('/basket')}
          className="card p-4 text-left hover:border-brand-200 hover:shadow-md transition-all"
        >
          <ShoppingBasket className="w-6 h-6 text-brand-600 mb-2" />
          <p className="text-sm font-semibold text-gray-900">My basket</p>
          <p className="text-xs text-gray-400 mt-0.5">{itemCount} items</p>
        </button>
        <button
          onClick={() => navigate('/delivery/schedule')}
          className="card p-4 text-left hover:border-brand-200 hover:shadow-md transition-all"
          disabled={itemCount === 0}
        >
          <Star className="w-6 h-6 text-yellow-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Compare prices</p>
          <p className="text-xs text-gray-400 mt-0.5">Find best deal now</p>
        </button>
      </div>

      {/* Current basket preview */}
      {basket && basket.items.length > 0 && (
        <div className="card mb-4">
          <div className="section-header px-4 pt-4 pb-0">
            <h3 className="text-sm font-semibold text-gray-900">{basket.name}</h3>
            <button onClick={() => navigate('/basket')} className="text-xs text-brand-600 font-medium flex items-center gap-0.5">
              Edit <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {basket.items.slice(0, 4).map(item => (
                <span key={item.id} className="badge-gray">
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}{item.product.name.split(' ').slice(0, 2).join(' ')}
                </span>
              ))}
              {basket.items.length > 4 && (
                <span className="badge-gray">+{basket.items.length - 4} more</span>
              )}
            </div>
            <button onClick={() => navigate('/delivery/schedule')} className="btn-primary w-full">
              Schedule delivery &amp; compare
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Recent deliveries */}
      {deliveries.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent orders</h3>
          <div className="space-y-2">
            {deliveries.slice(0, 3).map(d => (
              <div key={d.id} className="card px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  {d.chosenStore && <StoreChip storeId={d.chosenStore} size="sm" className="mb-0.5" />}
                  <p className="text-xs text-gray-500">{formatDateShort(d.scheduledDate)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{d.totalPrice ? formatGBP(d.totalPrice) : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly savings breakdown */}
      <div>
        <div className="section-header">
          <h3 className="text-sm font-semibold text-gray-900">Savings history</h3>
          <button className="text-xs text-brand-600 font-medium">See all</button>
        </div>
        <div className="space-y-2">
          {SAVINGS_HISTORY.map((h, i) => (
            <div key={i} className="card px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm text-gray-700">{h.week}</span>
                  <StoreChip storeId={h.store} size="sm" />
                </div>
                <p className="text-xs text-gray-400">Total: {formatGBP(h.total)}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-brand-600">-{formatGBP(h.saved)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
