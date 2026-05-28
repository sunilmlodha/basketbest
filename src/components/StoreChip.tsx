import { STORES, type StoreId } from '../types'
import { cn } from '../lib/utils'

interface StoreChipProps {
  storeId: StoreId
  size?: 'sm' | 'md'
  showLogo?: boolean
  className?: string
}

export function StoreChip({ storeId, size = 'md', className }: StoreChipProps) {
  const store = STORES[storeId]
  return (
    <span
      className={cn(
        'store-chip',
        store.bgColor,
        store.color,
        store.borderColor,
        size === 'sm' ? 'text-xs px-2 py-1' : '',
        className
      )}
    >
      <span className={cn(
        'w-5 h-5 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0',
        storeId === 'tesco'      && 'bg-blue-600',
        storeId === 'asda'       && 'bg-green-600',
        storeId === 'sainsburys' && 'bg-orange-500',
        storeId === 'morrisons'  && 'bg-yellow-500',
        storeId === 'ocado'      && 'bg-purple-600',
        storeId === 'waitrose'   && 'bg-gray-700',
      )}>
        {store.logoText}
      </span>
      {store.name}
    </span>
  )
}
