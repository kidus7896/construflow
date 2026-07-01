import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react'

export default function ForgotPassword() {
  const { forgotPassword, authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim()) { setError('Email is required'); return }
    if (!emailRegex.test(email)) { setError('Invalid email address'); return }

    const result = await forgotPassword(email)
    if (result.success) {
      setSuccess(result.message)
      setSubmitted(true)
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
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-white text-center mb-2">Forgot Password?</h2>
          <p className="text-sm text-muted text-center mb-6">
            {submitted
              ? 'Check your email for a password reset link'
              : 'Enter your email and we\'ll send you a reset link'}
          </p>

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

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted">Email Address</label>
                <input type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary"
                  placeholder="you@example.com" autoComplete="email" />
              </div>
              <button type="submit" disabled={authLoading}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {authLoading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send Reset Link'}
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
