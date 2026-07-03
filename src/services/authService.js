import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  googleProvider,
} from '../firebase/auth'
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore'
import db from '../firebase/firestore'

function getErrorMessage(error) {
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect email or password',
    'auth/invalid-credential': 'Incorrect email or password',
    'auth/too-many-requests': 'Too many login attempts. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/weak-password': 'Password is too weak',
    'auth/popup-closed-by-user': 'Sign in cancelled',
  }
  return map[error.code] || error.message || 'An unexpected error occurred'
}

export async function registerUser({ email, password, fullName, companyName }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await sendEmailVerification(cred.user)
  await setDoc(doc(db, 'users', cred.user.uid), {
    fullName,
    companyName: companyName || '',
    email,
    role: 'user',
    status: 'active',
    emailVerified: false,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    photoURL: '',
    phone: '',
  })
  await signOut(auth)
  return { email }
}

export async function loginUser({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  if (!cred.user.emailVerified) {
    await signOut(auth)
    const error = new Error('Email not verified')
    error.code = 'email-not-verified'
    error.email = email
    throw error
  }
  const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
  if (!userDoc.exists()) {
    await signOut(auth)
    throw new Error('User profile not found')
  }
  const profile = userDoc.data()
  if (profile.status !== 'active') {
    await signOut(auth)
    const error = new Error('Your account has been disabled')
    error.code = 'account-disabled'
    throw error
  }
  await updateDoc(doc(db, 'users', cred.user.uid), {
    lastLogin: serverTimestamp(),
  })
  return { uid: cred.user.uid, ...profile }
}

export async function logoutUser() {
  await signOut(auth)
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function resendVerificationEmail() {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser)
  }
}

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  const userDoc = await getDoc(doc(db, 'users', cred.user.uid))
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', cred.user.uid), {
      fullName: cred.user.displayName || '',
      companyName: '',
      email: cred.user.email,
      role: 'user',
      status: 'active',
      emailVerified: cred.user.emailVerified,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      photoURL: cred.user.photoURL || '',
      phone: '',
    })
  } else {
    const profile = userDoc.data()
    if (profile.status !== 'active') {
      await signOut(auth)
      const error = new Error('Your account has been disabled')
      error.code = 'account-disabled'
      throw error
    }
    await updateDoc(doc(db, 'users', cred.user.uid), {
      lastLogin: serverTimestamp(),
    })
  }
  const updatedDoc = await getDoc(doc(db, 'users', cred.user.uid))
  return { uid: cred.user.uid, ...updatedDoc.data() }
}

export async function updateProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() }
}

export { getErrorMessage }
