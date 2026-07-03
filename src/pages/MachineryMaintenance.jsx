import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate, today } from '../utils/format'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import SummaryCard from '../components/SummaryCard'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'

export default function MachineryMaintenance() {
  const { companyData, addMachineryMaintenance, editMachineryMaintenance, deleteMachineryMaintenance } = useStore()
  const items = companyData.machineryMaintenance || []
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ date: today(), equipmentName: '', maintenanceType: '', cost: '', provider: '', notes: '' })

  const summary = useMemo(() => ({
    total: items.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0),
    count: items.length,
  }), [items])

  const filtered = useMemo(() => (items || []).filter(i =>
    !search || i.equipmentName?.toLowerCase().includes(search.toLowerCase()) || i.maintenanceType?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.date) - new Date(a.date)), [items, search])

  function handleChange(e) { const { name, value } = e.target; setForm(p => ({ ...p, [name]: value })) }
  function openAdd() { setEditId(null); setForm({ date: today(), equipmentName: '', maintenanceType: '', cost: '', provider: '', notes: '' }); setModal(true) }
  function openEdit(item) { setEditId(item.id); setForm({ date: item.date, equipmentName: item.equipmentName, maintenanceType: item.maintenanceType, cost: item.cost, provider: item.provider || '', notes: item.notes || '' }); setModal(true) }
  function handleSubmit(e) { e.preventDefault(); if (editId) editMachineryMaintenance(editId, form); else addMachineryMaintenance(form); setModal(false) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Machinery Maintenance</h1>
        <div className="flex items-center gap-2">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-56 bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" /></div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"><Plus size={16} /> Add Maintenance</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard title="Total Maintenance Cost" value={formatCurrency(summary.total)} color="blue" />
        <SummaryCard title="Transactions" value={summary.count} color="green" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted"><th className="text-left p-3">Date</th><th className="text-left p-3">Equipment</th><th className="text-left p-3">Type</th><th className="text-right p-3">Cost</th><th className="text-left p-3">Provider</th><th className="text-center p-3">Actions</th></tr></thead>
          <tbody>{filtered.map(i => (
            <tr key={i.id} className="border-b border-border/50 hover:bg-white/5">
              <td className="p-3">{formatDate(i.date)}</td><td className="p-3">{i.equipmentName}</td><td className="p-3">{i.maintenanceType}</td>
              <td className="p-3 text-right text-danger font-medium">{formatCurrency(i.cost)}</td><td className="p-3">{i.provider || '-'}</td>
              <td className="p-3 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => openEdit(i)} className="p-1.5 text-muted hover:text-primary"><Pencil size={15} /></button><button onClick={() => { if (confirm('Delete?')) deleteMachineryMaintenance(i.id) }} className="p-1.5 text-muted hover:text-danger"><Trash2 size={15} /></button></div></td>
            </tr>
          ))}{filtered.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">No maintenance records</td></tr>}</tbody>
        </table>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Maintenance' : 'Add Maintenance Record'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
          <FormField label="Equipment Name" name="equipmentName" value={form.equipmentName} onChange={handleChange} required />
          <FormField label="Maintenance Type" name="maintenanceType" value={form.maintenanceType} onChange={handleChange} required />
          <FormField label="Cost (ETB)" name="cost" type="number" step="0.01" value={form.cost} onChange={handleChange} required />
          <FormField label="Service Provider" name="provider" value={form.provider} onChange={handleChange} />
          <div className="sm:col-span-2"><FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} /></div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button><button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">{editId ? 'Update' : 'Add'} Record</button></div>
        </form>
      </Modal>
    </div>
  )
}
