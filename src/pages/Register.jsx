import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserPlus, Globe } from 'lucide-react'
import { registerUser, signInWithGoogle, getErrorMessage } from '../services/authService'
import { validateEmail, validatePassword, validateConfirmPassword, validateName } from '../utils/validators'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '', companyName: '', email: '', password: '', confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setErrors(p => ({ ...p, [e.target.name]: '' }))
    setApiError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = {
      fullName: validateName(form.fullName),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword: validateConfirmPassword(form.password, form.confirmPassword),
    }
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    setLoading(true)
    try {
      await registerUser(form)
      setRegistered(true)
    } catch (err) {
      setApiError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setApiError(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <UserPlus size={28} className="text-success" />
        </div>
        <h2 className="text-xl font-bold">Verify Your Email</h2>
        <p className="text-sm text-muted">
          A verification link has been sent to <strong className="text-white">{form.email}</strong>.<br />
          Please check your inbox and click the link to activate your account.
        </p>
        <Link to="/login" className="text-primary text-sm hover:underline">Go to Login</Link>
      </div>
    )
  }

  const strength = form.password.length === 0 ? 0
    : form.password.length < 8 ? 1
    : (/[A-Z]/.test(form.password) ? 1 : 0) + (/[a-z]/.test(form.password) ? 1 : 0) + (/[0-9]/.test(form.password) ? 1 : 0) + (/[!@#$%^&*(),.?":{}|<>]/.test(form.password) ? 1 : 0) + (form.password.length >= 12 ? 1 : 0)

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">Create Account</h2>
        <p className="text-sm text-muted mt-1">Get started with ConstruFlow</p>
      </div>

      {apiError && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">{apiError}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-muted">Full Name *</label>
          <input name="fullName" value={form.fullName} onChange={handleChange}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          {errors.fullName && <p className="text-xs text-danger">{errors.fullName}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted">Company Name</label>
          <input name="companyName" value={form.companyName} onChange={handleChange}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted">Email *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          {errors.email && <p className="text-xs text-danger">{errors.email}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted">Password *</label>
          <input name="password" type="password" value={form.password} onChange={handleChange}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          {form.password.length > 0 && (
            <div className="flex gap-1 mt-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? i <= 2 ? 'bg-danger' : i <= 3 ? 'bg-warning' : 'bg-success' : 'bg-border'}`} />
              ))}
            </div>
          )}
          {errors.password && <p className="text-xs text-danger">{errors.password}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted">Confirm Password *</label>
          <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          {errors.confirmPassword && <p className="text-xs text-danger">{errors.confirmPassword}</p>}
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <UserPlus size={16} />}
          Create Account
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted">or</span></div>
      </div>

      <button onClick={handleGoogle} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-border text-white py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 disabled:opacity-50">
        <Globe size={16} /> Sign up with Google
      </button>

      <p className="text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
