import { cn } from '../lib/utils'

interface ProgressBarProps {
  percent: number
  className?: string
  color?: 'brand' | 'yellow' | 'red'
}

export function ProgressBar({ percent, className, color = 'brand' }: ProgressBarProps) {
  return (
    <div className={cn('h-1.5 bg-gray-100 rounded-full overflow-hidden', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          color === 'brand'  && 'bg-brand-500',
          color === 'yellow' && 'bg-yellow-400',
          color === 'red'    && 'bg-red-400',
        )}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  )
}
