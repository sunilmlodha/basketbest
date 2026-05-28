import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShoppingBasket, User, Mail, Lock, MapPin, AlertCircle, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store'
import { postcodeRegex } from '../../lib/utils'

export function Register() {
  const navigate = useNavigate()
  const { setUser } = useAppStore()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', postcode: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'form' | 'verify'>('form')

  function update(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!postcodeRegex(form.postcode)) {
      setError('Please enter a valid UK postcode (e.g. SW1A 1AA)')
      return
    }
    setSubmitting(true)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, postcode: form.postcode } },
      })
      if (authError) throw authError
      if (data.user) {
        if (data.session) {
          // Confirmed immediately (e.g. email confirmation disabled) → onboarding
          setUser({ id: data.user.id, fullName: form.fullName, email: form.email, postcode: form.postcode, loyaltyCards: {}, createdAt: data.user.created_at })
          navigate('/onboarding')
        } else {
          // Email confirmation required — show verify screen
          setStep('verify')
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-b from-brand-50 to-white">
        <div className="w-16 h-16 bg-brand-100 rounded-3xl flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-6">
          We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account.
        </p>
        <Link to="/login" className="btn-secondary">Back to sign in</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-16 h-16 bg-brand-600 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-brand-200">
        <ShoppingBasket className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
      <p className="text-sm text-gray-500 mb-8">Start saving on your weekly shop</p>

      <form onSubmit={handleRegister} className="w-full max-w-sm space-y-3">
        <div>
          <label className="label">Full name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={form.fullName} onChange={e => update('fullName', e.target.value)} className="input pl-9" placeholder="Jane Smith" required />
          </div>
        </div>
        <div>
          <label className="label">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input pl-9" placeholder="jane@example.com" required autoComplete="email" />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="password" value={form.password} onChange={e => update('password', e.target.value)} className="input pl-9" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
          </div>
        </div>
        <div>
          <label className="label">UK Postcode</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={form.postcode} onChange={e => update('postcode', e.target.value.toUpperCase())} className="input pl-9" placeholder="SW1A 1AA" required />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary-lg w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
