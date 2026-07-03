import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { resetPassword, getErrorMessage } from '../services/authService'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle size={28} className="text-success" />
        </div>
        <h2 className="text-xl font-bold">Check Your Email</h2>
        <p className="text-sm text-muted">
          A password reset link has been sent to <strong className="text-white">{email}</strong>.
        </p>
        <Link to="/login" className="text-primary text-sm hover:underline">Back to login</Link>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <Mail size={22} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold">Reset Password</h2>
        <p className="text-sm text-muted mt-1">Enter your email and we'll send you a reset link</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-muted">Email</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" placeholder="you@example.com" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Mail size={16} />}
          Send Reset Link
        </button>
      </form>

      <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted hover:text-white">
        <ArrowLeft size={14} /> Back to login
      </Link>
    </div>
  )
}
