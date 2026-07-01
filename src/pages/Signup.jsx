import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++
  if (score <= 2) return { label: 'Weak', color: 'bg-danger', text: 'text-danger', width: '33%' }
  if (score <= 4) return { label: 'Medium', color: 'bg-warning', text: 'text-warning', width: '66%' }
  return { label: 'Strong', color: 'bg-success', text: 'text-success', width: '100%' }
}

export default function Signup() {
  const { signup, authLoading } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  })
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const passwordStrength = getPasswordStrength(form.password)
  const passwordsMatch = form.password === form.confirmPassword
  const canSubmit = passwordsMatch && agreeTerms && !Object.values(fieldErrors).some(Boolean) &&
    form.firstName && form.lastName && form.email && form.password && form.confirmPassword

  function validateForm() {
    const errors = {}
    if (!form.firstName.trim()) errors.firstName = 'First name is required'
    if (!form.lastName.trim()) errors.lastName = 'Last name is required'

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!emailRegex.test(form.email)) errors.email = 'Invalid email address'

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]).{8,}$/
    if (!form.password) errors.password = 'Password is required'
    else if (!pwRegex.test(form.password)) errors.password = 'Must contain uppercase, lowercase, number, and special character'

    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password'
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match'

    if (!agreeTerms) errors.terms = 'You must agree to the Terms and Conditions'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!validateForm()) return

    const result = await signup(form.firstName, form.lastName, form.email, form.phone, form.password)
    if (result.success) {
      navigate('/verify-email', {
        state: { email: form.email, message: result.message },
        replace: true,
      })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ConstruFlow</h1>
          <p className="text-muted text-sm mt-2">Create your account</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Create Account</h2>

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg p-3 mb-4">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-muted">First Name *</label>
                <input type="text" required value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })}
                  className={`w-full bg-bg border ${fieldErrors.firstName ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary`}
                  placeholder="John" autoComplete="given-name" />
                {fieldErrors.firstName && <p className="text-xs text-danger">{fieldErrors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted">Last Name *</label>
                <input type="text" required value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })}
                  className={`w-full bg-bg border ${fieldErrors.lastName ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary`}
                  placeholder="Doe" autoComplete="family-name" />
                {fieldErrors.lastName && <p className="text-xs text-danger">{fieldErrors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Email Address *</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className={`w-full bg-bg border ${fieldErrors.email ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary`}
                placeholder="you@example.com" autoComplete="email" />
              {fieldErrors.email && <p className="text-xs text-danger">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Phone Number</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary"
                placeholder="+251 91 234 5678" autoComplete="tel" />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className={`w-full bg-bg border ${fieldErrors.password ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary`}
                  placeholder="Create a strong password" autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: passwordStrength.width }} />
                  </div>
                  <p className={`text-xs ${passwordStrength.text}`}>{passwordStrength.label}</p>
                </div>
              )}
              {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
              <ul className="text-xs text-muted space-y-0.5 mt-1">
                <li className={form.password.length >= 8 ? 'text-success' : ''}>Minimum 8 characters</li>
                <li className={/[A-Z]/.test(form.password) ? 'text-success' : ''}>One uppercase letter</li>
                <li className={/[a-z]/.test(form.password) ? 'text-success' : ''}>One lowercase letter</li>
                <li className={/\d/.test(form.password) ? 'text-success' : ''}>One number</li>
                <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(form.password) ? 'text-success' : ''}>One special character</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Confirm Password *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className={`w-full bg-bg border ${fieldErrors.confirmPassword ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary`}
                  placeholder="Repeat your password" autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirmPassword && !passwordsMatch && (
                <p className="text-xs text-danger">Passwords do not match</p>
              )}
              {form.confirmPassword && passwordsMatch && (
                <p className="text-xs text-success flex items-center gap-1"><CheckCircle size={12} /> Passwords match</p>
              )}
              {fieldErrors.confirmPassword && <p className="text-xs text-danger">{fieldErrors.confirmPassword}</p>}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-border bg-bg text-primary focus:ring-primary" />
              <span className="text-sm text-muted">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms and Conditions</Link>
              </span>
            </label>
            {fieldErrors.terms && <p className="text-xs text-danger">{fieldErrors.terms}</p>}

            <button type="submit" disabled={authLoading || !canSubmit}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {authLoading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
