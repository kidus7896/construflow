import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  if (roles && profile) {
    const allowed = roles.includes(profile.role)
    if (!allowed) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-danger">403</h1>
            <p className="text-lg text-muted mt-2">Access Denied</p>
            <p className="text-sm text-muted mt-1">You don't have permission to view this page.</p>
            <a href="/" className="text-primary text-sm mt-4 inline-block hover:underline">Go to Dashboard</a>
          </div>
        </div>
      )
    }
  }

  return children
}
