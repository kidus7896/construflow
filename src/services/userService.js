import {
  collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc, orderBy, limit, startAfter,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import db from '../firebase/firestore'
import storage from '../firebase/storage'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../firebase/auth'

export async function getAllUsers(filters = {}) {
  let constraints = []
  if (filters.role) constraints.push(where('role', '==', filters.role))
  if (filters.status) constraints.push(where('status', '==', filters.status))
  constraints.push(orderBy('createdAt', 'desc'))
  if (filters.lastDoc) constraints.push(startAfter(filters.lastDoc))
  if (filters.limit) constraints.push(limit(filters.limit))
  const q = query(collection(db, 'users'), ...constraints)
  const snap = await getDocs(q)
  const users = []
  snap.forEach(d => users.push({ uid: d.id, ...d.data() }))
  const lastDoc = snap.docs[snap.docs.length - 1]
  return { users, lastDoc }
}

export async function updateUserRole(uid, role) {
  await updateDoc(doc(db, 'users', uid), { role })
}

export async function updateUserStatus(uid, status) {
  await updateDoc(doc(db, 'users', uid), { status })
}

export async function deleteUser(uid) {
  await deleteDoc(doc(db, 'users', uid))
}

export async function uploadProfilePhoto(uid, file) {
  const storageRef = ref(storage, `profiles/${uid}/${file.name}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  const cred = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, cred)
  await updatePassword(user, newPassword)
}
