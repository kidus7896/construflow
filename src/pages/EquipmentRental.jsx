import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate, today } from '../utils/format'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import SummaryCard from '../components/SummaryCard'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'

export default function EquipmentRental() {
  const { hasPermission } = useAuth()
  const { companyData, addEquipmentRental, editEquipmentRental, deleteEquipmentRental } = useStore()
  const items = companyData.equipmentRental || []
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ date: today(), equipmentName: '', supplierName: '', rentalDays: '', dailyRate: '', totalCost: 0, projectSite: '', notes: '' })

  const summary = useMemo(() => ({
    total: items.reduce((s, i) => s + (parseFloat(i.totalCost) || 0), 0),
    count: items.length,
  }), [items])

  const filtered = useMemo(() => (items || []).filter(i =>
    !search || i.equipmentName?.toLowerCase().includes(search.toLowerCase()) || i.supplierName?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.date) - new Date(a.date)), [items, search])

  function handleChange(e) {
    const { name, value } = e.target
    const updated = { ...form, [name]: value }
    if (name === 'rentalDays' || name === 'dailyRate') {
      updated.totalCost = (parseFloat(updated.rentalDays) || 0) * (parseFloat(updated.dailyRate) || 0)
    }
    setForm(updated)
  }

  function openAdd() { setEditId(null); setForm({ date: today(), equipmentName: '', supplierName: '', rentalDays: '', dailyRate: '', totalCost: 0, projectSite: '', notes: '' }); setModal(true) }
  function openEdit(item) { setEditId(item.id); setForm({ date: item.date, equipmentName: item.equipmentName, supplierName: item.supplierName, rentalDays: item.rentalDays, dailyRate: item.dailyRate, totalCost: item.totalCost, projectSite: item.projectSite || '', notes: item.notes || '' }); setModal(true) }
  function handleSubmit(e) { e.preventDefault(); if (editId) editEquipmentRental(editId, form); else addEquipmentRental(form); setModal(false) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Equipment Rental</h1>
        <div className="flex items-center gap-2">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-56 bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" /></div>
          {hasPermission('expenses', 'create') && <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"><Plus size={16} /> Add Rental</button>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard title="Total Rental Cost" value={formatCurrency(summary.total)} color="blue" />
        <SummaryCard title="Transactions" value={summary.count} color="green" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted"><th className="text-left p-3">Date</th><th className="text-left p-3">Equipment</th><th className="text-left p-3">Supplier</th><th className="text-right p-3">Days</th><th className="text-right p-3">Daily Rate</th><th className="text-right p-3">Total Cost</th><th className="text-center p-3">Actions</th></tr></thead>
          <tbody>{filtered.map(i => (
            <tr key={i.id} className="border-b border-border/50 hover:bg-white/5">
              <td className="p-3">{formatDate(i.date)}</td><td className="p-3">{i.equipmentName}</td><td className="p-3">{i.supplierName}</td>
              <td className="p-3 text-right">{i.rentalDays}</td><td className="p-3 text-right">{formatCurrency(i.dailyRate)}</td>
              <td className="p-3 text-right text-danger font-medium">{formatCurrency(i.totalCost)}</td>
              <td className="p-3 text-center"><div className="flex items-center justify-center gap-2">{hasPermission('expenses', 'update') && <button onClick={() => openEdit(i)} className="p-1.5 text-muted hover:text-primary"><Pencil size={15} /></button>}{hasPermission('expenses', 'delete') && <button onClick={() => { if (confirm('Delete?')) deleteEquipmentRental(i.id) }} className="p-1.5 text-muted hover:text-danger"><Trash2 size={15} /></button>}</div></td>
            </tr>
          ))}{filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted">No equipment rentals recorded</td></tr>}</tbody>
        </table>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Rental' : 'Add Equipment Rental'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
          <FormField label="Equipment Name" name="equipmentName" value={form.equipmentName} onChange={handleChange} required />
          <FormField label="Supplier" name="supplierName" value={form.supplierName} onChange={handleChange} required />
          <FormField label="Rental Days" name="rentalDays" type="number" min="1" value={form.rentalDays} onChange={handleChange} required />
          <FormField label="Daily Rate" name="dailyRate" type="number" step="0.01" value={form.dailyRate} onChange={handleChange} required />
          <FormField label="Total Cost" name="totalCost"><input type="text" value={formatCurrency(form.totalCost || 0)} readOnly className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-danger cursor-not-allowed" /></FormField>
          <div className="sm:col-span-2"><FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} /></div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button><button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">{editId ? 'Update' : 'Add'} Rental</button></div>
        </form>
      </Modal>
    </div>
  )
}
