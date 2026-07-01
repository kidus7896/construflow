import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, getDefaultRoute } = useAuth()
  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><p className="text-muted">Loading...</p></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={getDefaultRoute(user)} replace />
  return children
}
