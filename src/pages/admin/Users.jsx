import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Search, UserCircle, Edit3, Ban, CheckCircle, Trash2, Key, X, Shield,
} from 'lucide-react'
import {
  getAllUsers, updateUserRole, updateUserStatus, deleteUser,
} from '../../services/userService'

const roles = ['super_admin', 'admin', 'manager', 'user']

export default function AdminUsers() {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadUsers() {
    setLoading(true)
    try {
      const result = await getAllUsers({ role: roleFilter || undefined, status: statusFilter || undefined })
      setUsers(result.users)
    } catch (err) {
      console.error('Failed to load users', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [roleFilter, statusFilter])

  const filtered = users.filter(u => {
    if (search) {
      const q = search.toLowerCase()
      if (!u.fullName?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    }
    return true
  })

  async function handleRoleChange(uid, role) {
    await updateUserRole(uid, role)
    loadUsers()
  }

  async function handleStatusToggle(uid, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
    await updateUserStatus(uid, newStatus)
    loadUsers()
  }

  async function handleDelete(uid, name) {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    await deleteUser(uid)
    loadUsers()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-56 bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
            <option value="">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Last Login</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-muted">No users found</td></tr>
            ) : filtered.map(u => (
              <tr key={u.uid} className="border-b border-border/50 hover:bg-white/5">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <UserCircle size={28} className="text-muted" />
                    )}
                    <span className="font-medium">{u.fullName || 'Unknown'}</span>
                  </div>
                </td>
                <td className="p-3 text-muted">{u.email}</td>
                <td className="p-3">{u.companyName || '-'}</td>
                <td className="p-3">
                  <select value={u.role} onChange={e => handleRoleChange(u.uid, e.target.value)}
                    className="bg-bg border border-border rounded px-2 py-1 text-xs text-white">
                    {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    u.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                  }`}>
                    {u.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted">
                  {u.createdAt?.toDate?.()?.toLocaleDateString() || '-'}
                </td>
                <td className="p-3 text-xs text-muted">
                  {u.lastLogin?.toDate?.()?.toLocaleDateString() || '-'}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleStatusToggle(u.uid, u.status)}
                      className="p-1.5 text-muted hover:text-warning" title={u.status === 'active' ? 'Suspend' : 'Activate'}>
                      {u.status === 'active' ? <Ban size={14} /> : <CheckCircle size={14} />}
                    </button>
                    <button onClick={() => handleDelete(u.uid, u.fullName)}
                      className="p-1.5 text-muted hover:text-danger" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
