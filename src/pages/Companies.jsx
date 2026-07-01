import { useState } from 'react'
import { useStore } from '../store/useStore'
import { formatDate } from '../utils/format'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import {
  Building2, Plus, Pencil, Trash2, Copy, Archive, X,
  CheckCircle, AlertTriangle
} from 'lucide-react'

export default function Companies() {
  const { data, companies, currentCompany, setCurrentCompany, addCompany, editCompany, deleteCompany, archiveCompany, duplicateCompany } = useStore()

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({
    name: '', businessType: 'Construction', tinNumber: '',
    phone: '', email: '', address: '', currency: 'ETB',
    vatRate: 15, withholdingRate: 3,
  })

  function openAdd() {
    setEditId(null)
    setForm({ name: '', businessType: 'Construction', tinNumber: '', phone: '', email: '', address: '', currency: 'ETB', vatRate: 15, withholdingRate: 3 })
    setModal(true)
  }

  function openEdit(c) {
    setEditId(c.id)
    setForm({
      name: c.name, businessType: c.businessType || '', tinNumber: c.tinNumber || '',
      phone: c.phone || '', email: c.email || '', address: c.address || '',
      currency: c.currency || 'ETB', vatRate: c.vatRate ?? 15, withholdingRate: c.withholdingRate ?? 3,
    })
    setModal(true)
  }

  function handleSave() {
    if (!form.name.trim()) return
    if (editId) {
      editCompany(editId, form)
    } else {
      const c = addCompany(form)
      setCurrentCompany(c.id)
    }
    setModal(false)
  }

  function handleDuplicate(id) {
    const dup = duplicateCompany(id)
    if (dup) setCurrentCompany(dup.id)
  }

  function handleDelete(id) {
    deleteCompany(id)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Companies</h1>
          <p className="text-sm text-muted mt-1">Manage your business entities</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> New Company
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {companies.map(c => {
          const isActive = c.status !== 'archived'
          const isCurrent = currentCompany?.id === c.id
          return (
            <div key={c.id} className={`relative bg-card border rounded-xl p-5 transition-all ${
              isCurrent ? 'border-primary ring-1 ring-primary/30' : 'border-border'
            } ${!isActive ? 'opacity-60' : ''}`}>
              {isCurrent && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <CheckCircle size={12} /> Active
                </span>
              )}
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Building2 size={20} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white truncate">{c.name}</h3>
                  {c.businessType && <p className="text-xs text-muted">{c.businessType}</p>}
                </div>
              </div>
              <div className="space-y-1.5 text-sm text-muted">
                {c.tinNumber && <p>TIN: <span className="text-white">{c.tinNumber}</span></p>}
                {c.email && <p className="truncate">{c.email}</p>}
                {c.phone && <p>{c.phone}</p>}
                {c.currency && <p>Currency: {c.currency}</p>}
                <p className="text-xs">Created {formatDate(c.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <button onClick={() => setCurrentCompany(c.id)} disabled={isCurrent}
                  className={`flex-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isCurrent ? 'bg-primary/10 text-primary cursor-default' : 'bg-primary/5 text-muted hover:bg-primary/10 hover:text-primary'
                  }`}>
                  {isCurrent ? 'Active' : 'Switch'}
                </button>
                <button onClick={() => openEdit(c)} className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Edit">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDuplicate(c.id)} className="p-1.5 text-muted hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Duplicate">
                  <Copy size={14} />
                </button>
                {isActive ? (
                  <button onClick={() => archiveCompany(c.id)} className="p-1.5 text-muted hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors" title="Archive">
                    <Archive size={14} />
                  </button>
                ) : null}
                <button onClick={() => setConfirmDelete(c.id)} className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors" title="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {companies.length === 0 && (
        <div className="text-center py-16 text-muted">
          <Building2 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No companies yet</p>
          <p className="text-sm mt-1">Create your first company to get started</p>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Company' : 'New Company'}>
        <div className="space-y-4">
          <FormField label="Company Name" required>
            <input name="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" placeholder="e.g. ABC Construction" />
          </FormField>
          <FormField label="Business Type">
            <input name="businessType" value={form.businessType} onChange={e => setForm({...form, businessType: e.target.value})}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="TIN Number">
              <input name="tinNumber" value={form.tinNumber} onChange={e => setForm({...form, tinNumber: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
            </FormField>
            <FormField label="Currency">
              <input name="currency" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
            </FormField>
          </div>
          <FormField label="Email">
            <input name="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
          </FormField>
          <FormField label="Phone">
            <input name="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
          </FormField>
          <FormField label="Address">
            <textarea name="address" value={form.address} onChange={e => setForm({...form, address: e.target.value})}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" rows={2} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="VAT Rate (%)">
              <input name="vatRate" type="number" value={form.vatRate} onChange={e => setForm({...form, vatRate: parseFloat(e.target.value) || 0})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </FormField>
            <FormField label="Withholding Rate (%)">
              <input name="withholdingRate" type="number" value={form.withholdingRate} onChange={e => setForm({...form, withholdingRate: parseFloat(e.target.value) || 0})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(false)}
              className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSave}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
              {editId ? 'Save Changes' : 'Create Company'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Company">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-danger/10 shrink-0">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Are you sure?</p>
            <p className="text-sm text-muted mt-1">This will permanently delete this company and all its data. This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirmDelete(null)}
            className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Cancel</button>
          <button onClick={() => handleDelete(confirmDelete)}
            className="px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
        </div>
      </Modal>
    </div>
  )
}
