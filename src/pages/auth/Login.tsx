import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShoppingBasket, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Zap } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store'

export function Login() {
  const navigate = useNavigate()
  const { enterDemoMode, setUser } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [magicMode, setMagicMode] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError
      if (data.user) {
        setUser({ id: data.user.id, fullName: data.user.user_metadata.full_name || 'User', email: data.user.email!, loyaltyCards: {}, createdAt: data.user.created_at })
        navigate('/basket')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/basket` },
      })
      if (authError) throw authError
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGoogleLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first'); return }
    setError('')
    setSubmitting(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/basket` },
      })
      if (authError) throw authError
      setMagicLinkSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setSubmitting(false)
    }
  }

  function handleDemo() {
    enterDemoMode()
    navigate('/basket')
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center px-6 py-12">
        <div className="w-16 h-16 bg-brand-100 rounded-3xl flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-6">
          We sent a sign-in link to <strong>{email}</strong>. Click it to log in — no password needed.
        </p>
        <button onClick={() => { setMagicLinkSent(false); setMagicMode(false) }} className="btn-secondary">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-brand-200">
          <ShoppingBasket className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">BasketBest</h1>
        <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
          Compare UK superstore prices and get your groceries at the best price, every week.
        </p>

        <div className="w-full max-w-sm">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm mb-3 disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative text-center"><span className="bg-white px-3 text-xs text-gray-400">or</span></div>
          </div>

          {/* Toggle magic link / password */}
          <div className="flex rounded-2xl border border-gray-200 p-1 mb-4 bg-gray-50">
            <button
              type="button"
              onClick={() => setMagicMode(false)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl transition-colors ${!magicMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setMagicMode(true)}
              className={`flex-1 py-2 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1 ${magicMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              <Zap className="w-3 h-3" />
              Magic link
            </button>
          </div>

          <form onSubmit={magicMode ? handleMagicLink : handleLogin} className="space-y-3 mb-4">
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input pl-9"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {!magicMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Password</label>
                  <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input pl-9 pr-10"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary-lg w-full" disabled={submitting}>
              {submitting ? (magicMode ? 'Sending link…' : 'Signing in…') : (magicMode ? 'Send magic link' : 'Sign in')}
            </button>
          </form>

          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative text-center"><span className="bg-white px-3 text-xs text-gray-400">or</span></div>
          </div>

          <button onClick={handleDemo} className="btn-secondary w-full mb-4">
            Try demo mode
          </button>

          <p className="text-center text-sm text-gray-500">
            No account?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">Create one free</Link>
          </p>
        </div>
      </div>

      {/* Value props */}
      <div className="bg-white border-t border-gray-100 px-6 py-6">
        <div className="flex justify-around max-w-sm mx-auto">
          {[
            { stat: '6', label: 'UK stores compared' },
            { stat: '~60s', label: 'to find best price' },
            { stat: '£20+', label: 'avg weekly saving' },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center">
              <div className="text-xl font-bold text-brand-600">{stat}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
