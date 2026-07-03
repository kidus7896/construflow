import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, RefreshCw } from 'lucide-react'
import { resendVerificationEmail, getErrorMessage } from '../services/authService'

export default function VerifyEmail() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleResend() {
    setLoading(true)
    try {
      await resendVerificationEmail()
      setSent(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
        <Mail size={28} className="text-primary" />
      </div>
      <h2 className="text-xl font-bold">Verify Your Email</h2>
      <p className="text-sm text-muted">
        A verification email has been sent to your email address.<br />
        Please check your inbox and click the verification link.
      </p>

      {sent && (
        <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-4 py-2">
          Verification email sent!
        </div>
      )}
      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2">{error}</div>
      )}

      <button onClick={handleResend} disabled={loading}
        className="flex items-center justify-center gap-2 mx-auto text-primary text-sm hover:underline disabled:opacity-50">
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        Resend verification email
      </button>

      <Link to="/login" className="block text-sm text-muted hover:text-white">
        Back to login
      </Link>
    </div>
  )
}
