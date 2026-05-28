import { NavLink } from 'react-router-dom'
import { ShoppingBasket, Home, User, Clock } from 'lucide-react'
import { cn } from '../lib/utils'
import { ShoppingAgent } from './ShoppingAgent'
import type { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

const NAV = [
  { to: '/dashboard', icon: Home,            label: 'Home'    },
  { to: '/basket',    icon: ShoppingBasket,  label: 'Basket'  },
  { to: '/orders',    icon: Clock,           label: 'Orders'  },
  { to: '/profile',   icon: User,            label: 'Profile' },
]

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <ShoppingBasket className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">BasketBest</span>
        </div>
        <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">UK</span>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* AI Shopping Assistant (floating button + bottom-sheet) */}
      <ShoppingAgent />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-stretch">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
