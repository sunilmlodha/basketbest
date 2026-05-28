import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { Layout } from './components/Layout'
import { ErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { Onboarding } from './pages/auth/Onboarding'
import PricingPage from './pages/pricing/PricingPage'
import { BasketPage } from './pages/basket/BasketPage'
import { SchedulePage } from './pages/delivery/SchedulePage'
import { ComparisonPage } from './pages/comparison/ComparisonPage'
import { CheckoutPage } from './pages/checkout/CheckoutPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { useAppStore } from './store'
import { supabase } from './lib/supabase'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user      = useAppStore((s) => s.user)
  const isDemoMode = useAppStore((s) => s.isDemoMode)
  const isLoading  = useAppStore((s) => s.isLoading)

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user && !isDemoMode) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const setUser   = useAppStore((s) => s.setUser)
  const setLoading = useAppStore((s) => s.setLoading)
  const setSubscriptionTier = useAppStore((s) => s.setSubscriptionTier)

  useEffect(() => {
    // Check existing Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          fullName: session.user.user_metadata.full_name || 'User',
          email: session.user.email!,
          postcode: session.user.user_metadata.postcode,
          loyaltyCards: session.user.user_metadata.loyalty_cards || {},
          createdAt: session.user.created_at,
        })

        // Fetch subscription tier
        try {
          const { data } = await supabase
            .from('subscriptions')
            .select('tier')
            .eq('user_id', session.user.id)
            .single()
          if (data?.tier) setSubscriptionTier(data.tier)
        } catch {
          // Not critical — defaults to 'free'
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          fullName: session.user.user_metadata.full_name || 'User',
          email: session.user.email!,
          postcode: session.user.user_metadata.postcode,
          loyaltyCards: session.user.user_metadata.loyalty_cards || {},
          createdAt: session.user.created_at,
        })
      }
      // Don't clear user on sign-out — demo mode doesn't use Supabase
    })

    return () => subscription.unsubscribe()
  }, [setUser, setLoading, setSubscriptionTier])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/pricing"         element={<PricingPage />} />

          {/* Post-signup onboarding — accessible but private */}
          <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />

          {/* Private — wrapped in Layout */}
          <Route path="/"          element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />
          <Route path="/dashboard" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />
          <Route path="/basket"    element={<PrivateRoute><Layout><BasketPage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />
          <Route path="/orders"    element={<PrivateRoute><Layout><OrdersPage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />
          <Route path="/profile"   element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />

          {/* Delivery / comparison flow */}
          <Route path="/delivery/schedule" element={<PrivateRoute><Layout><SchedulePage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />
          <Route path="/comparison"        element={<PrivateRoute><Layout><ComparisonPage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />
          <Route path="/checkout"          element={<PrivateRoute><Layout><CheckoutPage /></Layout></PrivateRoute>} errorElement={<RouteErrorBoundary />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
