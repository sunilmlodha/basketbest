import { useNavigate } from 'react-router-dom'
import { Package, ChevronRight, CheckCircle2, Clock, Truck } from 'lucide-react'
import { useAppStore } from '../store'
import { formatGBP, formatDateShort } from '../lib/utils'
import { EmptyState } from '../components/EmptyState'
import { StoreChip } from '../components/StoreChip'

const STATUS_CONFIG = {
  placed:           { label: 'Order placed',      icon: CheckCircle2, color: 'text-brand-600'  },
  confirmed:        { label: 'Confirmed',          icon: CheckCircle2, color: 'text-brand-600'  },
  out_for_delivery: { label: 'Out for delivery',   icon: Truck,        color: 'text-blue-600'   },
  delivered:        { label: 'Delivered',          icon: CheckCircle2, color: 'text-gray-500'   },
  cancelled:        { label: 'Cancelled',          icon: Clock,        color: 'text-red-500'    },
  pending:          { label: 'Pending',            icon: Clock,        color: 'text-gray-400'   },
  comparing:        { label: 'Comparing prices',   icon: Clock,        color: 'text-brand-500'  },
  awaiting_approval:{ label: 'Awaiting approval',  icon: Clock,        color: 'text-yellow-600' },
  approved:         { label: 'Approved',           icon: CheckCircle2, color: 'text-brand-600'  },
}

export function OrdersPage() {
  const navigate = useNavigate()
  const { deliveries } = useAppStore()

  if (deliveries.length === 0) {
    return (
      <div className="page-container">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Orders</h1>
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="Schedule your first delivery and compare prices across 6 UK stores"
          action={<button onClick={() => navigate('/basket')} className="btn-primary">Build your basket</button>}
        />
      </div>
    )
  }

  return (
    <div className="page-container">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Orders</h1>
      <div className="space-y-3">
        {deliveries.map(d => {
          const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.placed
          const StatusIcon = statusCfg.icon
          return (
            <div key={d.id} className="card px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Package className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {d.chosenStore && <StoreChip storeId={d.chosenStore} size="sm" />}
                    <span className={`flex items-center gap-1 text-xs font-medium ${statusCfg.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDateShort(d.scheduledDate)} · {d.scheduledSlot === 'AM' ? 'Morning' : d.scheduledSlot === 'PM' ? 'Afternoon' : 'Evening'}
                  </p>
                  {d.address && (
                    <p className="text-xs text-gray-400 mt-0.5">{d.address.line1}, {d.address.postcode}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {d.totalPrice ? (
                    <p className="text-sm font-bold text-gray-900">{formatGBP(d.totalPrice)}</p>
                  ) : null}
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-1" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
