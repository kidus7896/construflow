import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { UserCircle, Save, Camera } from 'lucide-react'
import { updateProfile } from '../services/authService'
import { uploadProfilePhoto, changePassword } from '../services/userService'
import { getErrorMessage } from '../services/authService'

export default function Profile() {
  const { profile, user } = useAuth()
  const fileRef = useRef(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: profile?.fullName || '',
    companyName: profile?.companyName || '',
    phone: profile?.phone || '',
  })
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    setError('')
    try {
      await updateProfile(user.uid, form)
      setMsg('Profile updated!')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadProfilePhoto(user.uid, file)
      await updateProfile(user.uid, { photoURL: url })
      setMsg('Photo updated!')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  async function handleChangePw(e) {
    e.preventDefault()
    if (pwForm.newPw !== pwForm.confirm) { setError('Passwords do not match'); return }
    if (pwForm.newPw.length < 8) { setError('Password must be at least 8 characters'); return }
    setSaving(true)
    setError('')
    setMsg('')
    try {
      await changePassword(pwForm.current, pwForm.newPw)
      setMsg('Password changed!')
      setPwForm({ current: '', newPw: '', confirm: '' })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {msg && <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-4 py-2.5">{msg}</div>}
      {error && <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-2.5">{error}</div>}

      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <UserCircle size={80} className="text-muted" />
            )}
            <button onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full hover:bg-primary/90">
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{profile?.fullName || 'User'}</h2>
            <p className="text-sm text-muted">{profile?.email}</p>
            <span className="text-xs text-primary capitalize">{profile?.role?.replace('_', ' ')}</span>
          </div>
          {uploading && <div className="text-xs text-muted">Uploading...</div>}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-muted">Full Name</label>
              <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted">Company Name</label>
              <input value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted">Email</label>
              <input value={profile?.email || ''} disabled
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white/50 cursor-not-allowed" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-medium">Change Password</h3>
        <form onSubmit={handleChangePw} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-muted">Current Password</label>
            <input type="password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">New Password</label>
            <input type="password" value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Confirm New</label>
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          </div>
          <div className="md:col-span-3">
            <button type="submit" disabled={saving}
              className="bg-card border border-border text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-white/5 disabled:opacity-50">
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
