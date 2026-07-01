import { useLocation, Link } from 'react-router-dom'
import { Mail } from 'lucide-react'

export default function VerifyEmail() {
  const location = useLocation()
  const email = location.state?.email || ''

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ConstruFlow</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Verify Your Email</h2>
          {email && <p className="text-sm text-white font-medium mb-4">{email}</p>}
          <p className="text-sm text-muted mb-6">
            A verification link has been sent to your email. Click the link to activate your account, then sign in.
          </p>
          <Link to="/login" className="inline-block w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
