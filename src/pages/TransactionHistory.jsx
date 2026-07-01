import { useState, useMemo } from 'react'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate } from '../utils/format'
import { exportToExcel, printTable } from '../utils/export'
import { Search, FileSpreadsheet, Printer, SortAsc, SortDesc } from 'lucide-react'

export default function TransactionHistory() {
  const { getTransactions } = useStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('asc')

  const transactions = getTransactions()

  const filtered = useMemo(() => {
    let result = [...transactions]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t => t.description?.toLowerCase().includes(q) || t.type?.toLowerCase().includes(q))
    }
    if (typeFilter) result = result.filter(t => t.type === typeFilter)
    if (dateFrom) result = result.filter(t => t.date >= dateFrom)
    if (dateTo) result = result.filter(t => t.date <= dateTo)
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortField === 'cashIn') cmp = (a.cashIn || 0) - (b.cashIn || 0)
      else if (sortField === 'cashOut') cmp = (a.cashOut || 0) - (b.cashOut || 0)
      else if (sortField === 'balance') cmp = a.balance - b.balance
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [transactions, search, typeFilter, dateFrom, dateTo, sortField, sortDir])

  const types = [...new Set(transactions.map(t => t.type))]

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }) {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <SortAsc size={14} className="inline" /> : <SortDesc size={14} className="inline" />
  }

  function handleExport() {
    exportToExcel(filtered.map(t => ({
      Date: t.date, Type: t.type, Description: t.description,
      'Cash In': t.cashIn || 0, 'Cash Out': t.cashOut || 0,
      VAT: t.vat || 0, Withholding: t.withholding || 0, Balance: t.balance,
    })), 'transaction-history')
  }

  function handlePrint() {
    printTable(filtered.map(t => ({
      Date: t.date, Type: t.type, Description: t.description,
      'Cash In': t.cashIn || 0, 'Cash Out': t.cashOut || 0,
      VAT: t.vat || 0, Withholding: t.withholding || 0, Balance: t.balance,
    })), 'Transaction History')
  }

  const summary = {
    totalCashIn: filtered.reduce((s, t) => s + (t.cashIn || 0), 0),
    totalCashOut: filtered.reduce((s, t) => s + (t.cashOut || 0), 0),
    totalVat: filtered.reduce((s, t) => s + (t.vat || 0), 0),
    totalWithholding: filtered.reduce((s, t) => s + (t.withholding || 0), 0),
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white"><FileSpreadsheet size={18} /></button>
          <button onClick={handlePrint} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white"><Printer size={18} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Cash In</p>
          <p className="text-lg font-bold text-success">{formatCurrency(summary.totalCashIn)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Cash Out</p>
          <p className="text-lg font-bold text-danger">{formatCurrency(summary.totalCashOut)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">VAT</p>
          <p className="text-lg font-bold text-warning">{formatCurrency(summary.totalVat)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted">Withholding</p>
          <p className="text-lg font-bold text-warning">{formatCurrency(summary.totalWithholding)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
        <span className="text-muted text-sm">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('date')}>
                Date <SortIcon field="date" />
              </th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('cashIn')}>
                Cash In <SortIcon field="cashIn" />
              </th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('cashOut')}>
                Cash Out <SortIcon field="cashOut" />
              </th>
              <th className="text-right p-3">VAT</th>
              <th className="text-right p-3">Withholding</th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('balance')}>
                Balance <SortIcon field="balance" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-white/5">
                <td className="p-3">{formatDate(t.date)}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    t.type === 'Supply' ? 'bg-blue-500/10 text-blue-400' :
                    t.type === 'Payment' ? 'bg-green-500/10 text-green-400' :
                    t.type === 'VAT' ? 'bg-yellow-500/10 text-yellow-400' :
                    t.type === 'Aggregate Expense' || t.type === 'Transport Expense' ? 'bg-red-500/10 text-red-400' :
                    'bg-gray-500/10 text-gray-400'
                  }`}>{t.type}</span>
                </td>
                <td className="p-3 text-muted max-w-[250px] truncate" title={t.description}>{t.description}</td>
                <td className="p-3 text-right text-success">{t.cashIn > 0 ? formatCurrency(t.cashIn) : '-'}</td>
                <td className="p-3 text-right text-danger">{t.cashOut > 0 ? formatCurrency(t.cashOut) : '-'}</td>
                <td className="p-3 text-right text-warning">{t.vat > 0 ? formatCurrency(t.vat) : '-'}</td>
                <td className="p-3 text-right text-warning">{t.withholding > 0 ? formatCurrency(t.withholding) : '-'}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(t.balance)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted">No transactions found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
