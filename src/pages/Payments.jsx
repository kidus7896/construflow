import { useState, useMemo, useRef, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate, today } from '../utils/format'
import { exportToExcel, printTable } from '../utils/export'
import Modal from '../components/Modal'
import SummaryCard from '../components/SummaryCard'
import {
  Search, Plus, Eye, Pencil, Trash2, Copy, Printer, FileSpreadsheet,
  Download, ChevronLeft, ChevronRight, X, Filter, Calendar,
  ArrowUpDown, Upload, FileText, AlertTriangle
} from 'lucide-react'

const VAT_RATE = 0.15
const WHT_RATE = 0.03

const ITEM_OPTIONS = [
  { label: 'Aggregate', unit: 'm³' },
  { label: 'Sand', unit: 'm³' },
  { label: 'Cement', unit: 'Bag' },
  { label: 'Steel', unit: 'kg' },
  { label: 'Fuel', unit: 'Liter' },
  { label: 'Transport', unit: 'Piece' },
  { label: 'Equipment Rental', unit: 'Meter' },
  { label: 'Consultancy', unit: 'Piece' },
  { label: 'Other', unit: 'Piece' },
]

const ITEM_UNITS = {
  Aggregate: 'm³', Sand: 'm³', Cement: 'Bag', Steel: 'kg',
  Fuel: 'Liter', Transport: 'Piece', 'Equipment Rental': 'Meter',
  Consultancy: 'Piece', Other: 'Piece',
}

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Mobile Banking', 'Credit', 'Letter of Credit (LC)']
const PAYMENT_STATUSES = ['Paid', 'Partially Paid', 'Pending', 'Cancelled']

const PAGE_SIZE = 20

function calc(quantity, unitPrice) {
  const qty = parseFloat(quantity) || 0
  const price = parseFloat(unitPrice) || 0
  const total = qty * price
  const vat = total * VAT_RATE
  const grand = total + vat
  const wht = total * WHT_RATE
  const net = grand - wht
  return { total, vat, grand, wht, net }
}

const emptyForm = {
  date: today(), companyName: '', tinNumber: '', address: '', defaultPaymentTerms: '',
  invoiceNumber: '', item: '', unit: '', quantity: '', unitPrice: '',
  paymentMethod: '', bankName: '', accountNumber: '', transactionReference: '',
  paymentStatus: 'Paid', receiptNumber: '', fsNumber: '', notes: '',
}

export default function Payments() {
  const { data, companyData, companies, addPayment, editPayment, deletePayment } = useStore()

  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMethod, setFilterMethod] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState('date')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [viewItem, setViewItem] = useState(null)
  const [viewModal, setViewModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({ ...emptyForm })
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false)
  const [showItemDropdown, setShowItemDropdown] = useState(false)
  const [companySearch, setCompanySearch] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [reportModal, setReportModal] = useState(false)
  const [reportType, setReportType] = useState('')
  const [reportPeriod, setReportPeriod] = useState({ from: '', to: '' })
  const [importModal, setImportModal] = useState(false)
  const [importStep, setImportStep] = useState('upload')
  const [importData, setImportData] = useState({ headers: [], rows: [], mapped: {}, preview: [], validCount: 0, invalidCount: 0 })
  const [importFile, setImportFile] = useState(null)
  const importFileRef = useRef(null)

  const companyRef = useRef(null)
  const itemRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setShowCompanyDropdown(false)
      if (itemRef.current && !itemRef.current.contains(e.target)) setShowItemDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const calculations = useMemo(() => calc(form.quantity, form.unitPrice), [form.quantity, form.unitPrice])

  const filtered = useMemo(() => {
    let result = [...companyData.payments]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.companyName?.toLowerCase().includes(q) ||
        p.invoiceNumber?.toLowerCase().includes(q) ||
        p.tinNumber?.toLowerCase().includes(q) ||
        p.receiptNumber?.toLowerCase().includes(q) ||
        p.item?.toLowerCase().includes(q)
      )
    }
    if (filterMonth) result = result.filter(p => p.date?.slice(5, 7) === filterMonth)
    if (filterYear) result = result.filter(p => p.date?.slice(0, 4) === filterYear)
    if (filterMethod) result = result.filter(p => p.paymentMethod === filterMethod)
    if (filterStatus) result = result.filter(p => p.paymentStatus === filterStatus)
    if (dateFrom) result = result.filter(p => p.date >= dateFrom)
    if (dateTo) result = result.filter(p => p.date <= dateTo)
    result.sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date?.localeCompare(b.date || '') || 0
      else if (sortField === 'company') cmp = (a.companyName || '').localeCompare(b.companyName || '')
      else if (sortField === 'amount') cmp = (parseFloat(a.totalPrice) || 0) - (parseFloat(b.totalPrice) || 0)
      else if (sortField === 'net') cmp = (parseFloat(a.netPayable) || 0) - (parseFloat(b.netPayable) || 0)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [companyData.payments, search, filterMonth, filterYear, filterMethod, filterStatus, dateFrom, dateTo, sortField, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summaries = useMemo(() => {
    const payments = companyData.payments
    return {
      totalPayments: payments.reduce((s, p) => s + (parseFloat(p.netPayable) || 0), 0),
      totalVat: payments.reduce((s, p) => s + (parseFloat(p.vatAmount) || 0), 0),
      totalWht: payments.reduce((s, p) => s + (parseFloat(p.withholdingAmount) || 0), 0),
      totalGross: payments.reduce((s, p) => s + (parseFloat(p.grandTotal) || 0), 0),
      outstanding: payments.filter(p => p.paymentStatus === 'Pending' || p.paymentStatus === 'Partially Paid')
        .reduce((s, p) => s + (parseFloat(p.netPayable) || 0), 0),
      count: payments.length,
    }
  }, [companyData.payments])

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ field }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="inline ml-1 opacity-30" />
    return <ArrowUpDown size={12} className={`inline ml-1 ${sortDir === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
  }

  function selectCompany(c) {
    setForm(f => ({ ...f, companyName: c.name, tinNumber: c.tinNumber || '', address: c.address || '', defaultPaymentTerms: '' }))
    setShowCompanyDropdown(false)
    setCompanySearch('')
  }

  function selectItem(item) {
    setForm(f => ({ ...f, item: item.label, unit: item.unit }))
    setShowItemDropdown(false)
    setItemSearch('')
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(e => ({ ...e, [name]: '' }))
  }

  function openAdd() {
    setEditId(null)
    setForm({ ...emptyForm, date: today() })
    setErrors({})
    setReceiptFile(null)
    setReceiptPreview(null)
    setModal(true)
  }

  function openEdit(item) {
    setEditId(item.id)
    setForm({
      date: item.date || today(), companyName: item.companyName || '', tinNumber: item.tinNumber || '',
      address: item.address || '', defaultPaymentTerms: item.defaultPaymentTerms || '',
      invoiceNumber: item.invoiceNumber || '', item: item.item || '', unit: item.unit || '',
      quantity: item.quantity || '', unitPrice: item.unitPrice || '',
      paymentMethod: item.paymentMethod || '', bankName: item.bankName || '',
      accountNumber: item.accountNumber || '', transactionReference: item.transactionReference || '',
      paymentStatus: item.paymentStatus || 'Paid', receiptNumber: item.receiptNumber || '',
      fsNumber: item.fsNumber || '', notes: item.notes || '',
    })
    setReceiptPreview(item.receiptAttachment || null)
    setReceiptFile(null)
    setErrors({})
    setModal(true)
  }

  function openView(item) {
    setViewItem(item)
    setViewModal(true)
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { alert('File exceeds 20MB limit'); return }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowed.includes(file.type)) { alert('Only PDF, JPG, PNG files allowed'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result
      setReceiptFile(base64)
      setReceiptPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit() {
    const errs = {}
    if (!form.date) errs.date = 'Required'
    if (!form.companyName) errs.companyName = 'Required'
    if (!form.item) errs.item = 'Required'
    if (!form.quantity || parseFloat(form.quantity) <= 0) errs.quantity = 'Must be greater than zero'
    if (!form.unitPrice || parseFloat(form.unitPrice) <= 0) errs.unitPrice = 'Must be greater than zero'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    const c = calculations
    const payload = {
      ...form,
      quantity: parseFloat(form.quantity) || 0,
      unitPrice: parseFloat(form.unitPrice) || 0,
      totalPrice: c.total,
      vatRate: VAT_RATE,
      vatAmount: c.vat,
      grandTotal: c.grand,
      withholdingRate: WHT_RATE,
      withholdingAmount: c.wht,
      netPayable: c.net,
      receiptAttachment: receiptFile || viewItem?.receiptAttachment || null,
    }

    if (editId) editPayment(editId, payload)
    else addPayment(payload)
    setModal(false)
  }

  function handleDuplicate(item) {
    const c = calc(item.quantity, item.unitPrice)
    addPayment({
      date: today(), companyName: item.companyName || '', tinNumber: item.tinNumber || '',
      address: item.address || '', invoiceNumber: '', item: item.item || '',
      unit: item.unit || '', quantity: item.quantity || 0, unitPrice: item.unitPrice || 0,
      totalPrice: c.total, vatRate: VAT_RATE, vatAmount: c.vat,
      grandTotal: c.grand, withholdingRate: WHT_RATE, withholdingAmount: c.wht,
      netPayable: c.net, paymentMethod: item.paymentMethod || '', bankName: item.bankName || '',
      accountNumber: item.accountNumber || '', transactionReference: item.transactionReference || '',
      paymentStatus: 'Pending', receiptNumber: '', fsNumber: '', notes: '',
    })
  }

  function handlePrintItem(item) {
    const c = calc(item.quantity, item.unitPrice)
    const rows = [
      { label: 'Date', value: formatDate(item.date) },
      { label: 'Company', value: item.companyName },
      { label: 'TIN', value: item.tinNumber },
      { label: 'Invoice', value: item.invoiceNumber },
      { label: 'Item', value: `${item.item} (${item.quantity} ${item.unit})` },
      { label: 'Unit Price', value: formatCurrency(item.unitPrice) },
      { label: 'Total Price', value: formatCurrency(item.totalPrice || c.total) },
      { label: `VAT (${(VAT_RATE * 100).toFixed(0)}%)`, value: formatCurrency(item.vatAmount || c.vat) },
      { label: 'Grand Total', value: formatCurrency(item.grandTotal || c.grand) },
      { label: `WHT (${(WHT_RATE * 100).toFixed(0)}%)`, value: formatCurrency(item.withholdingAmount || c.wht) },
      { label: 'Net Payable', value: formatCurrency(item.netPayable || c.net) },
      { label: 'Method', value: item.paymentMethod },
      { label: 'Status', value: item.paymentStatus },
    ]
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Payment Voucher</title><style>
      body{font-family:monospace;padding:40px;color:#222}
      h2{text-align:center;margin-bottom:30px}
      table{width:100%;border-collapse:collapse}
      td{padding:8px 12px;border-bottom:1px solid #ddd}
      td:first-child{font-weight:600;width:180px}
      .total td{border-top:2px solid #222;font-weight:700}
    </style></head><body>
      <h2>Payment Voucher</h2>
      <table>${rows.map(r => `<tr><td>${r.label}</td><td>${r.value}</td></tr>`).join('')}</table>
      ${item.notes ? `<p style="margin-top:20px"><strong>Notes:</strong> ${item.notes}</p>` : ''}
      <p style="margin-top:40px;text-align:center;color:#888;font-size:12px">Generated on ${new Date().toLocaleDateString()}</p>
    </body></html>`)
    win.document.close()
    win.print()
  }

  function handleExport() {
    const d = filtered.map(p => ({
      Date: formatDate(p.date), Company: p.companyName, 'TIN Number': p.tinNumber,
      'Invoice #': p.invoiceNumber, Item: p.item, Quantity: p.quantity, Unit: p.unit,
      'Unit Price': p.unitPrice, 'Total Price': p.totalPrice || calc(p.quantity, p.unitPrice).total,
      'VAT Amount': p.vatAmount || calc(p.quantity, p.unitPrice).vat,
      'Grand Total': p.grandTotal || calc(p.quantity, p.unitPrice).grand,
      'WHT Amount': p.withholdingAmount || calc(p.quantity, p.unitPrice).wht,
      'Net Payable': p.netPayable || calc(p.quantity, p.unitPrice).net,
      Method: p.paymentMethod, Status: p.paymentStatus, 'Receipt #': p.receiptNumber,
    }))
    exportToExcel(d, 'payments')
  }

  function handlePrint() {
    const d = filtered.map(p => ({
      Date: formatDate(p.date), Company: p.companyName, 'Invoice #': p.invoiceNumber,
      Item: p.item, 'Net Payable': formatCurrency(p.netPayable || calc(p.quantity, p.unitPrice).net),
      Status: p.paymentStatus,
    }))
    printTable(d, 'Payments')
  }

  function generateReport() {
    let reportData = []
    if (reportType === 'daily') {
      reportData = companyData.payments.filter(p => p.date === reportPeriod.from)
    } else if (reportType === 'monthly') {
      reportData = companyData.payments.filter(p => p.date?.slice(0, 7) === reportPeriod.from)
    } else if (reportType === 'supplier') {
      reportData = companyData.payments.filter(p =>
        p.companyName?.toLowerCase().includes((reportPeriod.from || '').toLowerCase())
      )
    } else if (reportType === 'vat') {
      reportData = companyData.payments.filter(p => parseFloat(p.vatAmount || 0) > 0)
    } else if (reportType === 'wht') {
      reportData = companyData.payments.filter(p => parseFloat(p.withholdingAmount || 0) > 0)
    } else if (reportType === 'outstanding') {
      reportData = companyData.payments.filter(p => p.paymentStatus === 'Pending' || p.paymentStatus === 'Partially Paid')
    } else if (reportType === 'cash') {
      reportData = companyData.payments.filter(p => p.paymentMethod === 'Cash')
    } else if (reportType === 'bank') {
      reportData = companyData.payments.filter(p => p.paymentMethod === 'Bank Transfer' || p.paymentMethod === 'Cheque')
    }
    const d = reportData.map(p => ({
      Date: formatDate(p.date), Company: p.companyName, 'TIN': p.tinNumber,
      'Invoice #': p.invoiceNumber, Item: p.item, Quantity: p.quantity,
      'Total Price': p.totalPrice, VAT: p.vatAmount, 'Grand Total': p.grandTotal,
      WHT: p.withholdingAmount, 'Net Payable': p.netPayable,
      Method: p.paymentMethod, Status: p.paymentStatus,
    }))
    const label = reportType.charAt(0).toUpperCase() + reportType.slice(1)
    exportToExcel(d, `${label}-Payment-Report`)
    setReportModal(false)
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext)) { alert('Unsupported format. Use CSV or XLSX.'); return }
    setImportFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      let headers = [], rows = []
      try {
        if (ext === 'csv') {
          const text = ev.target.result
          const lines = text.split(/\r?\n/).filter(l => l.trim())
          if (lines.length < 2) { alert('No data found'); return }
          headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
          rows = lines.slice(1).filter(l => l.trim()).map(l => {
            const vals = []; let cur = '', inQuote = false
            for (const ch of l) {
              if (ch === '"') inQuote = !inQuote
              else if (ch === ',' && !inQuote) { vals.push(cur.trim().replace(/^"|"$/g, '')); cur = '' }
              else cur += ch
            }
            vals.push(cur.trim().replace(/^"|"$/g, ''))
            return vals
          })
        } else {
          const wb = XLSX.read(ev.target.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
          if (json.length > 0) { headers = json[0].map(h => String(h).trim()); rows = json.slice(1).filter(r => r.some(c => String(c).trim())) }
        }
        if (!headers.length || !rows.length) { alert('No data found.'); return }
        setImportData(prev => ({ ...prev, headers, rows, mapped: autoDetectColumns(headers), preview: [], validCount: 0, invalidCount: 0 }))
        setImportStep('mapping')
      } catch (err) { alert('Failed to parse: ' + err.message) }
    }
    if (ext === 'xlsx' || ext === 'xls') reader.readAsBinaryString(file)
    else reader.readAsText(file)
    e.target.value = ''
  }

  function autoDetectColumns(headers) {
    const map = { date: '', companyName: '', tinNumber: '', invoiceNumber: '', item: '', quantity: '', unitPrice: '', receiptNumber: '', notes: '' }
    const lower = headers.map(h => String(h).toLowerCase().trim())
    lower.forEach((h, i) => {
      if (/\bdate\b/.test(h)) map.date = headers[i]
      else if (/(company|customer|supplier|name|client)/.test(h) && !/(tin|fs|invoice)/.test(h)) map.companyName = headers[i]
      else if (/\btin\b/.test(h) || /t\.?i\.?n/.test(h)) map.tinNumber = headers[i]
      else if (/(invoice|inv)/.test(h)) map.invoiceNumber = headers[i]
      else if (/\bitem\b/.test(h) || /product|service|material/.test(h)) map.item = headers[i]
      else if (/\bqty\b/.test(h) || /quantity/.test(h)) map.quantity = headers[i]
      else if (/(unit.?price|price|rate)/.test(h)) map.unitPrice = headers[i]
      else if (/(receipt|rcpt)/.test(h)) map.receiptNumber = headers[i]
      else if (/(note|remark)/.test(h)) map.notes = headers[i]
    })
    return map
  }

  function parseDate(val) {
    if (!val) return ''
    val = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
    const m = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
    try { const d = new Date(val); if (!isNaN(d)) { const y = d.getFullYear(); const mo = String(d.getMonth()+1).padStart(2,'0'); const da = String(d.getDate()).padStart(2,'0'); return `${y}-${mo}-${da}` } } catch {}
    return ''
  }

  function processImport() {
    const { headers, rows, mapped } = importData
    const ci = (f) => { const n = mapped[f]; return n ? headers.indexOf(n) : -1 }
    const preview = []; let vc = 0, ic = 0
    rows.forEach((row, i) => {
      const date = parseDate(row[ci('date')])
      const companyName = (row[ci('companyName')] || '').trim()
      const tinNumber = (row[ci('tinNumber')] || '').trim()
      const invoiceNumber = (row[ci('invoiceNumber')] || '').trim()
      const item = (row[ci('item')] || '').trim()
      const quantity = parseFloat(String(row[ci('quantity')] || '').replace(/[^0-9.-]/g, ''))
      const unitPrice = parseFloat(String(row[ci('unitPrice')] || '').replace(/[^0-9.-]/g, ''))
      const receiptNumber = (row[ci('receiptNumber')] || '').trim()
      const notes = (row[ci('notes')] || '').trim()
      const errs = []
      if (!date) errs.push('Invalid date')
      if (!companyName) errs.push('Missing company')
      if (!item) errs.push('Missing item')
      if (!quantity || quantity <= 0) errs.push('Invalid quantity')
      if (!unitPrice || unitPrice <= 0) errs.push('Invalid unit price')
      const c = calc(quantity, unitPrice)
      preview.push({ row: i+2, date, companyName, tinNumber, invoiceNumber, item, quantity, unitPrice, totalPrice: c.total, vatAmount: c.vat, grandTotal: c.grand, wht: c.wht, netPayable: c.net, receiptNumber, notes, valid: errs.length === 0, errors: errs })
      if (errs.length === 0) vc++; else ic++
    })
    setImportData(prev => ({ ...prev, preview, validCount: vc, invalidCount: ic }))
    setImportStep('preview')
  }

  function confirmImport() {
    const { preview, validCount } = importData
    let imported = 0
    preview.filter(p => p.valid).forEach(p => {
      addPayment({
        date: p.date, companyName: p.companyName, tinNumber: p.tinNumber,
        invoiceNumber: p.invoiceNumber, item: p.item, unit: 'Piece',
        quantity: p.quantity, unitPrice: p.unitPrice,
        totalPrice: p.totalPrice, vatRate: VAT_RATE, vatAmount: p.vatAmount,
        grandTotal: p.grandTotal, withholdingRate: WHT_RATE, withholdingAmount: p.wht,
        netPayable: p.netPayable, paymentMethod: '', paymentStatus: 'Pending',
        receiptNumber: p.receiptNumber, notes: p.notes,
      })
      imported++
    })
    setImportModal(false); setImportStep('upload')
    alert(`Imported ${imported} of ${preview.length} rows.`)
  }

  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(companySearch.toLowerCase()) && c.status !== 'archived'
  )

  const filteredItems = ITEM_OPTIONS.filter(i =>
    i.label.toLowerCase().includes(itemSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-sm text-muted mt-0.5">Manage supplier payments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" placeholder="Search..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="w-full sm:w-56 bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-lg transition-colors ${showFilters ? 'bg-primary/10 text-primary border-primary' : 'bg-card border-border text-muted hover:text-white'}`}>
            <Filter size={18} />
          </button>
          <button onClick={handleExport} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white transition-colors" title="Export Excel">
            <FileSpreadsheet size={18} />
          </button>
          <button onClick={handlePrint} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white transition-colors" title="Print">
            <Printer size={18} />
          </button>
          <button onClick={() => { setReportType(''); setReportPeriod({ from: '', to: '' }); setReportModal(true) }}
            className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white transition-colors" title="Reports">
            <FileText size={18} />
          </button>
          <button onClick={() => { setImportModal(true); setImportStep('upload') }}
            className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white transition-colors" title="Import">
            <Upload size={18} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> New Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard title="Total Payments" value={formatCurrency(summaries.totalPayments)} color="blue" />
        <SummaryCard title="Total VAT Paid" value={formatCurrency(summaries.totalVat)} color="purple" />
        <SummaryCard title="Total WHT" value={formatCurrency(summaries.totalWht)} color="yellow" />
        <SummaryCard title="Gross Payments" value={formatCurrency(summaries.totalGross)} color="green" />
        <SummaryCard title="Outstanding" value={formatCurrency(summaries.outstanding)} color="red" />
        <SummaryCard title="Transactions" value={summaries.count} color="teal" />
      </div>

      {showFilters && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Month</label>
              <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1) }}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                <option value="">All</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                  <option key={m} value={m}>{new Date(2024, parseInt(m) - 1).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Year</label>
              <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1) }}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                <option value="">All</option>
                {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i)).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Method</label>
              <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); setPage(1) }}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                <option value="">All</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Status</label>
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                <option value="">All</option>
                {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Date From</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">Date To</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilterMonth(''); setFilterYear(''); setFilterMethod(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); setPage(1) }}
                className="px-3 py-2 text-sm text-muted hover:text-white bg-bg border border-border rounded-lg transition-colors">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="text-left p-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('date')}>
                Date <SortIcon field="date" />
              </th>
              <th className="text-left p-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('company')}>
                Company <SortIcon field="company" />
              </th>
              <th className="text-left p-3">TIN</th>
              <th className="text-left p-3">Invoice #</th>
              <th className="text-left p-3">Item</th>
              <th className="text-center p-3">Qty</th>
              <th className="text-right p-3">Unit Price</th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('amount')}>
                Total Price <SortIcon field="amount" />
              </th>
              <th className="text-right p-3">VAT</th>
              <th className="text-right p-3">Grand Total</th>
              <th className="text-right p-3">WHT</th>
              <th className="text-right p-3 cursor-pointer select-none hover:text-white" onClick={() => handleSort('net')}>
                Net Payable <SortIcon field="net" />
              </th>
              <th className="text-left p-3">Method</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Receipt #</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(p => {
              const c = calc(p.quantity, p.unitPrice)
              const statusColors = { Paid: 'text-success', 'Partially Paid': 'text-yellow-400', Pending: 'text-warning', Cancelled: 'text-danger' }
              return (
                <tr key={p.id} className="border-b border-border/50 hover:bg-white/5">
                  <td className="p-3 text-muted whitespace-nowrap">{formatDate(p.date)}</td>
                  <td className="p-3 font-medium text-white">{p.companyName}</td>
                  <td className="p-3 text-muted">{p.tinNumber}</td>
                  <td className="p-3 text-muted">{p.invoiceNumber}</td>
                  <td className="p-3">{p.item}</td>
                  <td className="p-3 text-center">{p.quantity} {p.unit}</td>
                  <td className="p-3 text-right">{formatCurrency(p.unitPrice)}</td>
                  <td className="p-3 text-right">{formatCurrency(p.totalPrice || c.total)}</td>
                  <td className="p-3 text-right text-purple-400">{formatCurrency(p.vatAmount || c.vat)}</td>
                  <td className="p-3 text-right">{formatCurrency(p.grandTotal || c.grand)}</td>
                  <td className="p-3 text-right text-yellow-400">{formatCurrency(p.withholdingAmount || c.wht)}</td>
                  <td className="p-3 text-right text-success font-medium">{formatCurrency(p.netPayable || c.net)}</td>
                  <td className="p-3 text-muted">{p.paymentMethod}</td>
                  <td className={`p-3 ${statusColors[p.paymentStatus] || 'text-muted'}`}>{p.paymentStatus}</td>
                  <td className="p-3 text-muted">{p.receiptNumber}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openView(p)} className="p-1.5 text-muted hover:text-primary transition-colors" title="View">
                        <Eye size={15} />
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 text-muted hover:text-white transition-colors" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(p.id)} className="p-1.5 text-muted hover:text-danger transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
                      <button onClick={() => handleDuplicate(p)} className="p-1.5 text-muted hover:text-purple-400 transition-colors" title="Duplicate">
                        <Copy size={15} />
                      </button>
                      <button onClick={() => handlePrintItem(p)} className="p-1.5 text-muted hover:text-cyan-400 transition-colors" title="Print">
                        <Printer size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {paged.length === 0 && (
              <tr><td colSpan={16} className="p-8 text-center text-muted">No payments found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">{filtered.length} payment{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 bg-card border border-border rounded-lg text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
            </button>
            <span className="text-muted px-2">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 bg-card border border-border rounded-lg text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Payment' : 'New Payment'} size="max-w-3xl">
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1.5">Date <span className="text-danger">*</span></label>
              <input type="date" name="date" value={form.date} onChange={handleChange}
                className={`w-full bg-bg border ${errors.date ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary`} />
              {errors.date && <p className="text-xs text-danger mt-1">{errors.date}</p>}
            </div>
            <div className="relative" ref={companyRef}>
              <label className="text-sm text-muted block mb-1.5">Company Name <span className="text-danger">*</span></label>
              <input type="text" value={form.companyName} onChange={e => { setCompanySearch(e.target.value); setShowCompanyDropdown(true); setForm(f => ({ ...f, companyName: e.target.value })) }}
                onFocus={() => setShowCompanyDropdown(true)} placeholder="Search company..."
                className={`w-full bg-bg border ${errors.companyName ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary`} />
              {errors.companyName && <p className="text-xs text-danger mt-1">{errors.companyName}</p>}
              {showCompanyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                  {filteredCompanies.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted">No companies found</div>
                  ) : filteredCompanies.map(c => (
                    <button key={c.id} onClick={() => selectCompany(c)}
                      className="w-full text-left px-3 py-2 text-sm text-muted hover:text-white hover:bg-white/5 transition-colors">
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">TIN Number</label>
              <input type="text" name="tinNumber" value={form.tinNumber} onChange={handleChange} readOnly
                className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2 text-sm text-muted cursor-not-allowed" />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">Address</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} readOnly
                className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2 text-sm text-muted cursor-not-allowed" />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">Invoice Number</label>
              <input type="text" name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} placeholder="INV-001"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative" ref={itemRef}>
                <label className="text-sm text-muted block mb-1.5">Item <span className="text-danger">*</span></label>
                <input type="text" value={form.item} onChange={e => { setItemSearch(e.target.value); setShowItemDropdown(true); setForm(f => ({ ...f, item: e.target.value })) }}
                  onFocus={() => setShowItemDropdown(true)} placeholder="Select item..."
                  className={`w-full bg-bg border ${errors.item ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary`} />
                {errors.item && <p className="text-xs text-danger mt-1">{errors.item}</p>}
                {showItemDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted">No items found</div>
                    ) : filteredItems.map(i => (
                      <button key={i.label} onClick={() => selectItem(i)}
                        className="w-full text-left px-3 py-2 text-sm text-muted hover:text-white hover:bg-white/5 transition-colors">
                        {i.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">Unit</label>
                <input type="text" name="unit" value={form.unit} readOnly
                  className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2 text-sm text-muted cursor-not-allowed" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">Quantity <span className="text-danger">*</span></label>
                <input type="number" name="quantity" value={form.quantity} onChange={handleChange} min="0" step="0.01" placeholder="0"
                  className={`w-full bg-bg border ${errors.quantity ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary`} />
                {errors.quantity && <p className="text-xs text-danger mt-1">{errors.quantity}</p>}
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">Unit Price (ETB) <span className="text-danger">*</span></label>
                <input type="number" name="unitPrice" value={form.unitPrice} onChange={handleChange} min="0" step="0.01" placeholder="0.00"
                  className={`w-full bg-bg border ${errors.unitPrice ? 'border-danger' : 'border-border'} rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary`} />
                {errors.unitPrice && <p className="text-xs text-danger mt-1">{errors.unitPrice}</p>}
              </div>
            </div>
          </div>

          <div className="bg-bg border border-border rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total Price (Qty × Unit Price)</span>
              <span className="text-white font-medium">{formatCurrency(calculations.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">+ VAT ({(VAT_RATE * 100).toFixed(0)}%)</span>
              <span className="text-purple-400 font-medium">{formatCurrency(calculations.vat)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium border-t border-border pt-2">
              <span className="text-white">Grand Total</span>
              <span className="text-white">{formatCurrency(calculations.grand)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">− WHT ({(WHT_RATE * 100).toFixed(0)}%)</span>
              <span className="text-yellow-400 font-medium">{formatCurrency(calculations.wht)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span className="text-white">Net Payable</span>
              <span className="text-success">{formatCurrency(calculations.net)}</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-white mb-3">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted block mb-1.5">Payment Method</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">Bank Name</label>
                <input type="text" name="bankName" value={form.bankName} onChange={handleChange} placeholder="e.g. CBE"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">Account Number</label>
                <input type="text" name="accountNumber" value={form.accountNumber} onChange={handleChange} placeholder="e.g. 100013456789"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">Transaction Reference</label>
                <input type="text" name="transactionReference" value={form.transactionReference} onChange={handleChange} placeholder="TRX-001"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">Payment Status</label>
                <select name="paymentStatus" value={form.paymentStatus} onChange={handleChange}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
                  {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-white mb-3">Document Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted block mb-1.5">Receipt Number</label>
                <input type="text" name="receiptNumber" value={form.receiptNumber} onChange={handleChange} placeholder="RCP-001"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">FS Number</label>
                <input type="text" name="fsNumber" value={form.fsNumber} onChange={handleChange} placeholder="FS-001"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-sm text-muted block mb-1.5">TIN Number</label>
                <input type="text" value={form.tinNumber} readOnly
                  className="w-full bg-bg/50 border border-border rounded-lg px-3 py-2 text-sm text-muted cursor-not-allowed" />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-muted block mb-1.5">Upload Receipt (PDF/JPG/PNG · max 20MB)</label>
              <div className="flex items-center gap-3">
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-bg border border-border rounded-lg text-sm text-muted hover:text-white hover:border-primary transition-colors">
                  <Upload size={16} /> {receiptPreview ? 'Change File' : 'Choose File'}
                </button>
                {receiptPreview && (
                  <>
                    <span className="text-xs text-success">File attached</span>
                    <button onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                      className="text-xs text-danger hover:text-red-300 transition-colors">Remove</button>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
              </div>
              {receiptPreview && receiptPreview.startsWith('data:image') && (
                <img src={receiptPreview} alt="Receipt preview" className="mt-3 max-h-32 rounded-lg border border-border" />
              )}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted block mb-1.5">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Additional notes..."
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSubmit} className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
              {editId ? 'Update Payment' : 'Add Payment'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={viewModal} onClose={() => setViewModal(false)} title="Payment Details" size="max-w-2xl">
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted">Date:</span><br /><span className="text-white">{formatDate(viewItem.date)}</span></div>
              <div><span className="text-muted">Company:</span><br /><span className="text-white">{viewItem.companyName}</span></div>
              <div><span className="text-muted">TIN Number:</span><br /><span className="text-white">{viewItem.tinNumber}</span></div>
              <div><span className="text-muted">Invoice #:</span><br /><span className="text-white">{viewItem.invoiceNumber}</span></div>
              <div><span className="text-muted">Item:</span><br /><span className="text-white">{viewItem.item}</span></div>
              <div><span className="text-muted">Quantity:</span><br /><span className="text-white">{viewItem.quantity} {viewItem.unit}</span></div>
              <div><span className="text-muted">Unit Price:</span><br /><span className="text-white">{formatCurrency(viewItem.unitPrice)}</span></div>
              <div><span className="text-muted">Total Price:</span><br /><span className="text-white">{formatCurrency(viewItem.totalPrice || calculations.total)}</span></div>
              <div><span className="text-muted">VAT (15%):</span><br /><span className="text-purple-400">{formatCurrency(viewItem.vatAmount || calculations.vat)}</span></div>
              <div><span className="text-muted">Grand Total:</span><br /><span className="text-white">{formatCurrency(viewItem.grandTotal || calculations.grand)}</span></div>
              <div><span className="text-muted">WHT (3%):</span><br /><span className="text-yellow-400">{formatCurrency(viewItem.withholdingAmount || calculations.wht)}</span></div>
              <div><span className="text-muted">Net Payable:</span><br /><span className="text-success font-medium">{formatCurrency(viewItem.netPayable || calculations.net)}</span></div>
              <div><span className="text-muted">Payment Method:</span><br /><span className="text-white">{viewItem.paymentMethod}</span></div>
              <div><span className="text-muted">Payment Status:</span><br /><span className="text-white">{viewItem.paymentStatus}</span></div>
              <div><span className="text-muted">Receipt #:</span><br /><span className="text-white">{viewItem.receiptNumber}</span></div>
              <div><span className="text-muted">FS Number:</span><br /><span className="text-white">{viewItem.fsNumber}</span></div>
              {viewItem.bankName && <div><span className="text-muted">Bank:</span><br /><span className="text-white">{viewItem.bankName}</span></div>}
              {viewItem.transactionReference && <div><span className="text-muted">Transaction Ref:</span><br /><span className="text-white">{viewItem.transactionReference}</span></div>}
            </div>
            {viewItem.notes && (
              <div className="pt-3 border-t border-border">
                <span className="text-sm text-muted">Notes:</span>
                <p className="text-sm text-white mt-1">{viewItem.notes}</p>
              </div>
            )}
            {viewItem.receiptAttachment && viewItem.receiptAttachment.startsWith('data:image') && (
              <div className="pt-3 border-t border-border">
                <span className="text-sm text-muted block mb-2">Receipt Attachment:</span>
                <img src={viewItem.receiptAttachment} alt="Receipt" className="max-h-64 rounded-lg border border-border" />
              </div>
            )}
            {viewItem.receiptAttachment && viewItem.receiptAttachment.startsWith('data:application/pdf') && (
              <div className="pt-3 border-t border-border">
                <span className="text-sm text-muted block mb-2">Receipt Attachment (PDF):</span>
                <a href={viewItem.receiptAttachment} download="receipt.pdf"
                  className="text-primary hover:underline text-sm">Download PDF</a>
              </div>
            )}
            <div className="flex justify-end pt-3 border-t border-border">
              <button onClick={() => handlePrintItem(viewItem)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors">
                <Printer size={16} /> Print Voucher
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Payment">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-danger/10 shrink-0">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div>
            <p className="text-sm text-white font-medium">Are you sure?</p>
            <p className="text-sm text-muted mt-1">This will permanently delete this payment record.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Cancel</button>
          <button onClick={() => { deletePayment(confirmDelete); setConfirmDelete(null) }}
            className="px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Delete</button>
        </div>
      </Modal>

      <Modal open={reportModal} onClose={() => setReportModal(false)} title="Generate Payment Report" size="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1.5">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary">
              <option value="">Select report type</option>
              <option value="daily">Daily Payment Report</option>
              <option value="monthly">Monthly Payment Report</option>
              <option value="supplier">Supplier Payment Report</option>
              <option value="vat">VAT Payment Report</option>
              <option value="wht">Withholding Tax Report</option>
              <option value="outstanding">Outstanding Payments Report</option>
              <option value="cash">Cash Payment Report</option>
              <option value="bank">Bank Payment Report</option>
            </select>
          </div>
          {reportType && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted block mb-1.5">
                  {reportType === 'supplier' ? 'Supplier Name' : reportType === 'daily' || reportType === 'monthly' ? reportType === 'daily' ? 'Date' : 'Month (YYYY-MM)' : 'From'}
                </label>
                <input type={reportType === 'daily' ? 'date' : 'text'} value={reportPeriod.from} onChange={e => setReportPeriod(p => ({ ...p, from: e.target.value }))}
                  placeholder={reportType === 'monthly' ? '2026-06' : reportType === 'supplier' ? 'Company name' : 'YYYY-MM-DD'}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:outline-none focus:border-primary" />
              </div>
              {reportType === 'daily' && (
                <div>
                  <label className="text-sm text-muted block mb-1.5">To</label>
                  <input type="date" value={reportPeriod.to} onChange={e => setReportPeriod(p => ({ ...p, to: e.target.value }))}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setReportModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white transition-colors">Cancel</button>
            <button onClick={generateReport} disabled={!reportType}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Download size={16} className="inline mr-1.5" /> Generate & Export
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={importModal} onClose={() => { setImportModal(false); setImportStep('upload') }} title="Import Payments" size="max-w-3xl">
        {importStep === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 cursor-pointer" onClick={() => importFileRef.current?.click()}>
              <Upload size={40} className="mx-auto text-muted mb-3" />
              <p className="text-muted">Click to upload or drag & drop</p>
              <p className="text-xs text-muted mt-1">CSV or XLSX files</p>
              <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} className="hidden" />
            </div>
          </div>
        )}
        {importStep === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-muted">Map columns ({importData.headers.length} columns, {importData.rows.length} rows):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries({
                date: 'Date *', companyName: 'Company Name *', tinNumber: 'TIN Number',
                invoiceNumber: 'Invoice #', item: 'Item *', quantity: 'Quantity *',
                unitPrice: 'Unit Price *', receiptNumber: 'Receipt #', notes: 'Notes',
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
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Valid</p><p className="text-sm font-bold text-success">{importData.validCount}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Invalid</p><p className="text-sm font-bold text-danger">{importData.invalidCount}</p></div>
              <div className="bg-bg rounded-lg p-2 text-center"><p className="text-xs text-muted">Total Rows</p><p className="text-sm font-bold">{importData.preview.length}</p></div>
            </div>
            <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="bg-bg text-muted sticky top-0">
                  <th className="p-2 text-left">#</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Company</th>
                  <th className="p-2 text-left">Item</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Total</th><th className="p-2 text-right">Net</th><th className="p-2 text-center">Status</th>
                </tr></thead>
                <tbody>
                  {importData.preview.map((p, i) => (
                    <tr key={i} className={`border-t border-border/30 ${p.valid ? '' : 'bg-danger/5'}`}>
                      <td className="p-2">{p.row}</td>
                      <td className="p-2">{p.date}</td>
                      <td className="p-2">{p.companyName}</td>
                      <td className="p-2">{p.item}</td>
                      <td className="p-2 text-right">{p.quantity}</td>
                      <td className="p-2 text-right">{p.unitPrice ? formatCurrency(p.unitPrice) : '-'}</td>
                      <td className="p-2 text-right">{p.totalPrice ? formatCurrency(p.totalPrice) : '-'}</td>
                      <td className="p-2 text-right text-success">{p.netPayable ? formatCurrency(p.netPayable) : '-'}</td>
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
