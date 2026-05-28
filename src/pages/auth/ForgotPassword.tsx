import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBasket, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      })
      if (authError) throw authError
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Brand header */}
        <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-brand-200">
          <ShoppingBasket className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">BasketBest</h1>
        <p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
          {sent ? 'Check your inbox for a reset link.' : 'Reset your password — we\'ll email you a link.'}
        </p>

        <div className="w-full max-w-sm">
          {sent ? (
            /* Success state */
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-brand-600 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
              <p className="text-sm text-gray-600">
                We've sent a password reset link to{' '}
                <span className="font-medium text-gray-800">{email}</span>.
                The link expires in 1 hour.
              </p>
              <p className="text-xs text-gray-500">
                Didn't receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  className="text-brand-600 font-medium hover:underline"
                  onClick={() => { setSent(false) }}
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            /* Email form */
            <form onSubmit={handleSubmit} className="space-y-3 mb-4">
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`input pl-9 ${error ? 'input-error' : ''}`}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-xl">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" className="btn-primary-lg w-full" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          {/* Back to sign in */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Footer value props — mirrors Login page */}
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
