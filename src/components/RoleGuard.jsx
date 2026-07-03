import { useAuth } from '../context/AuthContext'

export default function RoleGuard({ children, minRole, fallback = null }) {
  const { hasRole } = useAuth()
  if (hasRole(minRole)) return children
  return fallback
}
