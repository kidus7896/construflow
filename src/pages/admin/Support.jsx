import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useAuth } from '../../context/AuthContext'
import { LifeBuoy, Search, MessageSquare, CheckCircle, Clock, X, Plus, Eye, Edit3, Send, UserCircle } from 'lucide-react'

const tabs = [
  { id: 'all', label: 'All', icon: LifeBuoy },
  { id: 'open', label: 'Open', icon: Clock },
  { id: 'pending', label: 'Pending', icon: MessageSquare },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle },
  { id: 'closed', label: 'Closed', icon: X },
]

export default function AdminSupport() {
  const { data, addSupportTicket, updateSupportTicket, deleteSupportTicket } = useStore()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium', companyId: '', assignedTo: '' })

  const tickets = data.supportTickets || []

  const filteredTickets = tickets.filter(t => {
    if (activeTab !== 'all' && t.status !== activeTab) return false
    if (search && !t.subject?.toLowerCase().includes(search.toLowerCase()) && !t.message?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function resetForm() {
    setForm({ subject: '', message: '', priority: 'medium', companyId: '', assignedTo: '' })
    setEditing(null)
  }

  function openEdit(ticket) {
    setForm({ subject: ticket.subject, message: ticket.message, priority: ticket.priority, companyId: ticket.companyId || '', assignedTo: ticket.assignedTo || '' })
    setEditing(ticket.id)
    setShowModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    if (editing) {
      updateSupportTicket(editing, { ...form, updatedBy: user?.id })
    } else {
      addSupportTicket({ ...form, createdBy: user?.id, companyId: form.companyId || null })
    }
    setShowModal(false)
    resetForm()
  }

  function statusBadge(status) {
    const colors = { open: 'bg-blue-500/10 text-blue-400', pending: 'bg-warning/10 text-warning', resolved: 'bg-success/10 text-success', closed: 'bg-muted/10 text-muted' }
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || ''}`}>{status}</span>
  }

  function priorityBadge(priority) {
    const colors = { low: 'bg-muted/10 text-muted', medium: 'bg-blue-500/10 text-blue-400', high: 'bg-danger/10 text-danger', urgent: 'bg-danger/20 text-danger' }
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[priority] || colors.medium}`}>{priority}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <button onClick={() => { resetForm(); setShowModal(true) }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus size={18} /> New Ticket
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              activeTab === t.id ? 'bg-primary text-white' : 'bg-card border border-border text-muted hover:text-white'
            }`}>
            <t.icon size={16} />
            {t.label}
            {t.id !== 'all' && <span className="text-xs ml-1 opacity-70">({tickets.filter(tk => tk.status === t.id).length})</span>}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
        <Search size={18} className="text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets..."
          className="bg-transparent border-none text-sm text-white w-full focus:outline-none placeholder-muted" />
      </div>

      <div className="space-y-3">
        {filteredTickets.length > 0 ? filteredTickets.map(ticket => {
          const company = data.companies?.find(c => c.id === ticket.companyId)
          return (
            <div key={ticket.id} className="bg-card border border-border rounded-xl p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{ticket.subject}</h3>
                    {statusBadge(ticket.status)}
                    {priorityBadge(ticket.priority)}
                  </div>
                  <p className="text-sm text-muted line-clamp-2">{ticket.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                    <span>From: {ticket.createdBy ? (JSON.parse(localStorage.getItem('cf_users') || '[]').find(u => u.id === ticket.createdBy)?.name || 'Unknown') : 'Unknown'}</span>
                    {company && <span>Company: {company.name}</span>}
                    <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setViewing(ticket)} className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-lg" title="View"><Eye size={16} /></button>
                  <button onClick={() => openEdit(ticket)} className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg" title="Edit"><Edit3 size={16} /></button>
                  {ticket.status !== 'resolved' && ticket.status !== 'closed' ? (
                    <button onClick={() => updateSupportTicket(ticket.id, { status: 'resolved', updatedBy: user?.id })} className="p-1.5 text-muted hover:text-success hover:bg-success/10 rounded-lg" title="Resolve"><CheckCircle size={16} /></button>
                  ) : null}
                  {ticket.status !== 'closed' ? (
                    <button onClick={() => updateSupportTicket(ticket.id, { status: 'closed', updatedBy: user?.id })} className="p-1.5 text-muted hover:text-muted hover:bg-white/5 rounded-lg" title="Close"><X size={16} /></button>
                  ) : null}
                  <button onClick={() => { if (confirm('Delete this ticket?')) deleteSupportTicket(ticket.id) }} className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg" title="Delete"><X size={16} /></button>
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm text-muted text-center py-8">No tickets found.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">{editing ? 'Edit Ticket' : 'New Support Ticket'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">Subject *</label>
                <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Message *</label>
                <textarea required rows={4} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Company</label>
                  <select value={form.companyId} onChange={e => setForm({ ...form, companyId: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                    <option value="">- All Companies -</option>
                    {(data.companies || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                  {editing ? 'Update' : 'Submit'}
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
              <h2 className="text-lg font-bold">{viewing.subject}</h2>
              <button onClick={() => setViewing(null)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-bg rounded-lg p-3">
                <p className="text-sm text-white">{viewing.message}</p>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ['Status', viewing.status],
                  ['Priority', viewing.priority],
                  ['Company', data.companies?.find(c => c.id === viewing.companyId)?.name || 'All'],
                  ['Created', new Date(viewing.createdAt).toLocaleString()],
                  ['Updated', viewing.updatedAt ? new Date(viewing.updatedAt).toLocaleString() : '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className="text-white capitalize">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button onClick={() => setViewing(null)} className="px-4 py-2 text-sm text-muted hover:text-white">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}