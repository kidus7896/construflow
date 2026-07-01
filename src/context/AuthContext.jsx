import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendEmailVerification,
} from 'firebase/auth'
import { authClient } from '../firebase'
import { api, setTokens, clearTokens } from '../utils/api'

const AuthContext = createContext(null)

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  COMPANY_ADMIN: 'company_admin',
  FINANCE_OFFICER: 'finance_officer',
  ACCOUNTANT: 'accountant',
  PROJECT_MANAGER: 'project_manager',
  VIEWER: 'viewer',
}

const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 0,
  [ROLES.COMPANY_ADMIN]: 1,
  [ROLES.FINANCE_OFFICER]: 2,
  [ROLES.ACCOUNTANT]: 3,
  [ROLES.PROJECT_MANAGER]: 4,
  [ROLES.VIEWER]: 5,
}

const DEFAULT_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    dashboard: ['view'], companies: ['create','read','update','delete','suspend','activate','archive'],
    users: ['create','read','update','delete','suspend'], roles: ['create','read','update','delete'],
    subscriptions: ['create','read','update','delete','approve'], billing: ['read','update'],
    reports: ['read','export'], support: ['create','read','update','delete','assign'],
    announcements: ['create','read','update','delete'], activityLogs: ['read','export'],
    security: ['read','update'], backup: ['create','read','restore','export'],
    systemSettings: ['read','update'], auditLogs: ['read','export'],
    payments: ['read','export'], expenses: ['read','export'],
    vat: ['read','export'], withholding: ['read','export'],
  },
  [ROLES.COMPANY_ADMIN]: {
    dashboard: ['view'], users: ['create','read','update','delete'],
    payments: ['create','read','update','delete','export'], expenses: ['create','read','update','delete','export'],
    vat: ['create','read','update','delete','export'], withholding: ['create','read','update','delete','export'],
    reports: ['read','export'], settings: ['read','update'], companySettings: ['read','update'],
    export: ['read'], delete: ['read'], approve: ['read'],
  },
  [ROLES.FINANCE_OFFICER]: {
    dashboard: ['view'], payments: ['create','read','update','export'],
    expenses: ['create','read','update','export'], vat: ['create','read','update','export'],
    withholding: ['create','read','update','export'], reports: ['read','export'],
  },
  [ROLES.ACCOUNTANT]: {
    dashboard: ['view'], payments: ['create','read','export'],
    expenses: ['create','read','export'], vat: ['create','read','export'],
    withholding: ['create','read','export'], reports: ['read','export'],
  },
  [ROLES.PROJECT_MANAGER]: {
    dashboard: ['view'], expenses: ['create','read','export'], reports: ['read'],
  },
  [ROLES.VIEWER]: {
    dashboard: ['view'], payments: ['read'], expenses: ['read'], vat: ['read'],
    withholding: ['read'], reports: ['read'],
  },
}

async function getFirebaseToken() {
  const user = authClient.currentUser
  if (!user) return null
  return user.getIdToken()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    const unsub = authClient.onAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken()
          setTokens(token)
          const data = await api('/auth/me')
          setUser(data.user)
          setCompanies(data.companies)
          const defaultCompany = data.companies.find(c => c.id === data.user.defaultCompanyId) || data.companies[0] || null
          setSelectedCompany(defaultCompany)
          if (defaultCompany) localStorage.setItem('cf_active_company_id', defaultCompany.id)
        } catch {
          clearTokens()
        }
      } else {
        clearTokens()
        setUser(null)
        setCompanies([])
        setSelectedCompany(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const hasPermission = useCallback((module, action) => {
    if (!user) return false
    const role = user.role || ROLES.COMPANY_ADMIN
    const perms = DEFAULT_PERMISSIONS[role]
    if (!perms) return false
    if (!perms[module]) return false
    return perms[module].includes(action) || perms[module].includes('*')
  }, [user])

  const hasRole = useCallback((role) => {
    if (!user) return false
    if (user.role === ROLES.SUPER_ADMIN) return true
    return ROLE_HIERARCHY[user.role] <= ROLE_HIERARCHY[role]
  }, [user])

  const login = useCallback(async (email, password, rememberMe = false) => {
    setAuthLoading(true)
    try {
      const cred = await signInWithEmailAndPassword(authClient, email, password)
      if (!cred.user.emailVerified) {
        await signOut(authClient)
        return { success: false, error: 'Email not verified. Please check your inbox.', code: 'EMAIL_NOT_VERIFIED', email }
      }
      const token = await cred.user.getIdToken()
      setTokens(token)
      const data = await api('/auth/me')
      setUser(data.user)
      setCompanies(data.companies)
      const defaultCompany = data.companies.find(c => c.id === data.user.defaultCompanyId) || data.companies[0] || null
      setSelectedCompany(defaultCompany)
      if (defaultCompany) localStorage.setItem('cf_active_company_id', defaultCompany.id)
      return { success: true, role: data.user.role, requiresCompanySelection: data.companies.length > 1, companies: data.companies }
    } catch (err) {
      const code = err.code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return { success: false, error: 'Invalid email or password' }
      }
      if (code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many attempts. Try again later.' }
      }
      if (code === 'auth/user-disabled') {
        return { success: false, error: 'Account disabled. Contact support.' }
      }
      return { success: false, error: err.message }
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const signup = useCallback(async (firstName, lastName, email, phone, password) => {
    setAuthLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(authClient, email, password)
      await sendEmailVerification(cred.user)
      const token = await cred.user.getIdToken()
      await api('/auth/register', {
        method: 'POST',
        body: { firstName, lastName, email, phone, firebaseUid: cred.user.uid },
        auth: false,
      })
      await signOut(authClient)
      return { success: true, message: 'Account created. Check your email for verification.', email }
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        return { success: false, error: 'An account with this email already exists' }
      }
      if (err.code === 'auth/weak-password') {
        return { success: false, error: 'Password must be at least 6 characters' }
      }
      return { success: false, error: err.message }
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const verifyEmail = useCallback(async () => {
    const fbUser = authClient.currentUser
    if (!fbUser) return { success: false, error: 'No user logged in' }
    try {
      await sendEmailVerification(fbUser)
      return { success: true, message: 'Verification email sent' }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const forgotPassword = useCallback(async (email) => {
    setAuthLoading(true)
    try {
      await sendPasswordResetEmail(authClient, email)
      return { success: true, message: 'If the account exists, a password reset email has been sent.' }
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return { success: true, message: 'If the account exists, a password reset email has been sent.' }
      }
      return { success: false, error: err.message }
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const resetPassword = useCallback(async (oobCode, newPassword) => {
    setAuthLoading(true)
    try {
      await verifyPasswordResetCode(authClient, oobCode)
      await confirmPasswordReset(authClient, oobCode, newPassword)
      return { success: true, message: 'Password updated successfully. You can now log in.' }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    setAuthLoading(true)
    try {
      const fbUser = authClient.currentUser
      if (!fbUser) return { success: false, error: 'Not authenticated' }
      const cred = await signInWithEmailAndPassword(authClient, fbUser.email, currentPassword)
      await api('/auth/change-password', { method: 'POST', body: { newPassword } })
      return { success: true, message: 'Password changed successfully' }
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        return { success: false, error: 'Current password is incorrect' }
      }
      return { success: false, error: err.message }
    } finally {
      setAuthLoading(false)
    }
  }, [])

  const selectCompany = useCallback(async (companyId) => {
    try {
      const data = await api('/auth/select-company', { method: 'POST', body: { companyId } })
      const company = companies.find(c => c.id === companyId) || data.company
      setSelectedCompany(company)
      return { success: true, company }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [companies])

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {}
    await signOut(authClient)
    clearTokens()
    setUser(null)
    setCompanies([])
    setSelectedCompany(null)
  }, [])

  const logoutAll = useCallback(async () => {
    try {
      await api('/auth/logout-all', { method: 'POST' })
    } catch {}
    await signOut(authClient)
    clearTokens()
    setUser(null)
    setCompanies([])
    setSelectedCompany(null)
  }, [])

  const getSessions = useCallback(async () => {
    const data = await api('/auth/sessions')
    return data.sessions
  }, [])

  const deleteSession = useCallback(async (sessionId) => {
    await api(`/auth/sessions/${sessionId}`, { method: 'DELETE' })
  }, [])

  const logoutOtherSessions = useCallback(async () => {
    await api('/auth/logout-other', { method: 'POST' })
  }, [])

  const updateProfile = useCallback(async (profileData) => {
    try {
      const data = await api('/auth/profile', { method: 'PUT', body: profileData })
      setUser(prev => ({ ...prev, ...profileData }))
      return { success: true, message: data.message }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const updateUser = useCallback(async (id, updates) => {
    const { name, password, ...rest } = updates
    const body = {}
    if (name) body.firstName = name
    if (password) {
      try {
        await api('/auth/change-password', { method: 'POST', body: { newPassword: password } })
      } catch {}
    }
    if (Object.keys(body).length > 0) {
      return updateProfile(body)
    }
    return { success: true }
  }, [updateProfile])

  const getDefaultRoute = useCallback((u) => {
    const role = u?.role || user?.role || ROLES.COMPANY_ADMIN
    if (role === ROLES.SUPER_ADMIN) return '/system-admin'
    if (role === ROLES.COMPANY_ADMIN) return '/'
    return '/user-dashboard'
  }, [user])

  return (
    <AuthContext.Provider value={{
      user, companies, selectedCompany, loading, authLoading,
      login, signup, logout, logoutAll,
      verifyEmail, forgotPassword, resetPassword, changePassword,
      selectCompany, getSessions, deleteSession, logoutOtherSessions,
      updateProfile, updateUser, hasPermission, hasRole, getDefaultRoute, ROLES, getFirebaseToken,
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
