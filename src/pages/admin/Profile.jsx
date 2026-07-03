import { useState } from 'react'
import { UserCircle, Save } from 'lucide-react'

export default function AdminProfile() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  })

  function handleSave(e) {
    e.preventDefault()
    alert('Profile updated!')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <UserCircle size={64} className="text-muted" />
          <div>
            <h2 className="text-xl font-semibold">Admin</h2>
            <p className="text-sm text-muted">admin@construflow.com</p>
            <span className="text-xs text-primary capitalize">Super Admin</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-muted">Full Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Email</label>
            <input value={form.email} disabled
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white/50 focus:ring-1 focus:ring-primary cursor-not-allowed" />
          </div>
          <div className="border-t border-border pt-4">
            <h3 className="font-medium mb-3">Change Password</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">Current Password</label>
                <input type="password" value={form.currentPassword} onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">New Password</label>
                <input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>
          <button type="submit" className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Save size={16} /> Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
