import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Globe } from 'lucide-react'
import { loginUser, signInWithGoogle, getErrorMessage } from '../services/authService'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) { setError('All fields are required'); return }
    setLoading(true)
    try {
      await loginUser(form)
      navigate('/', { replace: true })
    } catch (err) {
      if (err.code === 'email-not-verified') {
        setNeedsVerification(true)
        setVerifyEmail(err.email)
      } else {
        setError(getErrorMessage(err))
      }
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
        setError(getErrorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      const { resendVerificationEmail } = await import('../services/authService')
      await resendVerificationEmail()
      alert('Verification email sent!')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (needsVerification) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
          <LogIn size={28} className="text-yellow-400" />
        </div>
        <h2 className="text-xl font-bold">Email Not Verified</h2>
        <p className="text-sm text-muted">
          Please verify your email before logging in.<br />
          A verification link was sent to <strong className="text-white">{verifyEmail}</strong>
        </p>
        <button onClick={handleResend} className="text-primary text-sm hover:underline">
          Resend verification email
        </button>
        <div>
          <button onClick={() => { setNeedsVerification(false); setError('') }}
            className="text-sm text-muted hover:text-white">
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">Welcome Back</h2>
        <p className="text-sm text-muted mt-1">Sign in to your account</p>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm text-muted">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange}
            className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" placeholder="you@example.com" />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-muted">Password</label>
          <div className="relative">
            <input name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handleChange}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted cursor-pointer">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              className="rounded border-border bg-bg" />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LogIn size={16} />}
          Sign In
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center"><span className="bg-card px-2 text-xs text-muted">or</span></div>
      </div>

      <button onClick={handleGoogle} disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-border text-white py-2.5 rounded-lg text-sm font-medium hover:bg-white/10 disabled:opacity-50">
        <Globe size={16} /> Continue with Google
      </button>

      <p className="text-center text-sm text-muted">
        Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
