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
  Upload, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown, X
} from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

const chartOpts = {
  responsive: true,
  plugins: { legend: { labels: { color: '#94A3B8' } } },
  scales: { x: { ticks: { color: '#94A3B8' } }, y: { ticks: { color: '#94A3B8' } } },
}

const PAGE_SIZE = 20

function autoDetectColumns(headers) {
  const map = { date: '', companyName: '', tinNumber: '', fsNumber: '', invoiceNumber: '', description: '', amountBeforeVat: '', notes: '' }
  const lower = headers.map(h => String(h).toLowerCase().trim())
  lower.forEach((h, i) => {
    if (/\bdate\b/.test(h)) map.date = headers[i]
    else if (/(company|customer|supplier|name|client)/.test(h) && !/(tin|fs|invoice)/.test(h)) map.companyName = headers[i]
    else if (/\btin\b/.test(h) || /t\.?i\.?n/.test(h)) map.tinNumber = headers[i]
    else if (/\bfs\b/.test(h) || /fiscal/.test(h)) map.fsNumber = headers[i]
    else if (/(invoice|inv|receipt|ref)/.test(h)) map.invoiceNumber = headers[i]
    else if (/(description|item|product|service|detail)/.test(h)) map.description = headers[i]
    else if (/(amount|before\s*vat|excl|net|subtotal)/.test(h)) map.amountBeforeVat = headers[i]
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
    const vals = []
    let cur = '', inQuote = false
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

export default function VatReports() {
  const { data, companyData, addVatSale, editVatSale, deleteVatSale, clearVatSales, addVatPurchase, editVatPurchase, deleteVatPurchase, clearVatPurchases, addVatImportLog } = useStore()
  const vatRate = (data.settings?.vatRate || 15) / 100

  const [tab, setTab] = useState('sales')
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
  const [salesMode, setSalesMode] = useState(true)
  const [viewItem, setViewItem] = useState(null)
  const [viewModal, setViewModal] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    date: today(), customerName: '', supplierName: '', companyName: '', tinNumber: '',
    fsNumber: '', invoiceNumber: '', itemDescription: '', amountBeforeVat: '', notes: '',
  })

  const [importModal, setImportModal] = useState(false)
  const [importStep, setImportStep] = useState('upload')
  const [importData, setImportData] = useState({ headers: [], rows: [], mapped: {}, preview: [], validCount: 0, invalidCount: 0, totalAmount: 0, totalVat: 0, grandTotal: 0, warnings: [] })
  const [importType, setImportType] = useState('sales')
  const fileRef = useRef(null)

  const salesList = companyData.vatSales || []
  const purchaseList = companyData.vatPurchases || []

  const currentList = tab === 'sales' ? salesList : purchaseList

  const years = useMemo(() => {
    const s = new Set()
    currentList.forEach(v => { if (v.date) s.add(v.date.slice(0, 4)) })
    s.add(new Date().getFullYear().toString())
    return [...s].sort().reverse()
  }, [currentList])

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = useMemo(() => {
    let items = [...currentList]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(v =>
        (v.companyName || v.customerName || v.supplierName || '')?.toLowerCase().includes(q) ||
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
      else if (sortField === 'company') cmp = ((a.companyName || a.customerName || a.supplierName || '') + '').localeCompare((b.companyName || b.customerName || b.supplierName || '') + '')
      else if (sortField === 'amount') cmp = (parseFloat(a.amountBeforeVat || 0)) - (parseFloat(b.amountBeforeVat || 0))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return items
  }, [currentList, search, yearFilter, monthFilter, dateFrom, dateTo, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalOutputBeforeVat = salesList.reduce((s, v) => s + (parseFloat(v.amountBeforeVat || 0)), 0)
  const totalInputBeforeVat = purchaseList.reduce((s, v) => s + (parseFloat(v.amountBeforeVat || 0)), 0)
  const totalOutputVat = totalOutputBeforeVat * vatRate
  const totalInputVat = totalInputBeforeVat * vatRate
  const netVat = totalOutputVat - totalInputVat

  function resetForm() {
    setEditId(null); setErrors({})
    setForm({ date: today(), customerName: '', supplierName: '', companyName: '', tinNumber: '', fsNumber: '', invoiceNumber: '', itemDescription: '', amountBeforeVat: '', notes: '' })
  }

  function openAdd(sales) {
    setSalesMode(sales)
    resetForm()
    setModal(true)
  }

  function openEdit(item, sales) {
    setSalesMode(sales)
    setEditId(item.id); setErrors({})
    setForm({
      date: item.date, customerName: item.customerName || '', supplierName: item.supplierName || '',
      companyName: item.companyName || '', tinNumber: item.tinNumber || '',
      fsNumber: item.fsNumber || '', invoiceNumber: item.invoiceNumber || '',
      itemDescription: item.itemDescription || '', amountBeforeVat: item.amountBeforeVat, notes: item.notes || '',
    })
    setModal(true)
  }

  function openView(item) { setViewItem(item); setViewModal(true) }

  function getDisplayName(item) {
    return item.companyName || item.customerName || item.supplierName || ''
  }

  function validate() {
    const e = {}
    if (!form.tinNumber.trim()) e.tinNumber = 'TIN Number is required'
    if (!form.fsNumber.trim()) e.fsNumber = 'FS Number is required'
    const name = form.companyName.trim()
    if (!name) e.companyName = 'Company name is required'
    if (!form.itemDescription.trim()) e.itemDescription = 'Description is required'
    const amt = parseFloat(form.amountBeforeVat)
    if (!amt || amt <= 0) e.amountBeforeVat = 'Amount must be greater than 0'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const payload = { ...form, amountBeforeVat: parseFloat(form.amountBeforeVat) }
    if (salesMode) {
      if (editId) editVatSale(editId, payload)
      else addVatSale(payload)
    } else {
      if (editId) editVatPurchase(editId, payload)
      else addVatPurchase(payload)
    }
    setModal(false)
  }

  function handleExportExcel() {
    const d = sorted.map(v => ({
      Date: v.date, Company: getDisplayName(v), 'TIN Number': v.tinNumber,
      'FS Number': v.fsNumber, 'Invoice Number': v.invoiceNumber,
      Description: v.itemDescription, 'Amount Before VAT': v.amountBeforeVat,
      'VAT (15%)': (parseFloat(v.amountBeforeVat || 0) * vatRate).toFixed(2),
      'Grand Total': (parseFloat(v.amountBeforeVat || 0) * (1 + vatRate)).toFixed(2),
    }))
    exportToExcel(d, `vat-${tab}-transactions`)
  }

  function handleExportCSV() {
    const d = sorted.map(v => ({
      Date: v.date, Company: getDisplayName(v), 'TIN Number': v.tinNumber,
      'FS Number': v.fsNumber, 'Invoice Number': v.invoiceNumber,
      Description: v.itemDescription, 'Amount Before VAT': v.amountBeforeVat,
      'VAT (15%)': (parseFloat(v.amountBeforeVat || 0) * vatRate).toFixed(2),
      'Grand Total': (parseFloat(v.amountBeforeVat || 0) * (1 + vatRate)).toFixed(2),
    }))
    exportToCSV(d, `vat-${tab}-transactions`)
  }

  function handlePrintRow(item) {
    const vt = (parseFloat(item.amountBeforeVat || 0) * vatRate).toFixed(2)
    const gt = (parseFloat(item.amountBeforeVat || 0) * (1 + vatRate)).toFixed(2)
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>VAT Receipt</title>
      <style>body{font-family:Arial;padding:40px;color:#333}
      h2{color:#1e3a5f}.field{margin:10px 0}.label{font-weight:bold;color:#666}
      table{width:100%;border-collapse:collapse;margin-top:15px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
      th{background:#1e3a5f;color:#fff}
    </style></head><body>
      <h2>${data.settings?.companyName || 'Company'}</h2>
      <p>TIN: ${data.settings?.tinNumber || 'N/A'}</p>
      <table><tr><th colspan="2">VAT Transaction Details</th></tr>
      <tr><td class="label">Date</td><td>${formatDate(item.date)}</td></tr>
      <tr><td class="label">Company</td><td>${getDisplayName(item)}</td></tr>
      <tr><td class="label">TIN Number</td><td>${item.tinNumber || ''}</td></tr>
      <tr><td class="label">FS Number</td><td>${item.fsNumber || ''}</td></tr>
      <tr><td class="label">Invoice Number</td><td>${item.invoiceNumber || ''}</td></tr>
      <tr><td class="label">Description</td><td>${item.itemDescription || ''}</td></tr>
      <tr><td class="label">Amount Before VAT</td><td>${formatCurrency(item.amountBeforeVat)}</td></tr>
      <tr><td class="label">VAT (15%)</td><td>${formatCurrency(vt)}</td></tr>
      <tr><td class="label">Grand Total</td><td><strong>${formatCurrency(gt)}</strong></td></tr></table>
      <div style="margin-top:30px;display:flex;justify-content:space-between">
        <div>Prepared By: _________________</div>
        <div>Approved By: _________________</div>
      </div>
      <p style="margin-top:20px;font-size:11px;color:#999">Generated: ${new Date().toLocaleString()}</p>
    </body></html>`)
    w.document.close(); w.print()
  }

  function handlePrintReport() {
    const w = window.open('', '_blank')
    const rows = sorted.map(v => {
      const vt = (parseFloat(v.amountBeforeVat || 0) * vatRate).toFixed(2)
      const gt = (parseFloat(v.amountBeforeVat || 0) + parseFloat(vt)).toFixed(2)
      return `<tr><td>${formatDate(v.date)}</td><td>${getDisplayName(v)}</td>
        <td>${v.tinNumber || ''}</td><td>${v.fsNumber || ''}</td>
        <td>${v.invoiceNumber || ''}</td><td>${v.itemDescription || ''}</td>
        <td style="text-align:right">${formatCurrency(v.amountBeforeVat)}</td>
        <td style="text-align:right">${formatCurrency(vt)}</td>
        <td style="text-align:right">${formatCurrency(gt)}</td></tr>`
    }).join('')
    const label = tab === 'sales' ? 'Sales' : 'Purchases'
    w.document.write(`<html><head><title>VAT ${label} Report</title>
      <style>body{font-family:Arial;padding:20px;color:#333}
      table{border-collapse:collapse;width:100%;margin-top:10px;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px;text-align:left}
      th{background:#1e3a5f;color:#fff}
      h1{color:#1e3a5f;font-size:20px}
      .sign{display:flex;justify-content:space-between;margin-top:30px}
    </style></head><body>
      <h1>${data.settings?.companyName || 'Company Name'}</h1>
      <p>TIN: ${data.settings?.tinNumber || 'N/A'} | Period: ${monthFilter || yearFilter || 'All'}</p>
      <h2>VAT ${label} Transactions</h2>
      <table><thead><tr><th>Date</th><th>Company</th><th>TIN</th><th>FS#</th><th>Invoice</th><th>Description</th><th>Before VAT</th><th>VAT</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="margin-top:10px"><strong>Total Records: ${sorted.length} | Total VAT: ${formatCurrency(sorted.reduce((s,v) => s + (parseFloat(v.amountBeforeVat||0) * vatRate), 0))}</strong></p>
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
      if (ext === 'csv') {
        const parsed = parseCSV(ev.target.result)
        headers = parsed.headers; rows = parsed.rows
      } else if (ext === 'xlsx' || ext === 'xls') {
        const wb = XLSX.read(ev.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
        if (json.length > 0) { headers = json[0].map(h => String(h).trim()); rows = json.slice(1).filter(r => r.some(c => String(c).trim())) }
      } else { alert('Unsupported file format. Use CSV or XLSX.'); return }
      if (headers.length === 0 || rows.length === 0) { alert('No data found in file.'); return }
      setImportData(prev => ({ ...prev, headers, rows, mapped: autoDetectColumns(headers), preview: [], validCount: 0, invalidCount: 0, totalAmount: 0, totalVat: 0, grandTotal: 0, warnings: [] }))
      setImportStep('mapping')
    }
    if (ext === 'xlsx' || ext === 'xls') reader.readAsBinaryString(file)
    else reader.readAsText(file)
  }

  function handleMappingChange(field, value) {
    setImportData(prev => ({ ...prev, mapped: { ...prev.mapped, [field]: value } }))
  }

  function processImport() {
    const { headers, rows, mapped } = importData
    const colIdx = (field) => {
      const name = mapped[field]
      return name ? headers.indexOf(name) : -1
    }
    const preview = []; let validCount = 0, invalidCount = 0, totalAmt = 0, totalVt = 0, grandTot = 0
    const warnings = []
    const existingFs = new Set(currentList.map(v => v.fsNumber).filter(Boolean))
    const existingInv = new Set(currentList.map(v => v.invoiceNumber).filter(Boolean))
    rows.forEach((row, i) => {
      const date = parseDate(row[colIdx('date')]) || ''
      const companyName = (row[colIdx('companyName')] || '').trim()
      const tinNumber = (row[colIdx('tinNumber')] || '').trim()
      const fsNumber = (row[colIdx('fsNumber')] || '').trim()
      const invoiceNumber = (row[colIdx('invoiceNumber')] || '').trim()
      const description = (row[colIdx('description')] || '').trim()
      const amountVal = parseFloat(String(row[colIdx('amountBeforeVat')] || '').replace(/[^0-9.-]/g, ''))
      const notes = (row[colIdx('notes')] || '').trim()
      const rowErrors = []
      if (!date) rowErrors.push('Invalid date')
      if (!tinNumber) rowErrors.push('Missing TIN')
      if (!fsNumber) rowErrors.push('Missing FS')
      if (existingFs.has(fsNumber) && existingInv.has(invoiceNumber)) rowErrors.push('Duplicate FS+Invoice')
      if (!amountVal || amountVal <= 0) rowErrors.push('Invalid amount')
      const vt = amountVal > 0 ? amountVal * vatRate : 0
      const gt = amountVal > 0 ? amountVal + vt : 0
      preview.push({
        row: i + 2, date, companyName, tinNumber, fsNumber, invoiceNumber, description,
        amountBeforeVat: amountVal, notes, vat: vt, grandTotal: gt,
        valid: rowErrors.length === 0, errors: rowErrors,
      })
      if (rowErrors.length === 0) { validCount++; totalAmt += amountVal; totalVt += vt; grandTot += gt }
      else invalidCount++
      rowErrors.forEach(e => warnings.push(`Row ${i + 2}: ${e}`))
    })
    setImportData(prev => ({ ...prev, preview, validCount, invalidCount, totalAmount: totalAmt, totalVat: totalVt, grandTotal: grandTot, warnings }))
    setImportStep('preview')
  }

  function confirmImport() {
    const { preview, validCount } = importData
    const importer = importType === 'sales' ? addVatSale : addVatPurchase
    let imported = 0
    preview.filter(p => p.valid).forEach(p => {
      importer({
        date: p.date, companyName: p.companyName, tinNumber: p.tinNumber,
        fsNumber: p.fsNumber, invoiceNumber: p.invoiceNumber,
        itemDescription: p.description, amountBeforeVat: p.amountBeforeVat, notes: p.notes,
      })
      imported++
    })
    addVatImportLog({ type: importType, filename: fileRef.current?.files?.[0]?.name || 'unknown', totalRows: preview.length, imported: imported, skipped: preview.length - imported })
    setImportModal(false); setImportStep('upload')
    alert(`Imported ${imported} of ${preview.length} rows successfully.`)
  }

  const monthlySummary = useMemo(() => {
    const map = {}
    const all = [...salesList.map(v => ({ ...v, type: 'sale' })), ...purchaseList.map(v => ({ ...v, type: 'purchase' }))]
    all.forEach(v => {
      const m = v.date ? v.date.slice(0, 7) : 'Unknown'
      if (!map[m]) map[m] = { salesBeforeVat: 0, outputVat: 0, purchasesBeforeVat: 0, inputVat: 0 }
      const bv = parseFloat(v.amountBeforeVat || 0)
      const vt = bv * vatRate
      if (v.type === 'sale') { map[m].salesBeforeVat += bv; map[m].outputVat += vt }
      else { map[m].purchasesBeforeVat += bv; map[m].inputVat += vt }
    })
    return Object.entries(map).sort().map(([month, vals]) => ({
      month, ...vals, netVat: vals.outputVat - vals.inputVat,
      status: vals.outputVat - vals.inputVat >= 0 ? 'Payable' : 'Refundable',
    }))
  }, [salesList, purchaseList, vatRate])

  const chartLabels = monthlySummary.map(m => m.month)
  const salesChart = { labels: chartLabels, datasets: [{ label: 'Sales Before VAT', data: monthlySummary.map(m => m.salesBeforeVat), backgroundColor: '#3B82F6', borderRadius: 4 }] }
  const purchaseChart = { labels: chartLabels, datasets: [{ label: 'Purchases Before VAT', data: monthlySummary.map(m => m.purchasesBeforeVat), backgroundColor: '#10B981', borderRadius: 4 }] }
  const vatChart = { labels: chartLabels, datasets: [
    { label: 'Output VAT', data: monthlySummary.map(m => m.outputVat), backgroundColor: '#3B82F6', borderRadius: 4 },
    { label: 'Input VAT', data: monthlySummary.map(m => m.inputVat), backgroundColor: '#10B981', borderRadius: 4 },
  ]}
  const netVatChart = { labels: chartLabels, datasets: [{ label: 'Net VAT', data: monthlySummary.map(m => m.netVat), borderColor: '#F59E0B', backgroundColor: '#F59E0B33', fill: true, tension: 0.3 }] }
  const yearlyVat = useMemo(() => {
    const yMap = {}
    monthlySummary.forEach(m => {
      const y = m.month.slice(0, 4)
      if (!yMap[y]) yMap[y] = { outputVat: 0, inputVat: 0 }
      yMap[y].outputVat += m.outputVat
      yMap[y].inputVat += m.inputVat
    })
    const yLabels = Object.keys(yMap).sort()
    return { labels: yLabels, datasets: [
      { label: 'Output VAT', data: yLabels.map(y => yMap[y].outputVat), backgroundColor: '#3B82F6', borderRadius: 4 },
      { label: 'Input VAT', data: yLabels.map(y => yMap[y].inputVat), backgroundColor: '#10B981', borderRadius: 4 },
    ]}
  }, [monthlySummary])

  const cardClass = "bg-card border border-border rounded-xl p-4"

  function SortIcon({ field }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="inline ml-1 opacity-40" />
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function renderTable(list) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('date')}>Date<SortIcon field="date" /></th>
              <th className="text-left p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('company')}>Company<SortIcon field="company" /></th>
              <th className="text-left p-3">TIN</th>
              <th className="text-left p-3">FS #</th>
              <th className="text-left p-3">Invoice</th>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white" onClick={() => toggleSort('amount')}>Before VAT<SortIcon field="amount" /></th>
              <th className="text-right p-3">VAT (15%)</th>
              <th className="text-right p-3">Grand Total</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(v => {
              const vt = (parseFloat(v.amountBeforeVat || 0) * vatRate)
              const gt = parseFloat(v.amountBeforeVat || 0) + vt
              return (
                <tr key={v.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 whitespace-nowrap">{formatDate(v.date)}</td>
                  <td className="p-3 font-medium">{getDisplayName(v)}</td>
                  <td className="p-3 text-muted text-xs">{v.tinNumber}</td>
                  <td className="p-3 text-muted text-xs">{v.fsNumber}</td>
                  <td className="p-3 text-muted text-xs">{v.invoiceNumber}</td>
                  <td className="p-3 max-w-[160px] truncate text-xs" title={v.itemDescription}>{v.itemDescription}</td>
                  <td className="p-3 text-right">{formatCurrency(v.amountBeforeVat)}</td>
                  <td className="p-3 text-right text-warning">{formatCurrency(vt)}</td>
                  <td className="p-3 text-right font-medium">{formatCurrency(gt)}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openView(v)} className="p-1 text-muted hover:text-primary" title="View"><Eye size={14} /></button>
                      <button onClick={() => openEdit(v, tab === 'sales')} className="p-1 text-muted hover:text-primary" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => handlePrintRow(v)} className="p-1 text-muted hover:text-primary" title="Print"><Printer size={14} /></button>
                      <button onClick={() => { if (confirm('Delete this record?')) (tab === 'sales' ? deleteVatSale : deleteVatPurchase)(v.id) }} className="p-1 text-muted hover:text-danger" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {paged.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted">No {tab} transactions found</td></tr>}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border text-sm text-muted">
            <span>{sorted.length} records · Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className={`p-1 rounded ${page <= 1 ? 'opacity-30' : 'hover:text-white'}`}><ChevronLeft size={16} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={`p-1 rounded ${page >= totalPages ? 'opacity-30' : 'hover:text-white'}`}><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">VAT Reports</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-card border border-border border-l-4 border-l-blue-500 rounded-xl p-3">
          <p className="text-xs text-muted">Total Sales Before VAT</p>
          <p className="text-lg font-bold">{formatCurrency(totalOutputBeforeVat)}</p>
        </div>
        <div className="bg-card border border-border border-l-4 border-l-purple-500 rounded-xl p-3">
          <p className="text-xs text-muted">Total Output VAT</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(totalOutputVat)}</p>
        </div>
        <div className="bg-card border border-border border-l-4 border-l-green-500 rounded-xl p-3">
          <p className="text-xs text-muted">Total Purchases Before VAT</p>
          <p className="text-lg font-bold">{formatCurrency(totalInputBeforeVat)}</p>
        </div>
        <div className="bg-card border border-border border-l-4 border-l-emerald-500 rounded-xl p-3">
          <p className="text-xs text-muted">Total Input VAT</p>
          <p className="text-lg font-bold text-success">{formatCurrency(totalInputVat)}</p>
        </div>
        <div className={`bg-card border border-border border-l-4 rounded-xl p-3 ${netVat >= 0 ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <p className="text-xs text-muted">Net VAT Position</p>
          <p className={`text-lg font-bold ${netVat >= 0 ? 'text-danger' : 'text-success'}`}>
            {formatCurrency(Math.abs(netVat))}
            <span className="text-xs ml-1">{netVat >= 0 ? 'Payable' : 'Refundable'}</span>
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border w-fit">
        <button onClick={() => { setTab('sales'); setPage(1) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'sales' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>Sales Transactions</button>
        <button onClick={() => { setTab('purchases'); setPage(1) }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'purchases' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>Purchase Transactions</button>
        <button onClick={() => setTab('summary')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'summary' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>Monthly VAT Summary</button>
        <button onClick={() => setTab('analytics')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'analytics' ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>Analytics</button>
      </div>

      {(tab === 'sales' || tab === 'purchases') && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Search company, TIN, FS, invoice, description..." value={search}
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
              <button onClick={handleExportCSV} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Export CSV"><Download size={16} /></button>
              <button onClick={handleExportExcel} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Export Excel"><FileSpreadsheet size={16} /></button>
              <button onClick={handlePrintReport} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Print Report"><Printer size={16} /></button>
              <button onClick={() => {
                if (confirm(`Delete ALL ${tab === 'sales' ? 'sales' : 'purchase'} VAT records? This cannot be undone.`)) {
                  if (confirm('Are you sure?')) {
                    (tab === 'sales' ? clearVatSales : clearVatPurchases)()
                  }
                }
              }} className="flex items-center gap-1.5 bg-danger/10 border border-danger/30 text-danger px-3 py-2 rounded-lg text-sm hover:bg-danger/20">
                <Trash2 size={15} /> Delete All
              </button>
              <button onClick={() => { setImportType(tab); setImportStep('upload'); setImportModal(true) }}
                className="flex items-center gap-1.5 bg-card border border-border text-white px-3 py-2 rounded-lg text-sm hover:bg-white/5">
                <Upload size={15} /> Import CSV
              </button>
              <button onClick={() => openAdd(tab === 'sales')}
                className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                <Plus size={15} /> New {tab === 'sales' ? 'Sales' : 'Purchase'} Record
                </button>
            </div>
          </div>
          {renderTable(currentList)}
        </>
      )}

      {tab === 'summary' && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="text-left p-3">Month</th>
                <th className="text-right p-3">Sales Before VAT</th>
                <th className="text-right p-3">Output VAT</th>
                <th className="text-right p-3">Purchases Before VAT</th>
                <th className="text-right p-3">Input VAT</th>
                <th className="text-right p-3">Net VAT</th>
                <th className="text-center p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary.map(m => (
                <tr key={m.month} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 font-medium">{formatMonth(m.month)}</td>
                  <td className="p-3 text-right">{formatCurrency(m.salesBeforeVat)}</td>
                  <td className="p-3 text-right text-primary">{formatCurrency(m.outputVat)}</td>
                  <td className="p-3 text-right">{formatCurrency(m.purchasesBeforeVat)}</td>
                  <td className="p-3 text-right text-success">{formatCurrency(m.inputVat)}</td>
                  <td className={`p-3 text-right font-medium ${m.netVat >= 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(Math.abs(m.netVat))}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === 'Payable' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
              {monthlySummary.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted">No data yet</td></tr>}
            </tbody>
            {monthlySummary.length > 0 && (
              <tfoot>
                <tr className="border-t border-border font-medium">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">{formatCurrency(monthlySummary.reduce((s,m) => s + m.salesBeforeVat, 0))}</td>
                  <td className="p-3 text-right text-primary">{formatCurrency(monthlySummary.reduce((s,m) => s + m.outputVat, 0))}</td>
                  <td className="p-3 text-right">{formatCurrency(monthlySummary.reduce((s,m) => s + m.purchasesBeforeVat, 0))}</td>
                  <td className="p-3 text-right text-success">{formatCurrency(monthlySummary.reduce((s,m) => s + m.inputVat, 0))}</td>
                  <td className="p-3 text-right">{formatCurrency(Math.abs(monthlySummary.reduce((s,m) => s + m.netVat, 0)))}</td>
                  <td className="p-3 text-center"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Monthly Sales Trend</h2>
            {chartLabels.length > 0 ? <Bar data={salesChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
          <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Monthly Purchase Trend</h2>
            {chartLabels.length > 0 ? <Bar data={purchaseChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
          <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Output vs Input VAT</h2>
            {chartLabels.length > 0 ? <Bar data={vatChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
          <div className={cardClass}><h2 className="text-sm font-semibold mb-3">Net VAT Trend</h2>
            {chartLabels.length > 0 ? <Line data={netVatChart} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
          <div className={`${cardClass} lg:col-span-2`}><h2 className="text-sm font-semibold mb-3">Yearly VAT Comparison</h2>
            {yearlyVat.labels.length > 0 ? <Bar data={yearlyVat} options={chartOpts} /> : <p className="text-muted text-sm">No data</p>}</div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Record' : `New ${salesMode ? 'Sales' : 'Purchase'} Record`} size="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-sm text-muted">Date <span className="text-danger">*</span></label>
              <input type="date" name="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">{salesMode ? 'Customer' : 'Supplier'} Name <span className="text-danger">*</span></label>
              <input type="text" name="companyName" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})}
                placeholder={salesMode ? 'Customer name' : 'Supplier name'}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
              {errors.companyName && <p className="text-danger text-xs mt-1">{errors.companyName}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">TIN Number <span className="text-danger">*</span></label>
              <input type="text" name="tinNumber" value={form.tinNumber} onChange={e => setForm({...form, tinNumber: e.target.value})}
                placeholder="0012345678"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
              {errors.tinNumber && <p className="text-danger text-xs mt-1">{errors.tinNumber}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">FS Number <span className="text-danger">*</span></label>
              <input type="text" name="fsNumber" value={form.fsNumber} onChange={e => setForm({...form, fsNumber: e.target.value})}
                placeholder="Fiscal Sales Number"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
              {errors.fsNumber && <p className="text-danger text-xs mt-1">{errors.fsNumber}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">Invoice Number</label>
              <input type="text" name="invoiceNumber" value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm text-muted">Amount Before VAT (ETB) <span className="text-danger">*</span></label>
              <input type="number" step="0.01" name="amountBeforeVat" value={form.amountBeforeVat}
                onChange={e => setForm({...form, amountBeforeVat: e.target.value})}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" />
              {errors.amountBeforeVat && <p className="text-danger text-xs mt-1">{errors.amountBeforeVat}</p>}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-sm text-muted">Item / Description <span className="text-danger">*</span></label>
            <textarea name="itemDescription" value={form.itemDescription} onChange={e => setForm({...form, itemDescription: e.target.value})}
              placeholder="Cement Supply, Office Equipment, Consultancy Service..."
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" rows={2} />
            {errors.itemDescription && <p className="text-danger text-xs mt-1">{errors.itemDescription}</p>}
          </div>
          {parseFloat(form.amountBeforeVat) > 0 && (
            <div className="bg-bg border border-border rounded-lg p-4 grid grid-cols-3 gap-4">
              <div><p className="text-xs text-muted">Amount Before VAT</p><p className="text-sm font-medium">{formatCurrency(form.amountBeforeVat)}</p></div>
              <div><p className="text-xs text-muted">VAT (15%)</p><p className="text-sm font-medium text-warning">{formatCurrency(parseFloat(form.amountBeforeVat || 0) * vatRate)}</p></div>
              <div><p className="text-xs text-muted">Grand Total</p><p className="text-sm font-bold text-success">{formatCurrency(parseFloat(form.amountBeforeVat || 0) * (1 + vatRate))}</p></div>
            </div>
          )}
          <div className="space-y-1">
            <label className="block text-sm text-muted">Notes (Optional)</label>
            <textarea name="notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">{editId ? 'Update' : 'Save'} Record</button>
          </div>
        </form>
      </Modal>

      <Modal open={viewModal} onClose={() => setViewModal(false)} title="Transaction Details" size="max-w-md">
        {viewItem && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted">Date</span><br/><span className="font-medium">{formatDate(viewItem.date)}</span></div>
              <div><span className="text-muted">Type</span><br/>{salesList.find(v => v.id === viewItem.id) ? 'Sales' : purchaseList.find(v => v.id === viewItem.id) ? 'Purchase' : ''}</div>
              <div className="col-span-2"><span className="text-muted">Company</span><br/><span className="font-medium">{getDisplayName(viewItem)}</span></div>
              <div><span className="text-muted">TIN Number</span><br/>{viewItem.tinNumber}</div>
              <div><span className="text-muted">FS Number</span><br/>{viewItem.fsNumber}</div>
              <div><span className="text-muted">Invoice Number</span><br/>{viewItem.invoiceNumber || '-'}</div>
              <div><span className="text-muted">Amount Before VAT</span><br/>{formatCurrency(viewItem.amountBeforeVat)}</div>
              <div><span className="text-muted">VAT (15%)</span><br/><span className="text-warning">{formatCurrency(parseFloat(viewItem.amountBeforeVat || 0) * vatRate)}</span></div>
              <div><span className="text-muted">Grand Total</span><br/><span className="text-success font-medium">{formatCurrency(parseFloat(viewItem.amountBeforeVat || 0) * (1 + vatRate))}</span></div>
            </div>
            <div><span className="text-muted">Description</span><br/>{viewItem.itemDescription}</div>
            {viewItem.notes && <div><span className="text-muted">Notes</span><br/>{viewItem.notes}</div>}
            <div className="flex justify-end pt-2">
              <button onClick={() => setViewModal(false)} className="px-4 py-2 text-sm bg-card border border-border rounded-lg text-muted hover:text-white">Close</button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={importModal} onClose={() => { setImportModal(false); setImportStep('upload') }} title="Import CSV / Excel" size="max-w-3xl">
        {importStep === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 cursor-pointer" onClick={() => fileRef.current?.click()}>
              <Upload size={40} className="mx-auto text-muted mb-3" />
              <p className="text-muted">Click to upload or drag & drop</p>
              <p className="text-xs text-muted mt-1">CSV or XLSX files up to 10MB</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            </div>
            <p className="text-xs text-muted">Importing as: <span className="font-medium text-white">{importType === 'sales' ? 'Sales Transactions' : 'Purchase Transactions'}</span></p>
          </div>
        )}
        {importStep === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Map columns from your file ({importData.headers.length} columns, {importData.rows.length} rows):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries({
                date: 'Date *', companyName: 'Company Name *', tinNumber: 'TIN Number *',
                fsNumber: 'FS Number *', invoiceNumber: 'Invoice Number', description: 'Description *',
                amountBeforeVat: 'Amount Before VAT *', notes: 'Notes',
              }).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs text-muted">{label}</label>
                  <select value={importData.mapped[field] || ''} onChange={e => handleMappingChange(field, e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-white">
                    <option value="">- Skip -</option>
                    {importData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setImportStep('upload')} className="px-4 py-2 text-sm text-muted hover:text-white">Back</button>
              <button onClick={processImport} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Process Import</button>
            </div>
          </div>
        )}
        {importStep === 'preview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Valid</p><p className="text-sm font-bold text-success">{importData.validCount}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Invalid</p><p className="text-sm font-bold text-danger">{importData.invalidCount}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Total VAT</p><p className="text-sm font-bold text-warning">{formatCurrency(importData.totalVat)}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Grand Total</p><p className="text-sm font-bold">{formatCurrency(importData.grandTotal)}</p></div>
            </div>
            {(importData.warnings.length > 0) && (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 max-h-24 overflow-y-auto">
                {importData.warnings.slice(0, 10).map((w, i) => <p key={i} className="text-xs text-warning flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}</p>)}
                {importData.warnings.length > 10 && <p className="text-xs text-muted mt-1">...and {importData.warnings.length - 10} more</p>}
              </div>
            )}
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="bg-bg text-muted sticky top-0">
                  <th className="p-2 text-left">#</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Company</th>
                  <th className="p-2 text-left">TIN</th><th className="p-2 text-left">FS</th><th className="p-2 text-left">Description</th>
                  <th className="p-2 text-right">Amount</th><th className="p-2 text-right">VAT</th><th className="p-2 text-right">Total</th><th className="p-2 text-center">Status</th>
                </tr></thead>
                <tbody>
                  {importData.preview.map((p, i) => (
                    <tr key={i} className={`border-t border-border/30 ${p.valid ? '' : 'bg-danger/5'}`}>
                      <td className="p-2">{p.row}</td>
                      <td className="p-2">{p.date}</td>
                      <td className="p-2">{p.companyName}</td>
                      <td className="p-2">{p.tinNumber}</td>
                      <td className="p-2">{p.fsNumber}</td>
                      <td className="p-2 max-w-[120px] truncate">{p.description}</td>
                      <td className="p-2 text-right">{p.amountBeforeVat ? formatCurrency(p.amountBeforeVat) : '-'}</td>
                      <td className="p-2 text-right text-warning">{p.vat ? formatCurrency(p.vat) : '-'}</td>
                      <td className="p-2 text-right">{p.grandTotal ? formatCurrency(p.grandTotal) : '-'}</td>
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
                Import {importData.validCount} Valid Records
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
