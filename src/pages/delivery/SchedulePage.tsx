import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAppStore } from '../../store'
import { getDeliveryDates, formatGBP } from '../../lib/utils'
import type { DeliverySlot } from '../../types'

const SLOTS: { id: DeliverySlot; label: string; time: string }[] = [
  { id: 'AM',      label: 'Morning',   time: '08:00 – 12:00' },
  { id: 'PM',      label: 'Afternoon', time: '12:00 – 17:00' },
  { id: 'EVENING', label: 'Evening',   time: '17:00 – 21:00' },
]

const DEMO_ADDRESS = {
  id: 'addr-1',
  userId: 'demo-user',
  label: 'Home',
  line1: '42 Victoria Street',
  city: 'London',
  postcode: 'SW1A 1AA',
  isDefault: true,
}

export function SchedulePage() {
  const navigate = useNavigate()
  const { getActiveBasket, setPendingDelivery, setComparing, setComparison } = useAppStore()
  const basket = getActiveBasket()

  const dates = getDeliveryDates()
  const [selectedDate, setSelectedDate] = useState(dates[1].date)
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot>('AM')
  const [confirming, setConfirming] = useState(false)

  async function handleConfirm() {
    if (!basket) return
    setConfirming(true)

    const delivery = {
      id: `delivery-${Date.now()}`,
      basketId: basket.id,
      userId: 'demo-user',
      addressId: DEMO_ADDRESS.id,
      address: DEMO_ADDRESS,
      scheduledDate: selectedDate,
      scheduledSlot: selectedSlot,
      status: 'comparing' as const,
      deliveryFee: 3.99,
      createdAt: new Date().toISOString(),
    }

    setPendingDelivery(delivery)
    setComparing(true)
    setComparison(null)

    // Navigate immediately — comparison screen handles the animation
    navigate('/comparison')
  }

  if (!basket) {
    navigate('/basket')
    return null
  }

  const itemCount = basket.items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="pb-32">
      <div className="px-4 py-4">
        {/* Back */}
        <button onClick={() => navigate('/basket')} className="flex items-center gap-1 text-sm text-gray-500 mb-4 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />Back to basket
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Schedule delivery</h1>
        <p className="text-sm text-gray-500 mb-6">
          We'll compare {itemCount} items across 6 UK stores and find you the best price.
        </p>

        {/* Date picker */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Select delivery date</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {dates.map(({ date, dayName, label }) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`flex-shrink-0 flex flex-col items-center px-3.5 py-2.5 rounded-xl border transition-colors ${
                  selectedDate === date
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-brand-200'
                }`}
              >
                <span className="text-xs font-medium">{dayName.slice(0, 3)}</span>
                <span className="text-base font-bold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time slot */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Select time slot</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map(slot => (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot.id)}
                className={`p-3 rounded-xl border text-center transition-colors ${
                  selectedSlot === slot.id
                    ? 'bg-brand-600 border-brand-600 text-white'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-brand-200'
                }`}
              >
                <div className="text-sm font-semibold">{slot.label}</div>
                <div className={`text-xs mt-0.5 ${selectedSlot === slot.id ? 'text-brand-100' : 'text-gray-400'}`}>{slot.time}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Delivery address */}
        <div className="card px-4 py-3">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{DEMO_ADDRESS.label}</span>
                <button className="text-xs text-brand-600 font-medium">Change</button>
              </div>
              <p className="text-sm text-gray-900 mt-0.5">{DEMO_ADDRESS.line1}</p>
              <p className="text-sm text-gray-900">{DEMO_ADDRESS.city}, {DEMO_ADDRESS.postcode}</p>
            </div>
          </div>
        </div>

        {/* Price info */}
        <div className="mt-4 p-3 bg-brand-50 rounded-xl">
          <p className="text-xs text-brand-700">
            <strong>Delivery fee:</strong> {formatGBP(3.99)} · Free over £50 at most stores
          </p>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky-bottom">
        <button onClick={handleConfirm} disabled={confirming} className="btn-primary-lg w-full">
          {confirming ? 'Starting comparison…' : 'Find best price now'}
          <ChevronRight className="w-5 h-5" />
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">Takes about 60 seconds · Comparing 6 stores</p>
      </div>
    </div>
  )
}
