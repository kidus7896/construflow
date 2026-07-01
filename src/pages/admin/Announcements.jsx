import { useState } from 'react'
import { Bell, Send, X, Eye, Trash2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useAuth } from '../../context/AuthContext'

export default function AdminAnnouncements() {
  const { data, addAnnouncement, addActivityLog } = useStore()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', target: 'all', targetIds: [] })

  const announcements = data.announcements || []

  function handleSend(e) {
    e.preventDefault()
    addAnnouncement({ ...form, createdBy: user?.id })
    setForm({ title: '', message: '', target: 'all', targetIds: [] })
    setShowForm(false)
  }

  function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    const stored = JSON.parse(localStorage.getItem('construction_flow_data') || '{}')
    stored.announcements = (stored.announcements || []).filter(a => a.id !== id)
    localStorage.setItem('construction_flow_data', JSON.stringify(stored))
    addActivityLog('announcement_deleted', `Deleted announcement`)
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Announcements</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Send size={16} /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">New Announcement</h2>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSend} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Message *</label>
                <textarea required rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Target</label>
                <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                  <option value="all">All Companies</option>
                  <option value="selected_companies">Selected Companies</option>
                  <option value="selected_users">Selected Users</option>
                </select>
              </div>
              {form.target === 'selected_companies' && (
                <div className="space-y-1">
                  <label className="text-sm text-muted">Select Companies</label>
                  <div className="max-h-40 overflow-y-auto space-y-1 bg-bg rounded-lg p-2 border border-border">
                    {(data.companies || []).map(c => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-muted cursor-pointer hover:text-white">
                        <input type="checkbox" checked={form.targetIds.includes(c.id)}
                          onChange={e => setForm({ ...form, targetIds: e.target.checked ? [...form.targetIds, c.id] : form.targetIds.filter(id => id !== c.id) })}
                          className="rounded border-border" />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Send</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {announcements.length > 0 ? announcements.map(a => (
          <div key={a.id} className="bg-card border border-border rounded-xl p-4 hover:bg-white/5 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={16} className="text-primary" />
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className="text-xs text-muted">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted whitespace-pre-wrap">{a.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-primary capitalize">To: {a.target?.replace(/_/g, ' ')}</span>
                  {a.targetIds?.length > 0 && (
                    <span className="text-xs text-muted">{a.targetIds.length} recipients</span>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(a.id)} className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        )) : (
          <div className="text-center py-12 text-muted">
            <Bell size={32} className="mx-auto mb-2 opacity-40" />
            <p>No announcements sent yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}