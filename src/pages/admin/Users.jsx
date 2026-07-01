import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useAuth } from '../../context/AuthContext'
import { generateId } from '../../utils/format'
import { Search, Plus, Eye, Edit3, Trash2, Ban, CheckCircle, LogIn, Key, X, UserCircle, Download } from 'lucide-react'

const roleOptions = [
  { value: 'company_admin', label: 'Company Admin' },
  { value: 'finance_manager', label: 'Finance Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'viewer', label: 'Viewer' },
]

export default function AdminUsers() {
  const { data, addActivityLog } = useStore()
  const { updateUser } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [resetPwModal, setResetPwModal] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'viewer', companyId: '', status: 'active',
  })

  function loadUsers() {
    try {
      const all = JSON.parse(localStorage.getItem('cf_users')) || []
      let filtered = all
      if (search) {
        filtered = all.filter(u =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
        )
      }
      setUsers(filtered)
    } catch { setUsers([]) }
  }

  useEffect(() => { loadUsers() }, [search])

  function resetForm() {
    setForm({ name: '', email: '', password: '', role: 'viewer', companyId: '', status: 'active' })
    setEditing(null)
  }

  function openEdit(user) {
    setForm({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'viewer',
      companyId: user.companyId || '',
      status: user.status || 'active',
    })
    setEditing(user.id)
    setShowModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    const allUsers = JSON.parse(localStorage.getItem('cf_users')) || []
    if (editing) {
      const updates = { ...form }
      if (!updates.password) delete updates.password
      else addActivityLog('user_password_reset', `Password reset for ${form.name}`)
      const updated = allUsers.map(u => u.id === editing ? { ...u, ...updates } : u)
      localStorage.setItem('cf_users', JSON.stringify(updated))
      if (editing === JSON.parse(localStorage.getItem('cf_session'))?.email) {
        updateUser(editing, updates)
      }
      addActivityLog('user_updated', `Updated user: ${form.name}`, editing)
    } else {
      if (allUsers.find(u => u.email === form.email)) return alert('Email already exists')
      const newUser = {
        id: generateId(), ...form, createdAt: new Date().toISOString(),
      }
      localStorage.setItem('cf_users', JSON.stringify([...allUsers, newUser]))
      addActivityLog('user_created', `Created user: ${form.name}`)
    }
    setShowModal(false)
    resetForm()
    loadUsers()
  }

  function handleStatus(user, status) {
    const allUsers = JSON.parse(localStorage.getItem('cf_users')) || []
    const updated = allUsers.map(u => u.id === user.id ? { ...u, status } : u)
    localStorage.setItem('cf_users', JSON.stringify(updated))
    addActivityLog(`user_${status}`, `${user.name} ${status}`)
    loadUsers()
  }

  function handleDelete(user) {
    if (!confirm(`Delete user ${user.name}?`)) return
    const allUsers = JSON.parse(localStorage.getItem('cf_users')) || []
    localStorage.setItem('cf_users', JSON.stringify(allUsers.filter(u => u.id !== user.id)))
    addActivityLog('user_deleted', `Deleted user: ${user.name}`)
    loadUsers()
  }

  function handleLoginAs(user) {
    localStorage.setItem('cf_session', JSON.stringify({ email: user.email }))
    addActivityLog('user_login_as', `Logged in as ${user.name}`)
    const route = user.role === 'super_admin' ? '/system-admin' : user.role === 'company_admin' ? '/' : '/user-dashboard'
    window.location.href = route
  }

  function handleResetPassword(user) {
    setResetPwModal(user)
    setNewPassword('')
  }

  function confirmResetPassword() {
    if (!newPassword || newPassword.length < 4) return alert('Password must be at least 4 characters')
    const allUsers = JSON.parse(localStorage.getItem('cf_users')) || []
    const updated = allUsers.map(u => u.id === resetPwModal.id ? { ...u, password: newPassword } : u)
    localStorage.setItem('cf_users', JSON.stringify(updated))
    addActivityLog('password_reset', `Password reset for ${resetPwModal.name}`)
    setResetPwModal(null)
    setNewPassword('')
    alert('Password reset successfully!')
  }

  function handleAssignCompany(user, companyId) {
    const allUsers = JSON.parse(localStorage.getItem('cf_users')) || []
    const updated = allUsers.map(u => u.id === user.id ? { ...u, companyId } : u)
    localStorage.setItem('cf_users', JSON.stringify(updated))
    addActivityLog('user_company_assigned', `Assigned ${user.name} to ${data.companies?.find(c => c.id === companyId)?.name || 'none'}`)
    loadUsers()
  }

  function statusBadge(status) {
    const colors = { active: 'bg-success/10 text-success', suspended: 'bg-danger/10 text-danger', inactive: 'bg-muted/10 text-muted' }
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || colors.inactive}`}>{status}</span>
  }

  function roleBadge(role) {
    const colors = {
      super_admin: 'bg-purple-500/10 text-purple-400',
      company_admin: 'bg-blue-500/10 text-blue-400',
      finance_manager: 'bg-green-500/10 text-green-400',
      accountant: 'bg-yellow-500/10 text-yellow-400',
      project_manager: 'bg-orange-500/10 text-orange-400',
      viewer: 'bg-muted/10 text-muted',
    }
    const labels = {
      super_admin: 'Super Admin', company_admin: 'Company Admin',
      finance_manager: 'Finance Manager', accountant: 'Accountant',
      project_manager: 'Project Manager', viewer: 'Viewer',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[role] || colors.viewer}`}>{labels[role] || role}</span>
  }

  function handleExport() {
    const csv = [['Name','Email','Role','Company','Status','Created'].join(',')]
    users.forEach(u => {
      const company = data.companies?.find(c => c.id === u.companyId)
      csv.push([u.name, u.email, u.role, company?.name || '-', u.status, u.createdAt?.slice(0,10)].join(','))
    })
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `users-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={() => { resetForm(); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={18} /> Add User
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
        <Search size={18} className="text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
          className="bg-transparent border-none text-sm text-white w-full focus:outline-none placeholder-muted" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Last Login</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserCircle size={28} className="text-muted" />
                        <span className="font-medium text-white">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{u.email}</td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3">
                      <select value={u.companyId || ''} onChange={e => handleAssignCompany(u, e.target.value)}
                        className="bg-transparent text-sm text-muted border border-border rounded px-2 py-1 focus:ring-1 focus:ring-primary cursor-pointer">
                        <option value="">- None -</option>
                        {(data.companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">{statusBadge(u.status)}</td>
                    <td className="px-4 py-3 text-xs text-muted">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewing(u)} className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-lg" title="View"><Eye size={15} /></button>
                        <button onClick={() => openEdit(u)} className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg" title="Edit"><Edit3 size={15} /></button>
                        <button onClick={() => handleLoginAs(u)} className="p-1.5 text-muted hover:text-purple-400 hover:bg-purple-500/10 rounded-lg" title="Login As User"><LogIn size={15} /></button>
                        <button onClick={() => handleResetPassword(u)} className="p-1.5 text-muted hover:text-warning hover:bg-warning/10 rounded-lg" title="Reset Password"><Key size={15} /></button>
                        {u.status === 'active' ? (
                          <button onClick={() => handleStatus(u, 'suspended')} className="p-1.5 text-muted hover:text-warning hover:bg-warning/10 rounded-lg" title="Suspend"><Ban size={15} /></button>
                        ) : (
                          <button onClick={() => handleStatus(u, 'active')} className="p-1.5 text-muted hover:text-success hover:bg-success/10 rounded-lg" title="Activate"><CheckCircle size={15} /></button>
                        )}
                        <button onClick={() => handleDelete(u)} className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg" title="Delete"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">{editing ? 'Edit User' : 'Create User'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">Full Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Password {editing && '(leave blank to keep)'}</label>
                <input type="password" value={form.password} required={!editing} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                  {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Company</label>
                <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                  <option value="">- Select Company -</option>
                  {(data.companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Cancel</button>
                <button type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  {editing ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">{viewing.name}</h2>
              <button onClick={() => setViewing(null)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-3">
              {[
                ['Email', viewing.email],
                ['Role', roleOptions.find(r => r.value === viewing.role)?.label || viewing.role],
                ['Company', data.companies?.find(c => c.id === viewing.companyId)?.name || '-'],
                ['Status', viewing.status],
                ['Created', viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-sm text-muted">{label}</span>
                  <span className="text-sm text-white">{value || '-'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {resetPwModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setResetPwModal(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">Reset Password</h2>
              <button onClick={() => setResetPwModal(null)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted">Set a new password for <strong className="text-white">{resetPwModal.name}</strong></p>
              <div className="space-y-1">
                <label className="text-sm text-muted">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" placeholder="Enter new password" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button onClick={() => setResetPwModal(null)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
                <button onClick={confirmResetPassword} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Reset Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}