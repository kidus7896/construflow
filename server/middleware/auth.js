import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let firebaseAdmin

function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    || path.join(__dirname, '..', 'firebase-service-account.json')

  if (!getApps().length) {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
      initializeApp({ credential: cert(serviceAccount) })
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID
      if (!projectId) {
        throw new Error('Firebase project ID required. Set FIREBASE_PROJECT_ID env or provide firebase-service-account.json')
      }
      initializeApp({ projectId })
    }
  }

  firebaseAdmin = getAuth()
  return firebaseAdmin
}

function extractToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.split(' ')[1]
}

export async function authenticate(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) return res.status(401).json({ error: 'Authentication required' })

    const admin = getFirebaseAdmin()
    const decoded = await admin.verifyIdToken(token)
    req.user = { userId: decoded.uid, email: decoded.email, role: decoded.role || 'company_admin' }
    next()
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req)
    if (token) {
      const admin = getFirebaseAdmin()
      const decoded = await admin.verifyIdToken(token)
      req.user = { userId: decoded.uid, email: decoded.email, role: decoded.role || 'company_admin' }
    }
  } catch {}
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' })
    next()
  }
}

export { getFirebaseAdmin }
