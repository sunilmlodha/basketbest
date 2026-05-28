import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Lock, ChevronLeft, CheckCircle2, ShoppingBag, MapPin, Clock } from 'lucide-react'
import { useAppStore } from '../../store'
import { DEMO_RECOMMENDATIONS } from '../../lib/demo-data'
import { STORES } from '../../types'
import { formatGBP, formatDate } from '../../lib/utils'
import { StoreChip } from '../../components/StoreChip'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { currentComparison, pendingDelivery, addDelivery, clearPendingDelivery, getActiveBasket } = useAppStore()
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(false)
  const [cardNum, setCardNum] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')

  const rec = currentComparison?.recommendations[0] ?? DEMO_RECOMMENDATIONS[0]
  const store = STORES[rec.store]
  const basket = getActiveBasket()
  const delivery = pendingDelivery

  const subtotal = rec.totalAfterLoyalty
  const deliveryFee = rec.deliveryFee
  const total = subtotal + deliveryFee

  function formatCard(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
  }
  function formatExpiry(v: string) {
    return v.replace(/\D/g, '').slice(0, 4).replace(/(.{2})(.+)/, '$1/$2')
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    setPlacing(true)
    // Simulate payment processing (real: call stripe-checkout edge fn)
    await new Promise(r => setTimeout(r, 1800))

    void {
      id: `order-${Date.now()}`,
      deliveryId: delivery?.id || 'demo-delivery',
      userId: 'demo-user',
      store: rec.store,
      storeOrderId: `${rec.store.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: 'placed' as const,
      totalPaid: total,
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    if (delivery) addDelivery({ ...delivery, status: 'placed', chosenStore: rec.store, totalPrice: total } as any)
    clearPendingDelivery()
    setPlaced(true)
    setPlacing(false)
  }

  if (placed) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-20 h-20 bg-brand-100 rounded-3xl flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order placed!</h1>
        <p className="text-sm text-gray-500 text-center mb-2">
          Your {store.name} order has been confirmed.
        </p>
        {delivery && (
          <p className="text-sm text-brand-700 font-medium text-center mb-6">
            Delivery on {formatDate(delivery.scheduledDate!)} · {delivery.scheduledSlot}
          </p>
        )}
        <div className="card w-full px-4 py-3 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Store</span>
            <StoreChip storeId={rec.store} size="sm" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Groceries</span>
            <span className="text-sm font-medium">{formatGBP(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Delivery</span>
            <span className="text-sm font-medium">{formatGBP(deliveryFee)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm font-bold text-gray-900">Total paid</span>
            <span className="text-sm font-bold text-gray-900">{formatGBP(total)}</span>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={() => navigate('/orders')} className="btn-secondary flex-1">View orders</button>
          <button onClick={() => navigate('/basket')} className="btn-primary flex-1">New basket</button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-32">
      <div className="px-4 py-4">
        <button onClick={() => navigate('/comparison')} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />Back to comparison
        </button>
        <h1 className="text-xl font-bold text-gray-900 mb-4">Checkout</h1>

        {/* Order summary */}
        <div className="card px-4 py-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Order summary</h3>
          <div className="flex items-center gap-3 mb-3">
            <ShoppingBag className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-700">{basket?.items.length || 0} items from</p>
            </div>
            <StoreChip storeId={rec.store} size="sm" />
          </div>
          {delivery && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{formatDate(delivery.scheduledDate!)}</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">
                  {delivery.scheduledSlot === 'AM' ? '08:00 – 12:00' : delivery.scheduledSlot === 'PM' ? '12:00 – 17:00' : '17:00 – 21:00'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{delivery.address?.line1}, {delivery.address?.postcode}</span>
              </div>
            </>
          )}
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Groceries</span><span>{formatGBP(subtotal)}</span>
            </div>
            {rec.loyaltySaving > 0 && (
              <div className="flex justify-between text-sm text-brand-600">
                <span>Loyalty saving</span><span>-{formatGBP(rec.loyaltySaving)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Delivery</span><span>{formatGBP(deliveryFee)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100">
              <span>Total</span><span>{formatGBP(total)}</span>
            </div>
          </div>
        </div>

        {/* Payment form */}
        <form onSubmit={handlePay} className="space-y-3">
          <div className="card px-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Payment details</h3>
              <Lock className="w-3.5 h-3.5 text-gray-300 ml-auto" />
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Card number</label>
                <input
                  className="input"
                  value={cardNum}
                  onChange={e => setCardNum(formatCard(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  inputMode="numeric"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Expiry</label>
                  <input className="input" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" inputMode="numeric" required />
                </div>
                <div>
                  <label className="label">CVC</label>
                  <input className="input" value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" inputMode="numeric" required />
                </div>
              </div>
            </div>
          </div>

          <div className="sticky-bottom">
            <button type="submit" className="btn-primary-lg w-full" disabled={placing}>
              {placing ? 'Processing payment…' : `Pay ${formatGBP(total)}`}
              {!placing && <Lock className="w-4 h-4" />}
            </button>
            <p className="text-center text-xs text-gray-400 mt-1.5">
              Secured by Stripe · Your card details are never stored
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

function Calendar({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
}
