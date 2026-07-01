import { useState } from 'react'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate, today } from '../utils/format'
import { exportToExcel, exportToCSV, printTable } from '../utils/export'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import { Search, Plus, Pencil, Trash2, Download, Printer, FileSpreadsheet } from 'lucide-react'

export default function Supplies() {
  const { companyData, addSupply, editSupply, deleteSupply } = useStore()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ date: today(), customerName: '', materialName: '', quantity: '', unit: '', unitPrice: '', totalAmount: '', invoiceNumber: '', notes: '' })

  const filtered = companyData.supplies.filter(s =>
    s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    s.materialName?.toLowerCase().includes(search.toLowerCase()) ||
    s.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
  )

  function handleChange(e) {
    const { name, value } = e.target
    const updated = { ...form, [name]: value }
    if (name === 'quantity' || name === 'unitPrice') {
      updated.totalAmount = (parseFloat(updated.quantity) || 0) * (parseFloat(updated.unitPrice) || 0)
    }
    setForm(updated)
  }

  function openAdd() {
    setEditId(null)
    setForm({ date: today(), customerName: '', materialName: '', quantity: '', unit: '', unitPrice: '', totalAmount: '', invoiceNumber: '', notes: '' })
    setModal(true)
  }

  function openEdit(item) {
    setEditId(item.id)
    setForm({ date: item.date, customerName: item.customerName, materialName: item.materialName, quantity: item.quantity, unit: item.unit || '', unitPrice: item.unitPrice, totalAmount: item.totalAmount, invoiceNumber: item.invoiceNumber || '', notes: item.notes || '' })
    setModal(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (editId) editSupply(editId, { ...form })
    else addSupply({ ...form })
    setModal(false)
  }

  function handleExportXLSX() {
    const dataForExport = filtered.map(s => ({
      Date: s.date, Customer: s.customerName, Material: s.materialName,
      Quantity: s.quantity, Unit: s.unit, 'Unit Price': s.unitPrice,
      'Total Amount': s.totalAmount, Invoice: s.invoiceNumber, Notes: s.notes
    }))
    exportToExcel(dataForExport, 'supplies')
  }

  function handleExportCSV() {
    const dataForExport = filtered.map(s => ({
      Date: s.date, Customer: s.customerName, Material: s.materialName,
      Quantity: s.quantity, Unit: s.unit, 'Unit Price': s.unitPrice,
      'Total Amount': s.totalAmount, Invoice: s.invoiceNumber, Notes: s.notes
    }))
    exportToCSV(dataForExport, 'supplies')
  }

  function handlePrint() {
    const dataForExport = filtered.map(s => ({
      Date: s.date, Customer: s.customerName, Material: s.materialName,
      Quantity: s.quantity, Unit: s.unit, 'Unit Price': s.unitPrice,
      'Total Amount': s.totalAmount, Invoice: s.invoiceNumber, Notes: s.notes
    }))
    printTable(dataForExport, 'Supply Entries')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Supply Entries</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" />
          </div>
          <button onClick={handleExportXLSX} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Export Excel"><FileSpreadsheet size={18} /></button>
          <button onClick={handleExportCSV} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Export CSV"><Download size={18} /></button>
          <button onClick={handlePrint} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Print"><Printer size={18} /></button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus size={16} /> Add Supply
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Material</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Unit Price</th>
              <th className="text-right p-3">Total</th>
              <th className="text-left p-3">Invoice</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-white/5">
                <td className="p-3">{formatDate(s.date)}</td>
                <td className="p-3">{s.customerName}</td>
                <td className="p-3">{s.materialName}</td>
                <td className="p-3 text-right">{s.quantity} {s.unit}</td>
                <td className="p-3 text-right">{formatCurrency(s.unitPrice)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(s.totalAmount)}</td>
                <td className="p-3">{s.invoiceNumber}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-muted hover:text-primary"><Pencil size={15} /></button>
                    <button onClick={() => { if (confirm('Delete this supply?')) deleteSupply(s.id) }} className="p-1.5 text-muted hover:text-danger"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted">No supply entries found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Supply' : 'Add Supply'}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
          <FormField label="Customer Name" name="customerName" value={form.customerName} onChange={handleChange} required />
          <FormField label="Material Name" name="materialName" value={form.materialName} onChange={handleChange} required />
          <FormField label="Quantity" name="quantity" type="number" step="0.01" value={form.quantity} onChange={handleChange} required />
          <FormField label="Unit" name="unit" value={form.unit} onChange={handleChange} placeholder="m³, kg, pcs..." />
          <FormField label="Unit Price (ETB)" name="unitPrice" type="number" step="0.01" value={form.unitPrice} onChange={handleChange} required />
          <FormField label="Total Amount" name="totalAmount" type="number" step="0.01" value={form.totalAmount} onChange={handleChange}>
            <input type="number" step="0.01" value={form.totalAmount} readOnly
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white/70 cursor-not-allowed" />
          </FormField>
          <FormField label="Invoice Number" name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} />
          <div className="sm:col-span-2">
            <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleChange} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              {editId ? 'Update' : 'Add'} Supply
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
