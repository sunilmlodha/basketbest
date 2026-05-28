import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatGBPShort(amount: number): string {
  if (amount >= 100) return `£${Math.floor(amount)}`
  return `£${amount.toFixed(2)}`
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(isoDate))
}

export function formatDateShort(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

export function getDeliveryDates(): Array<{ date: string; label: string; dayName: string }> {
  const dates = []
  for (let i = 0; i < 8; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const isoDate = d.toISOString().split('T')[0]
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' })
    const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    dates.push({ date: isoDate, label, dayName })
  }
  return dates
}

export function postcodeRegex(postcode: string): boolean {
  return /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postcode.trim())
}
