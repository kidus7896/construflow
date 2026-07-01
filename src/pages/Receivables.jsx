import { useStore } from '../store/useStore'
import { formatCurrency, formatDate } from '../utils/format'
import { exportToExcel, printTable } from '../utils/export'
import { Search, FileSpreadsheet, Printer, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

export default function Receivables() {
  const { getReceivables } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const receivables = getReceivables()

  const filtered = receivables.filter(r => {
    const matchSearch = !search || r.customerName?.toLowerCase().includes(search.toLowerCase()) || r.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalOutstanding = receivables.reduce((s, r) => s + r.outstandingBalance, 0)
  const totalInvoiced = receivables.reduce((s, r) => s + r.invoiceAmount, 0)
  const totalPaid = receivables.reduce((s, r) => s + r.amountPaid, 0)
  const unpaid = receivables.filter(r => r.status === 'Unpaid').length
  const partial = receivables.filter(r => r.status === 'Partial').length
  const paid = receivables.filter(r => r.status === 'Paid').length

  function handleExport() {
    exportToExcel(filtered, 'receivables')
  }

  function handlePrint() {
    printTable(filtered, 'Receivables')
  }

  const statusIcon = (s) => {
    if (s === 'Paid') return <CheckCircle size={14} className="text-success" />
    if (s === 'Partial') return <AlertTriangle size={14} className="text-warning" />
    return <Clock size={14} className="text-danger" />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Receivables</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white"><FileSpreadsheet size={18} /></button>
          <button onClick={handlePrint} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white"><Printer size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Total Invoiced</p>
          <p className="text-lg font-bold">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Total Paid</p>
          <p className="text-lg font-bold text-success">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Outstanding</p>
          <p className="text-lg font-bold text-danger">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Status Counts</p>
          <p className="text-sm font-medium">
            <span className="text-success">{paid} Paid</span> · <span className="text-warning">{partial} Partial</span> · <span className="text-danger">{unpaid} Unpaid</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Collection Rate</p>
          <p className="text-lg font-bold">{totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Invoice</th>
              <th className="text-right p-3">Invoice Amount</th>
              <th className="text-right p-3">Amount Paid</th>
              <th className="text-right p-3">Outstanding</th>
              <th className="text-left p-3">Due Date</th>
              <th className="text-center p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-white/5">
                <td className="p-3">{r.customerName}</td>
                <td className="p-3">{r.invoiceNumber}</td>
                <td className="p-3 text-right">{formatCurrency(r.invoiceAmount)}</td>
                <td className="p-3 text-right text-success">{formatCurrency(r.amountPaid)}</td>
                <td className="p-3 text-right font-medium text-danger">{formatCurrency(r.outstandingBalance)}</td>
                <td className="p-3">{formatDate(r.dueDate)}</td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === 'Paid' ? 'bg-success/10 text-success' :
                    r.status === 'Partial' ? 'bg-warning/10 text-warning' :
                    'bg-danger/10 text-danger'
                  }`}>
                    {statusIcon(r.status)} {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted">No receivables found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
