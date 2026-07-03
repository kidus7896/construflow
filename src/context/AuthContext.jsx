import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged } from '../firebase/auth'
import { auth } from '../firebase/auth'
import { getUserProfile } from '../services/authService'

const AuthContext = createContext(null)

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
}

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  user: 1,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const p = await getUserProfile(firebaseUser.uid)
          setProfile(p)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  function hasRole(minRole) {
    if (!profile) return false
    const userLevel = ROLE_HIERARCHY[profile.role] || 0
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0
    return userLevel >= requiredLevel
  }

  function hasPermission(module, action) {
    if (!profile) return false
    return true
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      ROLES,
      hasRole,
      hasPermission,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
