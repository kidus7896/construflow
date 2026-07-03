import { useState, useMemo, useRef } from 'react'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate, today, generateId } from '../utils/format'
import { exportToExcel, exportToCSV } from '../utils/export'
import Modal from '../components/Modal'
import * as XLSX from 'xlsx'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, PointElement, LineElement
} from 'chart.js'
import {
  Search, Plus, Eye, Pencil, Trash2, Download, Printer, FileSpreadsheet,
  Upload, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown, History
} from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

const chartOpts = {
  responsive: true,
  plugins: { legend: { labels: { color: '#94A3B8' } } },
  scales: { x: { ticks: { color: '#94A3B8' } }, y: { ticks: { color: '#94A3B8' } } },
}

const PAGE_SIZE = 20
const RATES = [
  { label: '2%', value: 2 },
  { label: '3% (Default)', value: 3 },
  { label: 'Custom', value: 'custom' },
]

function autoDetectColumns(headers) {
  const map = { date: '', companyName: '', tinNumber: '', fsNumber: '', invoiceNumber: '', description: '', amount: '', rate: '', notes: '' }
  const lower = headers.map(h => String(h).toLowerCase().trim())
  lower.forEach((h, i) => {
    if (/\bdate\b/.test(h)) map.date = headers[i]
    else if (/(company|customer|supplier|name|client)/.test(h) && !/(tin|fs|invoice)/.test(h)) map.companyName = headers[i]
    else if (/\btin\b/.test(h) || /t\.?i\.?n/.test(h)) map.tinNumber = headers[i]
    else if (/\bfs\b/.test(h) || /fiscal/.test(h)) map.fsNumber = headers[i]
    else if (/(invoice|inv|receipt|ref)/.test(h)) map.invoiceNumber = headers[i]
    else if (/(description|item|product|service|detail)/.test(h)) map.description = headers[i]
    else if (/(amount|gross|before|total)/.test(h)) map.amount = headers[i]
    else if (/(rate|percent|wht|%)/.test(h)) map.rate = headers[i]
    else if (/(note|remark|comment)/.test(h)) map.notes = headers[i]
  })
  return map
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const vals = []; let cur = '', inQuote = false
    for (const ch of lines[i]) {
      if (ch === '"') inQuote = !inQuote
      else if (ch === ',' && !inQuote) { vals.push(cur.trim().replace(/^"|"$/g, '')); cur = '' }
      else cur += ch
    }
    vals.push(cur.trim().replace(/^"|"$/g, ''))
    if (vals.some(v => v)) rows.push(vals)
  }
  return { headers, rows }
}

function parseDate(val) {
  if (!val) return ''
  val = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
  const m = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  const m2 = val.match(/(\d{1,2})-(\d{1,2})-(\d{4})/)
  if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`
  try {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  } catch {}
  return ''
}

function formatMonth(m) {
  if (!m) return ''
  const [y, mon] = m.split('-')
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${names[parseInt(mon)-1] || mon} ${y}`
}

export default function WithholdingReports() {
  const { data, companyData, addWithholdTaken, editWithholdTaken, deleteWithholdTaken, clearWithholdTaken, addWithholdGiven, editWithholdGiven, deleteWithholdGiven, clearWithholdGiven, addWhtImportLog, addWhtAuditLog } = useStore()

  const [tab, setTab] = useState('taken')
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [viewModal, setViewModal] = useState(false)
  const [errors, setErrors] = useState({})
  const transactionType = tab === 'taken' ? 'taken' : 'received'

  const [form, setForm] = useState({
    date: today(), companyName: '', tinNumber: '', fsNumber: '', invoiceNumber: '',
    itemDescription: '', amount: '', rate: 3, customRate: '', notes: '',
  })

  const [importModal, setImportModal] = useState(false)
  const [importStep, setImportStep] = useState('upload')
  const [importData, setImportData] = useState({ headers: [], rows: [], mapped: {}, preview: [], validCount: 0, invalidCount: 0, totalAmount: 0, totalWht: 0, netAmount: 0, warnings: [] })
  const fileRef = useRef(null)

  const takenList = companyData.withholdTaken || []
  const receivedList = companyData.withholdGiven || []
  const auditLog = companyData.whtAuditLog || []

  const currentList = tab === 'taken' ? takenList : tab === 'received' ? receivedList : []

  const years = useMemo(() => {
    const s = new Set()
    ;[...takenList, ...receivedList].forEach(v => { if (v.date) s.add(v.date.slice(0, 4)) })
    s.add(new Date().getFullYear().toString())
    return [...s].sort().reverse()
  }, [takenList, receivedList])

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    if (!currentList) return []
    let items = [...currentList]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(v =>
        (v.companyName || '')?.toLowerCase().includes(q) ||
        v.tinNumber?.includes(q) || v.fsNumber?.includes(q) ||
        v.invoiceNumber?.toLowerCase().includes(q) ||
        v.itemDescription?.toLowerCase().includes(q)
      )
    }
    if (yearFilter) items = items.filter(v => v.date?.startsWith(yearFilter))
    if (monthFilter) items = items.filter(v => v.date?.slice(0, 7) === monthFilter)
    if (dateFrom) items = items.filter(v => v.date >= dateFrom)
    if (dateTo) items = items.filter(v => v.date <= dateTo)
    items.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = (a.date || '').localeCompare(b.date || '')
      else if (sortField === 'company') cmp = ((a.companyName || '') + '').localeCompare((b.companyName || '') + '')
      else if (sortField === 'amount') cmp = (parseFloat(a.amount || 0)) - (parseFloat(b.amount || 0))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return items
  }, [currentList, search, yearFilter, monthFilter, dateFrom, dateTo, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalTaken = takenList.reduce((s, v) => s + (parseFloat(v.amount || 0)), 0)
  const totalTakenWht = takenList.reduce((s, v) => s + (parseFloat(v.amount || 0) * (parseFloat(v.rate || 3) / 100)), 0)
  const totalReceived = receivedList.reduce((s, v) => s + (parseFloat(v.amount || 0)), 0)
  const totalReceivedWht = receivedList.reduce((s, v) => s + (parseFloat(v.amount || 0) * (parseFloat(v.rate || 3) / 100)), 0)
  const netWht = totalReceivedWht - totalTakenWht

  function getRate(v) { return parseFloat(v.rate || 3) }
  function getWhtAmount(v) { return parseFloat(v.amount || 0) * (getRate(v) / 100) }
  function getNetPayment(v) { return parseFloat(v.amount || 0) - getWhtAmount(v) }

  function resetForm() {
    setEditId(null); setErrors({})
    setForm({ date: today(), companyName: '', tinNumber: '', fsNumber: '', invoiceNumber: '', itemDescription: '', amount: '', rate: 3, customRate: '', notes: '' })
  }

  function openAdd() { resetForm(); setModal(true) }

  function openEdit(item) {
    setEditId(item.id); setErrors({})
    setForm({
      date: item.date, companyName: item.companyName || '', tinNumber: item.tinNumber || '',
      fsNumber: item.fsNumber || '', invoiceNumber: item.invoiceNumber || '',
      itemDescription: item.itemDescription || '', amount: item.amount,
      rate: item.rate || 3, customRate: item.customRate || (item.rate && ![2,3].includes(Number(item.rate)) ? item.rate : ''),
      notes: item.notes || '',
    })
    setModal(true)
  }

  function openView(item) { setViewItem(item); setViewModal(true) }

  function validate() {
    const e = {}
    if (!form.companyName.trim()) e.companyName = 'Company name is required'
    if (!form.tinNumber.trim()) e.tinNumber = 'TIN Number is required'
    if (!form.itemDescription.trim()) e.itemDescription = 'Description is required'
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) e.amount = 'Amount must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const finalRate = form.rate === 'custom' ? parseFloat(form.customRate) || 3 : parseFloat(form.rate)
    const payload = { ...form, amount: parseFloat(form.amount), rate: finalRate, customRate: form.rate === 'custom' ? form.customRate : '' }
    const entryDesc = `${transactionType === 'taken' ? 'Taken' : 'Received'} - ${form.companyName}`
    if (editId) {
      if (transactionType === 'taken') editWithholdTaken(editId, payload)
      else editWithholdGiven(editId, payload)
      addWhtAuditLog({ action: 'edit', type: transactionType, recordId: editId, description: entryDesc, details: JSON.stringify(payload) })
    } else {
      let newId
      if (transactionType === 'taken') newId = addWithholdTaken(payload)
      else newId = addWithholdGiven(payload)
      addWhtAuditLog({ action: 'create', type: transactionType, recordId: newId?.id || '', description: entryDesc, details: JSON.stringify(payload) })
    }
    setModal(false)
  }

  function handleDelete(id) {
    if (!confirm('Delete this record?')) return
    const item = currentList.find(v => v.id === id)
    if (transactionType === 'taken') deleteWithholdTaken(id)
    else deleteWithholdGiven(id)
    addWhtAuditLog({ action: 'delete', type: transactionType, recordId: id, description: item?.companyName || 'unknown', details: JSON.stringify(item) })
  }

  function handleExportExcel() {
    const d = sorted.map(v => {
      const wht = getWhtAmount(v); const net = getNetPayment(v)
      return {
        Date: v.date, Company: v.companyName, 'TIN': v.tinNumber, 'FS Number': v.fsNumber,
        'Invoice': v.invoiceNumber, Description: v.itemDescription,
        Amount: v.amount, 'WHT %': getRate(v), 'WHT Amount': wht.toFixed(2), 'Net': net.toFixed(2),
      }
    })
    exportToExcel(d, `wht-${tab}-transactions`)
  }

  function handleExportCSV() {
    const d = sorted.map(v => {
      const wht = getWhtAmount(v); const net = getNetPayment(v)
      return {
        Date: v.date, Company: v.companyName, 'TIN': v.tinNumber, 'FS Number': v.fsNumber,
        'Invoice': v.invoiceNumber, Description: v.itemDescription,
        Amount: v.amount, 'WHT %': getRate(v), 'WHT Amount': wht.toFixed(2), 'Net': net.toFixed(2),
      }
    })
    exportToCSV(d, `wht-${tab}-transactions`)
  }

  function handlePrintReport() {
    const label = tab === 'taken' ? 'Withhold Taken' : 'Withhold Received'
    const rows = sorted.map(v => {
      const wht = getWhtAmount(v); const net = getNetPayment(v)
      return `<tr><td>${formatDate(v.date)}</td><td>${v.companyName}</td><td>${v.tinNumber||''}</td>
        <td>${v.fsNumber||''}</td><td>${v.invoiceNumber||''}</td><td>${v.itemDescription||''}</td>
        <td style="text-align:right">${formatCurrency(v.amount)}</td>
        <td style="text-align:center">${getRate(v)}%</td>
        <td style="text-align:right">${formatCurrency(wht)}</td>
        <td style="text-align:right">${formatCurrency(net)}</td></tr>`
    }).join('')
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>${label} Report</title>
      <style>body{font-family:Arial;padding:20px;color:#333}
      table{border-collapse:collapse;width:100%;margin-top:10px;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px;text-align:left}
      th{background:#1e3a5f;color:#fff}h1{color:#1e3a5f;font-size:20px}
      .sign{display:flex;justify-content:space-between;margin-top:30px}
    </style></head><body>
      <h1>${data.settings?.companyName || 'Company Name'}</h1>
      <p>TIN: ${data.settings?.tinNumber || 'N/A'} | Period: ${monthFilter || yearFilter || 'All'}</p>
      <h2>${label}</h2>
      <table><thead><tr><th>Date</th><th>Company</th><th>TIN</th><th>FS#</th><th>Invoice</th><th>Description</th><th>Amount</th><th>Rate</th><th>WHT</th><th>Net</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p><strong>Total Records: ${sorted.length} | Total WHT: ${formatCurrency(sorted.reduce((s,v)=>s+getWhtAmount(v),0))}</strong></p>
      <div class="sign"><div>Prepared By: _________________</div><div>Approved By: _________________</div></div>
      <p style="font-size:11px;color:#999;margin-top:15px">Generated: ${new Date().toLocaleString()}</p>
    </body></html>`)
    w.document.close(); w.print()
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Max 10MB.'); return }
    const ext = file.name.split('.').pop().toLowerCase()
    const reader = new FileReader()
    reader.onload = (ev) => {
      let headers = [], rows = []
      if (ext === 'csv') { const p = parseCSV(ev.target.result); headers = p.headers; rows = p.rows }
      else if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (json.length > 0) { headers = json[0].map(h => String(h).trim()); rows = json.slice(1).filter(r => r.some(c => String(c).trim())) }
      } else { alert('Unsupported format.'); return }
      if (!headers.length || !rows.length) { alert('No data found.'); return }
      setImportData(prev => ({ ...prev, headers, rows, mapped: autoDetectColumns(headers), preview: [], validCount: 0, invalidCount: 0, totalAmount: 0, totalWht: 0, netAmount: 0, warnings: [] }))
      setImportStep('mapping')
    }
    if (ext === 'xlsx' || ext === 'xls') reader.readAsBinaryString(file)
    else reader.readAsText(file)
  }

  function processImport() {
    const { headers, rows, mapped } = importData
    const ci = (f) => { const n = mapped[f]; return n ? headers.indexOf(n) : -1 }
    const preview = []; let vc = 0, ic = 0, tAmt = 0, tWht = 0, tNet = 0
    const warnings = []
    rows.forEach((row, i) => {
      const date = parseDate(row[ci('date')]) || ''
      const companyName = (row[ci('companyName')] || '').trim()
      const tinNumber = (row[ci('tinNumber')] || '').trim()
      const fsNumber = (row[ci('fsNumber')] || '').trim()
      const invoiceNumber = (row[ci('invoiceNumber')] || '').trim()
      const description = (row[ci('description')] || '').trim()
      const amountVal = parseFloat(String(row[ci('amount')] || '').replace(/[^0-9.-]/g, ''))
      const rateVal = parseFloat(String(row[ci('rate')] || '').replace(/[^0-9.]/g, '')) || 3
      const notes = (row[ci('notes')] || '').trim()
      const errs = []
      if (!date) errs.push('Invalid date')
      if (!companyName) errs.push('Missing company')
      if (!tinNumber) errs.push('Missing TIN')
      if (!amountVal || amountVal <= 0) errs.push('Invalid amount')
      const wht = amountVal > 0 ? amountVal * (rateVal / 100) : 0
      const net = amountVal > 0 ? amountVal - wht : 0
      preview.push({ row: i+2, date, companyName, tinNumber, fsNumber, invoiceNumber, description, amount: amountVal, rate: rateVal, wht, net, notes, valid: errs.length === 0, errors: errs })
      if (errs.length === 0) { vc++; tAmt += amountVal; tWht += wht; tNet += net }
      else ic++
      errs.forEach(e => warnings.push(`Row ${i+2}: ${e}`))
    })
    setImportData(prev => ({ ...prev, preview, validCount: vc, invalidCount: ic, totalAmount: tAmt, totalWht: tWht, netAmount: tNet, warnings }))
    setImportStep('preview')
  }

  function confirmImport() {
    const { preview, validCount } = importData
    const importer = tab === 'taken' ? addWithholdTaken : addWithholdGiven
    let imported = 0
    preview.filter(p => p.valid).forEach(p => {
      importer({ date: p.date, companyName: p.companyName, tinNumber: p.tinNumber, fsNumber: p.fsNumber, invoiceNumber: p.invoiceNumber, itemDescription: p.description, amount: p.amount, rate: p.rate, notes: p.notes })
      imported++
    })
    addWhtImportLog({ type: tab, filename: fileRef.current?.files?.[0]?.name || 'unknown', totalRows: preview.length, imported, skipped: preview.length - imported })
    addWhtAuditLog({ action: 'import', type: tab, description: `Imported ${imported} records from ${fileRef.current?.files?.[0]?.name || 'unknown'}`, details: `${imported} valid / ${preview.length - imported} skipped` })
    setImportModal(false); setImportStep('upload')
    alert(`Imported ${imported} of ${preview.length} rows.`)
  }

  const monthlySummary = useMemo(() => {
    const map = {}
    const all = [...takenList.map(v => ({ ...v, type: 'taken' })), ...receivedList.map(v => ({ ...v, type: 'received' }))]
    all.forEach(v => {
      const m = v.date ? v.date.slice(0, 7) : 'Unknown'
      if (!map[m]) map[m] = { taken: 0, takenWht: 0, received: 0, receivedWht: 0, count: 0 }
      const amt = parseFloat(v.amount || 0); const wht = amt * (parseFloat(v.rate || 3) / 100)
      map[m].count++
      if (v.type === 'taken') { map[m].taken += amt; map[m].takenWht += wht }
      else { map[m].received += amt; map[m].receivedWht += wht }
    })
    return Object.entries(map).sort().map(([month, vals]) => ({
      month, ...vals, netWht: vals.receivedWht - vals.takenWht,
      status: vals.receivedWht - vals.takenWht >= 0 ? 'Credit' : 'Payable',
    }))
  }, [takenList, receivedList])

  const chartLabels = monthlySummary.map(m => m.month)
  const takenChart = { labels: chartLabels, datasets: [{ label: 'WHT Taken', data: monthlySummary.map(m => m.takenWht), backgroundColor: '#EF4444', borderRadius: 4 }] }
  const receivedChart = { labels: chartLabels, datasets: [{ label: 'WHT Received', data: monthlySummary.map(m => m.receivedWht), backgroundColor: '#10B981', borderRadius: 4 }] }
  const netWhtChart = { labels: chartLabels, datasets: [{ label: 'Net Position', data: monthlySummary.map(m => m.netWht), borderColor: '#F59E0B', backgroundColor: '#F59E0B33', fill: true, tension: 0.3 }] }
  const creditChart = { labels: chartLabels, datasets: [
    { label: 'Taken', data: monthlySummary.map(m => m.takenWht), backgroundColor: '#EF4444', borderRadius: 4 },
    { label: 'Received', data: monthlySummary.map(m => m.receivedWht), backgroundColor: '#3B82F6', borderRadius: 4 },
  ]}

  const cardClass = "bg-card border border-border rounded-xl p-4"

  function SortIcon({ field }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="inline ml-1 opacity-40" />
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function renderTable() {
    return (
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('date')}>Date<SortIcon field="date" /></th>
              <th className="text-left p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('company')}>{tab === 'taken' ? 'Supplier' : 'Customer'}<SortIcon field="company" /></th>
              <th className="text-left p-3">TIN</th>
              <th className="text-left p-3">FS #</th>
              <th className="text-left p-3">Invoice</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('amount')}>Amount<SortIcon field="amount" /></th>
              <th className="text-center p-3">WHT %</th>
              <th className="text-right p-3">WHT Amount</th>
              <th className="text-right p-3">{tab === 'taken' ? 'Net Payment' : 'Amount Received'}</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(v => {
              const rate = getRate(v); const wht = getWhtAmount(v); const net = getNetPayment(v)
              return (
                <tr key={v.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 whitespace-nowrap">{formatDate(v.date)}</td>
                  <td className="p-3 font-medium">{v.companyName}</td>
                  <td className="p-3 text-muted text-xs">{v.tinNumber}</td>
                  <td className="p-3 text-muted text-xs">{v.fsNumber}</td>
                  <td className="p-3 text-muted text-xs">{v.invoiceNumber}</td>
                  <td className="p-3 max-w-[140px] truncate text-xs" title={v.itemDescription}>{v.itemDescription}</td>
                  <td className="p-3 text-right">{formatCurrency(v.amount)}</td>
                  <td className="p-3 text-center text-xs">{rate}%</td>
                  <td className="p-3 text-right text-warning">{formatCurrency(wht)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(net)}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openView(v)} className="p-1 text-muted hover:text-primary" title="View"><Eye size={14} /></button>
                      <button onClick={() => openEdit(v)} className="p-1 text-muted hover:text-primary" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(v.id)} className="p-1 text-muted hover:text-danger" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {paged.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-muted">No {tab === 'taken' ? 'withhold taken' : 'withhold received'} records</td></tr>}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border text-sm text-muted">
            <span>{sorted.length} records · Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p-1))} className={`p-1 rounded ${page <= 1 ? 'opacity-30' : 'hover:text-white'}`}><ChevronLeft size={16} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className={`p-1 rounded ${page >= totalPages ? 'opacity-30' : 'hover:text-white'}`}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Withholding Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border border-l-4 border-l-red-500 rounded-xl p-3">
          <p className="text-xs text-muted">Total WHT Taken</p>
          <p className="text-lg font-bold text-danger">{formatCurrency(totalTakenWht)}</p>
          <p className="text-xs text-muted mt-1">From {takenList.length} transactions</p>
        </div>
        <div className="bg-card border border-border border-l-4 border-l-green-500 rounded-xl p-3">
          <p className="text-xs text-muted">Total WHT Received</p>
          <p className="text-lg font-bold text-success">{formatCurrency(totalReceivedWht)}</p>
          <p className="text-xs text-muted mt-1">From {receivedList.length} transactions</p>
        </div>
        <div className={`bg-card border border-border border-l-4 rounded-xl p-3 ${netWht >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <p className="text-xs text-muted">Net WHT Position</p>
          <p className={`text-lg font-bold ${netWht >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(Math.abs(netWht))}
            <span className="text-xs ml-1">{netWht >= 0 ? 'Credit' : 'Payable'}</span>
          </p>
        </div>
        <div className="bg-card border border-border border-l-4 border-l-blue-500 rounded-xl p-3">
          <p className="text-xs text-muted">Total Transactions</p>
          <p className="text-lg font-bold">{takenList.length + receivedList.length}</p>
          <p className="text-xs text-muted mt-1">{takenList.length} Taken · {receivedList.length} Received</p>
        </div>
      </div>

      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border w-fit">
        {['taken','received','summary','audit'].map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
            {t === 'taken' ? 'Withhold Taken' : t === 'received' ? 'Withhold Received' : t === 'summary' ? 'Monthly Summary' : 'History & Audit'}
          </button>
        ))}
      </div>

      {(tab === 'taken' || tab === 'received') && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Search company, TIN, invoice..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" />
            </div>
            <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1) }}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1) }}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white w-40" />
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
            <span className="text-muted text-sm">-</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={handleExportCSV} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="CSV"><Download size={16} /></button>
              <button onClick={handleExportExcel} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Excel"><FileSpreadsheet size={16} /></button>
              <button onClick={handlePrintReport} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Print"><Printer size={16} /></button>
              <button onClick={() => {
                if (confirm(`Delete ALL ${tab === 'taken' ? 'withhold taken' : 'withhold received'} records? This cannot be undone.`)) {
                  if (confirm('Are you sure?')) {
                    const c = tab === 'taken' ? clearWithholdTaken : clearWithholdGiven
                    c()
                    addWhtAuditLog({ action: 'delete_all', type: tab, description: `Deleted all ${tab} records`, details: `${currentList.length} records removed` })
                  }
                }
              }} className="flex items-center gap-1.5 bg-danger/10 border border-danger/30 text-danger px-3 py-2 rounded-lg text-sm hover:bg-danger/20">
                <Trash2 size={15} /> Delete All
              </button>
              <button onClick={() => { setImportStep('upload'); setImportModal(true) }}
                className="flex items-center gap-1.5 bg-card border border-border text-white px-3 py-2 rounded-lg text-sm hover:bg-white/5">
                <Upload size={15} /> Import WHT Data
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                <Plus size={15} /> New WHT Record
              </button>
            </div>
          </div>
          {renderTable()}
        </>
      )}

      {tab === 'summary' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Monthly WHT Taken Trend</h2>
              {chartLabels.length > 0 ? <Bar data={takenChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
            <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Monthly WHT Received Trend</h2>
              {chartLabels.length > 0 ? <Bar data={receivedChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
            <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Taken vs Received</h2>
              {chartLabels.length > 0 ? <Bar data={creditChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
            <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Net Position Trend</h2>
              {chartLabels.length > 0 ? <Line data={netWhtChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left p-3">Month</th>
                  <th className="text-right p-3">WHT Taken</th>
                  <th className="text-right p-3">WHT Received</th>
                  <th className="text-right p-3">Net Position</th>
                  <th className="text-right p-3">Transactions</th>
                  <th className="text-center p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map(m => (
                  <tr key={m.month} className="border-b border-border/50 hover:bg-white/5">
                    <td className="p-3 font-medium">{formatMonth(m.month)}</td>
                    <td className="p-3 text-right text-danger">{formatCurrency(m.takenWht)}</td>
                    <td className="p-3 text-right text-success">{formatCurrency(m.receivedWht)}</td>
                    <td className={`p-3 text-right font-medium ${m.netWht >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(Math.abs(m.netWht))}</td>
                    <td className="p-3 text-right">{m.count}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'Credit' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>{m.status}</span>
                    </td>
                  </tr>
                ))}
                {monthlySummary.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted">No withholding data</td></tr>}
              </tbody>
              {monthlySummary.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border font-medium">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right text-danger">{formatCurrency(monthlySummary.reduce((s,m) => s + m.takenWht, 0))}</td>
                    <td className="p-3 text-right text-success">{formatCurrency(monthlySummary.reduce((s,m) => s + m.receivedWht, 0))}</td>
                    <td className="p-3 text-right">{formatCurrency(Math.abs(monthlySummary.reduce((s,m) => s + m.netWht, 0)))}</td>
                    <td className="p-3 text-right">{monthlySummary.reduce((s,m) => s + m.count, 0)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}

      {tab === 'audit' && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left p-3">Timestamp</th>
                <th className="text-left p-3">Action</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {[...auditLog].reverse().map((log, i) => (
                <tr key={log.id || i} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.action === 'create' ? 'bg-success/10 text-success' :
                      log.action === 'edit' ? 'bg-primary/10 text-primary' :
                      log.action === 'delete' ? 'bg-danger/10 text-danger' :
                      log.action === 'import' ? 'bg-warning/10 text-warning' : 'bg-muted/10 text-muted'
                    }`}>{log.action}</span>
                  </td>
                  <td className="p-3 text-xs capitalize">{log.type}</td>
                  <td className="p-3 text-xs max-w-[200px] truncate" title={log.description}>{log.description}</td>
                  <td className="p-3 text-xs text-muted max-w-[200px] truncate" title={log.details}>{log.details}</td>
                </tr>
              ))}
              {auditLog.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted">No audit log entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit WHT Record' : 'New Withholding Record'} size="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm text-muted">Date <span className="text-danger">*</span></label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">Transaction Type</label>
              <input type="text" value={tab === 'taken' ? 'Withhold Taken' : 'Withhold Received'} readOnly
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white/60 cursor-not-allowed" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">{tab === 'taken' ? 'Supplier' : 'Customer'} Name <span className="text-danger">*</span></label>
              <input type="text" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})}
                placeholder={tab === 'taken' ? 'Supplier name' : 'Customer name'}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
              {errors.companyName && <p className="text-danger text-xs mt-1">{errors.companyName}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">TIN Number <span className="text-danger">*</span></label>
              <input type="text" value={form.tinNumber} onChange={e => setForm({...form, tinNumber: e.target.value})} placeholder="0012345678"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
              {errors.tinNumber && <p className="text-danger text-xs mt-1">{errors.tinNumber}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">FS Number</label>
              <input type="text" value={form.fsNumber} onChange={e => setForm({...form, fsNumber: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">Invoice Number</label>
              <input type="text" value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">Amount Before WHT (ETB) <span className="text-danger">*</span></label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
              {errors.amount && <p className="text-danger text-xs mt-1">{errors.amount}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">Withholding Rate <span className="text-danger">*</span></label>
              <select value={form.rate} onChange={e => setForm({...form, rate: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                {RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            {form.rate === 'custom' && (
              <div className="space-y-1">
                <label className="block text-sm text-muted">Custom Rate (%)</label>
                <input type="number" step="0.1" value={form.customRate} onChange={e => setForm({...form, customRate: e.target.value})}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-muted">Item / Description <span className="text-danger">*</span></label>
            <textarea value={form.itemDescription} onChange={e => setForm({...form, itemDescription: e.target.value})}
              placeholder="Service description, material, etc." rows={2}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
            {errors.itemDescription && <p className="text-danger text-xs mt-1">{errors.itemDescription}</p>}
          </div>
          {parseFloat(form.amount) > 0 && (
            <div className="bg-bg border border-border rounded-lg p-4 grid grid-cols-3 gap-4">
              <div><p className="text-xs text-muted">Amount Before WHT</p><p className="text-sm font-medium">{formatCurrency(form.amount)}</p></div>
              <div><p className="text-xs text-muted">Rate</p><p className="text-sm font-medium">{form.rate === 'custom' ? (parseFloat(form.customRate) || 0) : form.rate}%</p></div>
              <div><p className="text-xs text-muted">WHT Amount</p><p className="text-sm font-medium text-warning">{formatCurrency(parseFloat(form.amount || 0) * (form.rate === 'custom' ? (parseFloat(form.customRate) || 0) : (parseFloat(form.rate) || 3)) / 100)}</p></div>
              <div className="col-span-3"><p className="text-xs text-muted">Net Payment / Amount Received</p><p className="text-sm font-bold text-success">{formatCurrency(parseFloat(form.amount || 0) * (1 - (form.rate === 'custom' ? (parseFloat(form.customRate) || 0) : (parseFloat(form.rate) || 3)) / 100))}</p></div>
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-sm text-muted">Notes (Optional)</label>
            <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">{editId ? 'Update' : 'Save'} Record</button>
          </div>
        </form>
      </Modal>

      <Modal open={viewModal} onClose={() => setViewModal(false)} title="Withholding Details" size="max-w-md">
        {viewItem && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted">Date</span><br/><span className="font-medium">{formatDate(viewItem.date)}</span></div>
              <div><span className="text-muted">Type</span><br/>{tab === 'taken' ? 'Withhold Taken' : 'Withhold Received'}</div>
              <div className="col-span-2"><span className="text-muted">Company</span><br/><span className="font-medium">{viewItem.companyName}</span></div>
              <div><span className="text-muted">TIN Number</span><br/>{viewItem.tinNumber}</div>
              <div><span className="text-muted">FS Number</span><br/>{viewItem.fsNumber || '-'}</div>
              <div><span className="text-muted">Invoice Number</span><br/>{viewItem.invoiceNumber || '-'}</div>
              <div><span className="text-muted">Amount</span><br/>{formatCurrency(viewItem.amount)}</div>
              <div><span className="text-muted">WHT Rate</span><br/>{getRate(viewItem)}%</div>
              <div><span className="text-muted">WHT Amount</span><br/><span className="text-warning">{formatCurrency(getWhtAmount(viewItem))}</span></div>
              <div><span className="text-muted">{tab === 'taken' ? 'Net Payment' : 'Amount Received'}</span><br/><span className="text-success font-medium">{formatCurrency(getNetPayment(viewItem))}</span></div>
            </div>
            <div><span className="text-muted">Description</span><br/>{viewItem.itemDescription}</div>
            {viewItem.notes && <div><span className="text-muted">Notes</span><br/>{viewItem.notes}</div>}
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewModal(false)} className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-muted hover:text-white">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={importModal} onClose={() => { setImportModal(false); setImportStep('upload') }} title="Import WHT Data" size="max-w-3xl">
        {importStep === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Upload size={40} className="mx-auto text-muted mb-3" />
              <p className="text-muted">Click to upload or drag & drop</p>
              <p className="text-xs text-muted mt-1">CSV or XLSX files up to 10MB</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            </div>
          </div>
        )}
        {importStep === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Map columns ({importData.headers.length} columns, {importData.rows.length} rows):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries({
                date: 'Date *', companyName: 'Company Name *', tinNumber: 'TIN Number *',
                fsNumber: 'FS Number', invoiceNumber: 'Invoice Number', description: 'Description *',
                amount: 'Amount *', rate: 'WHT Rate (%)', notes: 'Notes',
              }).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs text-muted">{label}</label>
                  <select value={importData.mapped[field] || ''} onChange={e => setImportData(prev => ({...prev, mapped: {...prev.mapped, [field]: e.target.value}}))}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-white">
                    <option value="">- Skip -</option>
                    {importData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setImportStep('upload')} className="px-4 py-2 text-sm text-muted hover:text-white">Back</button>
              <button onClick={processImport} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Process</button>
            </div>
          </div>
        )}
        {importStep === 'preview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Valid</p><p className="text-sm font-bold text-success">{importData.validCount}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Invalid</p><p className="text-sm font-bold text-danger">{importData.invalidCount}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Total WHT</p><p className="text-sm font-bold text-warning">{formatCurrency(importData.totalWht)}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Net Amount</p><p className="text-sm font-bold">{formatCurrency(importData.netAmount)}</p></div>
            </div>
            {importData.warnings.length > 0 && (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 max-h-24 overflow-y-auto">
                {importData.warnings.slice(0,10).map((w,i) => <p key={i} className="text-xs text-warning flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}</p>)}
                {importData.warnings.length > 10 && <p className="text-xs text-muted mt-1">...and {importData.warnings.length - 10} more</p>}
              </div>
            )}
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="bg-bg text-muted sticky top-0">
                  <th className="p-2 text-left">#</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Company</th>
                  <th className="p-2 text-left">TIN</th><th className="p-2 text-left">Amount</th><th className="p-2 text-center">Rate</th>
                  <th className="p-2 text-right">WHT</th><th className="p-2 text-right">Net</th><th className="p-2 text-center">Status</th>
                </tr></thead>
                <tbody>
                  {importData.preview.map((p, i) => (
                    <tr key={i} className={`border-t border-border/30 ${p.valid ? '' : 'bg-danger/5'}`}>
                      <td className="p-2">{p.row}</td>
                      <td className="p-2">{p.date}</td>
                      <td className="p-2">{p.companyName}</td>
                      <td className="p-2">{p.tinNumber}</td>
                      <td className="p-2 text-right">{p.amount ? formatCurrency(p.amount) : '-'}</td>
                      <td className="p-2 text-center">{p.rate}%</td>
                      <td className="p-2 text-right text-warning">{p.wht ? formatCurrency(p.wht) : '-'}</td>
                      <td className="p-2 text-right">{p.net ? formatCurrency(p.net) : '-'}</td>
                      <td className="p-2 text-center">{p.valid ? <span className="text-success text-xs">✓</span> : <span className="text-danger text-xs" title={p.errors.join(', ')}>✗</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setImportStep('mapping')} className="px-4 py-2 text-sm text-muted hover:text-white">Back</button>
              <button onClick={confirmImport} disabled={importData.validCount === 0}
                className={`px-6 py-2 rounded-lg text-sm font-medium ${importData.validCount > 0 ? 'bg-success text-white hover:bg-success/90' : 'bg-muted/30 text-muted cursor-not-allowed'}`}>
                Import {importData.validCount} Records
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
