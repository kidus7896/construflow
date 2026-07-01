import { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useAuth } from '../../context/AuthContext'
import { generateId } from '../../utils/format'
import { Search, Plus, Eye, Edit3, Trash2, Ban, CheckCircle, LogIn, Archive, X, RefreshCw, Download } from 'lucide-react'

const subscriptionPlans = ['Free', 'Starter', 'Professional', 'Enterprise', 'Unlimited']
const businessTypes = ['Construction', 'Real Estate', 'Engineering', 'Mining', 'Manufacturing', 'Other']

export default function AdminCompanies() {
  const { data, addCompany, editCompany, deleteCompany, archiveCompany, addActivityLog } = useStore()
  const { user } = useAuth()
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState({
    name: '', businessType: 'Construction', ownerName: '', ownerEmail: '',
    phone: '', tinNumber: '', vatNumber: '', subscriptionPlan: 'Free',
    storageLimit: '100', maxUsers: '5', maxCompanies: '1', status: 'active',
  })

  useEffect(() => {
    let list = data.companies || []
    if (search) list = list.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.tinNumber?.includes(search))
    setCompanies(list)
  }, [data.companies, search])

  function resetForm() {
    setForm({
      name: '', businessType: 'Construction', ownerName: '', ownerEmail: '',
      phone: '', tinNumber: '', vatNumber: '', subscriptionPlan: 'Free',
      storageLimit: '100', maxUsers: '5', maxCompanies: '1', status: 'active',
    })
    setEditing(null)
  }

  function openEdit(company) {
    setForm({
      name: company.name || '',
      businessType: company.businessType || 'Construction',
      ownerName: company.ownerName || '',
      ownerEmail: company.ownerEmail || '',
      phone: company.phone || '',
      tinNumber: company.tinNumber || '',
      vatNumber: company.vatNumber || '',
      subscriptionPlan: company.subscriptionPlan || 'Free',
      storageLimit: String(company.storageLimit || '100'),
      maxUsers: String(company.maxUsers || '5'),
      maxCompanies: String(company.maxCompanies || '1'),
      status: company.status || 'active',
    })
    setEditing(company.id)
    setShowModal(true)
  }

  function handleSave(e) {
    e.preventDefault()
    const payload = { ...form, storageLimit: Number(form.storageLimit), maxUsers: Number(form.maxUsers), maxCompanies: Number(form.maxCompanies) }
    if (editing) {
      editCompany(editing, payload)
      addActivityLog('company_updated', `Updated company: ${form.name}`, user?.id)
    } else {
      addCompany({ ...payload, id: generateId(), createdAt: new Date().toISOString() })
      addActivityLog('company_created', `Created company: ${form.name}`, user?.id)
    }
    setShowModal(false)
    resetForm()
  }

  function handleStatus(company, status) {
    editCompany(company.id, { ...company, status })
    addActivityLog(`company_${status}`, `${company.name} ${status}`, user?.id)
  }

  function handleDelete(company) {
    if (!confirm(`Delete company "${company.name}"? This will remove all associated data.`)) return
    deleteCompany(company.id)
    addActivityLog('company_deleted', `Deleted company: ${company.name}`, user?.id)
  }

  function handleReset(company) {
    if (!confirm(`Reset company "${company.name}"? This will clear all financial data but keep the company profile.`)) return
    const entityKeys = ['supplies','payments','vatReports','vatSales','vatPurchases','vatImportLogs',
      'withholdTaken','withholdGiven','whtImportLogs','whtAuditLog',
      'aggregateExpenses','aggregateSuppliers','aggregateImportLogs','aggregateAttachments','aggregatePaymentHistory',
      'transportExpenses','transportSuppliers','transportImportLogs','transportAttachments',
      'fuelExpenses','equipmentRental','machineryMaintenance','siteExpenses','miscellaneousExpenses']
    const stored = JSON.parse(localStorage.getItem('construction_flow_data') || '{}')
    entityKeys.forEach(key => {
      stored[key] = (stored[key] || []).filter(e => e.companyId !== company.id)
    })
    localStorage.setItem('construction_flow_data', JSON.stringify(stored))
    addActivityLog('company_reset', `Reset company data: ${company.name}`, user?.id)
    window.location.reload()
  }

  function handleLoginAs(company) {
    const users = JSON.parse(localStorage.getItem('cf_users') || '[]')
    const admin = users.find(u => u.companyId === company.id && u.role === 'company_admin')
    if (admin) {
      localStorage.setItem('cf_session', JSON.stringify({ email: admin.email }))
      addActivityLog('company_login_as', `Logged in as ${company.name}`, user?.id)
      window.location.href = '/'
    } else {
      alert('No company admin found for this company. Create a user with Company Admin role first.')
    }
  }

  function statusBadge(status) {
    const colors = { active: 'bg-success/10 text-success', suspended: 'bg-danger/10 text-danger', inactive: 'bg-muted/10 text-muted', trial: 'bg-warning/10 text-warning', archived: 'bg-muted/10 text-muted' }
    return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || colors.inactive}`}>{status}</span>
  }

  function handleExport() {
    const csv = [['Name','Owner','TIN','Plan','Status','Created'].join(',')]
    companies.forEach(c => csv.push([c.name, c.ownerName, c.tinNumber, c.subscriptionPlan, c.status, c.createdAt?.slice(0,10)].join(',')))
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `companies-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Company Management</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors">
            <Download size={16} /> Export
          </button>
          <button onClick={() => { resetForm(); setShowModal(true) }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={18} /> Add Company
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
        <Search size={18} className="text-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or TIN..."
          className="bg-transparent border-none text-sm text-white w-full focus:outline-none placeholder-muted" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Owner</th>
                <th className="text-left px-4 py-3 font-medium">TIN</th>
                <th className="text-left px-4 py-3 font-medium">Plan</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{c.name}</td>
                  <td className="px-4 py-3 text-muted">{c.ownerName || '-'}</td>
                  <td className="px-4 py-3 text-muted">{c.tinNumber || '-'}</td>
                  <td className="px-4 py-3">{c.subscriptionPlan || 'Free'}</td>
                  <td className="px-4 py-3">{statusBadge(c.status)}</td>
                  <td className="px-4 py-3 text-muted text-xs">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewing(c)} className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-lg" title="View"><Eye size={15} /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg" title="Edit"><Edit3 size={15} /></button>
                      <button onClick={() => handleLoginAs(c)} className="p-1.5 text-muted hover:text-purple-400 hover:bg-purple-500/10 rounded-lg" title="Login As Company"><LogIn size={15} /></button>
                      <button onClick={() => handleReset(c)} className="p-1.5 text-muted hover:text-warning hover:bg-warning/10 rounded-lg" title="Reset Company"><RefreshCw size={15} /></button>
                      {c.status === 'active' ? (
                        <button onClick={() => handleStatus(c, 'suspended')} className="p-1.5 text-muted hover:text-warning hover:bg-warning/10 rounded-lg" title="Suspend"><Ban size={15} /></button>
                      ) : c.status === 'suspended' ? (
                        <button onClick={() => handleStatus(c, 'active')} className="p-1.5 text-muted hover:text-success hover:bg-success/10 rounded-lg" title="Activate"><CheckCircle size={15} /></button>
                      ) : null}
                      <button onClick={() => archiveCompany(c.id)} className="p-1.5 text-muted hover:text-muted hover:bg-white/5 rounded-lg" title="Archive"><Archive size={15} /></button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No companies found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">{editing ? 'Edit Company' : 'Create Company'}</h2>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted">Company Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Business Type</label>
                  <select value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                    {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Owner Name *</label>
                  <input required value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Owner Email *</label>
                  <input required type="email" value={form.ownerEmail} onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">TIN Number</label>
                  <input value={form.tinNumber} onChange={e => setForm({ ...form, tinNumber: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">VAT Number</label>
                  <input value={form.vatNumber} onChange={e => setForm({ ...form, vatNumber: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Subscription Plan</label>
                  <select value={form.subscriptionPlan} onChange={e => setForm({ ...form, subscriptionPlan: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                    {subscriptionPlans.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Storage Limit (MB)</label>
                  <input type="number" value={form.storageLimit} onChange={e => setForm({ ...form, storageLimit: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Max Users</label>
                  <input type="number" value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Max Companies</label>
                  <input type="number" value={form.maxCompanies} onChange={e => setForm({ ...form, maxCompanies: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="trial">Trial</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => { setShowModal(false); resetForm() }}
                  className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Cancel</button>
                <button type="submit"
                  className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  {editing ? 'Update Company' : 'Create Company'}
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
                ['Business Type', viewing.businessType],
                ['Owner', viewing.ownerName],
                ['Email', viewing.ownerEmail],
                ['Phone', viewing.phone],
                ['TIN', viewing.tinNumber],
                ['VAT', viewing.vatNumber],
                ['Plan', viewing.subscriptionPlan],
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
    </div>
  )
}