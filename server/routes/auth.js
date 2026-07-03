import { Router } from 'express'
import { authenticate } from '../middleware/firebase.js'

const router = Router()

router.get('/me', authenticate, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const userDoc = await db.collection('users').doc(req.user.uid).get()
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' })
    res.json({ uid: req.user.uid, ...userDoc.data() })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

router.put('/profile', authenticate, async (req, res) => {
  try {
    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore()
    const { fullName, companyName, phone, photoURL } = req.body
    const updates = {}
    if (fullName !== undefined) updates.fullName = fullName
    if (companyName !== undefined) updates.companyName = companyName
    if (phone !== undefined) updates.phone = phone
    if (photoURL !== undefined) updates.photoURL = photoURL
    await db.collection('users').doc(req.user.uid).update(updates)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' })
  }
})

export default router
