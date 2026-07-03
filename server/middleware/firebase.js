import admin from 'firebase-admin'

let firebaseAdmin = null

export function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null

  if (serviceAccount) {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  } else {
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    })
  }

  return firebaseAdmin
}

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.split('Bearer ')[1]
  try {
    const fbAdmin = getFirebaseAdmin()
    const decodedToken = await fbAdmin.auth().verifyIdToken(token)
    req.user = decodedToken
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    try {
      const { getFirestore } = await import('firebase-admin/firestore')
      const db = getFirestore()
      const userDoc = await db.collection('users').doc(req.user.uid).get()
      if (!userDoc.exists) return res.status(403).json({ error: 'User profile not found' })
      const profile = userDoc.data()
      if (!roles.includes(profile.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }
      req.userProfile = profile
      next()
    } catch {
      return res.status(500).json({ error: 'Failed to verify role' })
    }
  }
}
