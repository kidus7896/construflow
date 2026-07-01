import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function Login() {
  const { login, authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message)
    }
  }, [location.state])

  function validateForm() {
    const errors = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!emailRegex.test(form.email)) errors.email = 'Invalid email address'
    if (!form.password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    if (!validateForm()) return

    const result = await login(form.email, form.password, rememberMe)
    if (result.success) {
      if (result.requiresCompanySelection) {
        navigate('/select-company', { state: { companies: result.companies }, replace: true })
      } else {
        localStorage.setItem('cf_session_user', JSON.stringify({ email: form.email }))
        navigate(result.role === 'super_admin' ? '/system-admin' : '/', { replace: true })
      }
    } else {
      if (result.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', { state: { email: result.email } })
        return
      }
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ConstruFlow</h1>
          <p className="text-muted text-sm mt-2">Construction Cash Flow Management</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-sm text-muted mb-6">Sign in to your account</p>

          {successMsg && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg p-3 mb-4">
              <CheckCircle size={16} />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg p-3 mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm text-muted">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); setFieldErrors({ ...fieldErrors, email: '' }) }}
                className={`w-full bg-bg border ${fieldErrors.email ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary transition-colors`}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {fieldErrors.email && <p className="text-xs text-danger">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-muted">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => { setForm({ ...form, password: e.target.value }); setFieldErrors({ ...fieldErrors, password: '' }) }}
                  className={`w-full bg-bg border ${fieldErrors.password ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary transition-colors`}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-bg text-primary focus:ring-primary"
                />
                <span className="text-sm text-muted">Remember Me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {authLoading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Login'}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
