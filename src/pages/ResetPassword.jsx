import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

function getPasswordStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password)) score++
  if (score <= 2) return { label: 'Weak', color: 'bg-danger', text: 'text-danger', width: '33%' }
  if (score <= 4) return { label: 'Medium', color: 'bg-warning', text: 'text-warning', width: '66%' }
  return { label: 'Strong', color: 'bg-success', text: 'text-success', width: '100%' }
}

export default function ResetPassword() {
  const { resetPassword, authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode') || searchParams.get('token')

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!oobCode) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [oobCode])

  const passwordStrength = getPasswordStrength(form.password)
  const passwordsMatch = form.password === form.confirmPassword

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!oobCode) { setError('Invalid reset link'); return }

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
    if (!pwRegex.test(form.password)) {
      setError('Password must meet all requirements')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const result = await resetPassword(oobCode, form.password)
    if (result.success) {
      setSuccess(result.message)
      setTimeout(() => navigate('/login', {
        state: { message: 'Password reset successful. You can now log in with your new password.' },
        replace: true,
      }), 2000)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ConstruFlow</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Reset Password</h2>
          <p className="text-sm text-muted mb-6">Enter your new password</p>

          {success && (
            <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg p-3 mb-4">
              <CheckCircle size={16} /> {success}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg p-3 mb-4">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {oobCode && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted">New Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary"
                    placeholder="New password" autoComplete="new-password" />
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
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted">Confirm New Password</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} required value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary"
                    placeholder="Repeat new password" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-danger">Passwords do not match</p>
                )}
              </div>

              <button type="submit" disabled={authLoading || !passwordsMatch}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {authLoading ? <><Loader2 size={16} className="animate-spin" /> Resetting...</> : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-muted mt-6">
            <Link to="/login" className="text-primary hover:underline">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
