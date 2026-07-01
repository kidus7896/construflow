import { useState, useMemo, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../store/useStore'
import { formatCurrency, formatDate, today } from '../utils/format'
import { exportToExcel, exportToCSV, printTable } from '../utils/export'
import Modal from '../components/Modal'
import FormField from '../components/FormField'
import SummaryCard from '../components/SummaryCard'
import * as XLSX from 'xlsx'
import {
  Search, Plus, Pencil, Trash2, Download, Printer, FileSpreadsheet,
  Upload, Eye, Copy, X, Filter, FileType, Image,
  BarChart3, Truck, Package, ArrowUpDown
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, PointElement, LineElement
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { labels: { color: '#94A3B8', boxWidth: 12, padding: 8 } },
  },
  scales: {
    x: { ticks: { color: '#94A3B8' }, grid: { color: '#334155' } },
    y: { ticks: { color: '#94A3B8' }, grid: { color: '#334155' } },
  },
}

const paymentMethods = ['Cash', 'Bank Transfer', 'Cheque', 'Mobile Banking', 'Credit']
const paymentStatuses = ['Paid', 'Partially Paid', 'Pending']

function defaultForm() {
  return {
    expenseDate: today(),
    driverName: '',
    driverPhone: '',
    vehiclePlate: '',
    vehicleType: '',
    route: '',
    materialTransported: '',
    quantity: '',
    unit: '',
    fuelCost: '',
    loadingCost: '',
    otherCost: '',
    totalCost: 0,
    vat: 0,
    withholdingTax: 0,
    netPayable: 0,
    paymentMethod: '',
    paymentStatus: '',
    bankAccount: '',
    transactionReference: '',
    receiptNumber: '',
    invoiceNumber: '',
    fsNumber: '',
    attachmentName: '',
    attachmentData: '',
    notes: '',
  }
}

function calcTransport(form) {
  const fuel = parseFloat(form.fuelCost) || 0
  const loading = parseFloat(form.loadingCost) || 0
  const other = parseFloat(form.otherCost) || 0
  const totalCost = fuel + loading + other
  const vat = totalCost * 0.15
  const withholdingTax = totalCost * 0.03
  const netPayable = totalCost + vat - withholdingTax
  return { totalCost, vat, withholdingTax, netPayable }
}

export default function TransportExpenses() {
  const { hasPermission } = useAuth()
  const { data, companyData, addTransportExpense, editTransportExpense, deleteTransportExpense,
    addTransportSupplier, deleteTransportSupplier,
    addTransportImportLog } = useStore()

  const fileInputRef = useRef(null)
  const importFileRef = useRef(null)

  const expenses = companyData.transportExpenses || []
  const suppliers = companyData.transportSuppliers || []

  const [activeTab, setActiveTab] = useState('expenses')
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDriver, setFilterDriver] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(defaultForm())
  const [errors, setErrors] = useState({})

  const [viewItem, setViewItem] = useState(null)
  const [supplierModal, setSupplierModal] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', vehiclePlate: '', vehicleType: '', route: '' })
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)

  const [importModal, setImportModal] = useState(false)
  const [importData, setImportData] = useState([])
  const [importMapped, setImportMapped] = useState([])
  const [importPreview, setImportPreview] = useState(null)
  const [importColumns, setImportColumns] = useState([])
  const [columnMap, setColumnMap] = useState({})

  const [currentPage, setCurrentPage] = useState(1)
  const [sortAsc, setSortAsc] = useState(false)
  const perPage = 15

  const summary = useMemo(() => {
    const totalCost = expenses.reduce((s, e) => s + (parseFloat(e.totalCost) || 0), 0)
    const totalVAT = expenses.reduce((s, e) => s + (parseFloat(e.vat) || 0), 0)
    const totalWHT = expenses.reduce((s, e) => s + (parseFloat(e.withholdingTax) || 0), 0)
    const totalNet = expenses.reduce((s, e) => s + (parseFloat(e.netPayable) || 0), 0)
    return { totalCost, totalVAT, totalWHT, totalNet, count: expenses.length }
  }, [expenses])

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (search) {
        const q = search.toLowerCase()
        if (!e.driverName?.toLowerCase().includes(q) &&
            !e.vehiclePlate?.toLowerCase().includes(q) &&
            !e.route?.toLowerCase().includes(q) &&
            !e.materialTransported?.toLowerCase().includes(q) &&
            !e.receiptNumber?.toLowerCase().includes(q)) return false
      }
      if (filterMonth && e.expenseDate) {
        const m = String(new Date(e.expenseDate).getMonth() + 1).padStart(2, '0')
        if (m !== filterMonth) return false
      }
      if (filterYear && e.expenseDate) {
        const y = String(new Date(e.expenseDate).getFullYear())
        if (y !== filterYear) return false
      }
      if (filterStatus && e.paymentStatus !== filterStatus) return false
      if (filterDriver && e.driverName !== filterDriver) return false
      if (dateFrom && e.expenseDate && e.expenseDate < dateFrom) return false
      if (dateTo && e.expenseDate && e.expenseDate > dateTo) return false
      return true
    }).sort((a, b) => {
      const dA = new Date(a.expenseDate || a.date)
      const dB = new Date(b.expenseDate || b.date)
      return sortAsc ? dA - dB : dB - dA
    })
  }, [expenses, search, filterMonth, filterYear, filterStatus, filterDriver, dateFrom, dateTo, sortAsc])

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage)

  function handleFormChange(e) {
    const { name, value, type, files } = e.target
    if (type === 'file' && files?.length) {
      const file = files[0]
      if (file.size > 20 * 1024 * 1024) { alert('File exceeds 20 MB limit'); return }
      const reader = new FileReader()
      reader.onload = () => {
        setForm(prev => ({ ...prev, attachmentName: file.name, attachmentData: reader.result }))
      }
      reader.readAsDataURL(file)
      return
    }
    const updated = { ...form, [name]: value }
    if (['fuelCost', 'loadingCost', 'otherCost'].includes(name)) {
      const { totalCost, vat, withholdingTax, netPayable } = calcTransport(updated)
      Object.assign(updated, { totalCost, vat, withholdingTax, netPayable })
    }
    setForm(updated)
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  function selectDriver(name) {
    const driver = suppliers.find(s => s.name === name)
    setForm(prev => ({
      ...prev,
      driverName: name,
      driverPhone: driver?.phone || '',
      vehiclePlate: driver?.vehiclePlate || prev.vehiclePlate,
      vehicleType: driver?.vehicleType || prev.vehicleType,
    }))
    setSupplierSearch('')
    setShowSupplierDropdown(false)
  }

  const filteredSuppliers = suppliers.filter(s =>
    !supplierSearch || s.name?.toLowerCase().includes(supplierSearch.toLowerCase())
  )

  function validate() {
    const e = {}
    if (!form.driverName.trim()) e.driverName = 'Driver name is required'
    if (!form.expenseDate) e.expenseDate = 'Date is required'
    const fuel = parseFloat(form.fuelCost)
    const loading = parseFloat(form.loadingCost)
    const other = parseFloat(form.otherCost)
    if ((!fuel || fuel <= 0) && (!loading || loading <= 0) && (!other || other <= 0)) {
      e.fuelCost = 'At least one cost must be > 0'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function openAdd() {
    setEditId(null)
    setForm(defaultForm())
    setErrors({})
    setModal(true)
  }

  function openEdit(item) {
    setEditId(item.id)
    setForm({
      expenseDate: item.expenseDate || item.date || today(),
      driverName: item.driverName || '',
      driverPhone: item.driverPhone || '',
      vehiclePlate: item.vehiclePlate || '',
      vehicleType: item.vehicleType || '',
      route: item.route || '',
      materialTransported: item.materialTransported || '',
      quantity: item.quantity || '',
      unit: item.unit || '',
      fuelCost: item.fuelCost || '',
      loadingCost: item.loadingCost || '',
      otherCost: item.otherCost || '',
      totalCost: item.totalCost || 0,
      vat: item.vat || 0,
      withholdingTax: item.withholdingTax || 0,
      netPayable: item.netPayable || 0,
      paymentMethod: item.paymentMethod || '',
      paymentStatus: item.paymentStatus || '',
      bankAccount: item.bankAccount || '',
      transactionReference: item.transactionReference || '',
      receiptNumber: item.receiptNumber || '',
      invoiceNumber: item.invoiceNumber || '',
      fsNumber: item.fsNumber || '',
      attachmentName: item.attachmentName || '',
      attachmentData: item.attachmentData || '',
      notes: item.notes || '',
    })
    setErrors({})
    setModal(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    const payload = { ...form }
    if (editId) editTransportExpense(editId, payload)
    else addTransportExpense(payload)
    setModal(false)
  }

  function handleDuplicate(item) {
    const { id: _id, createdAt: _ca, ...rest } = item
    addTransportExpense(rest)
  }

  function handleView(item) {
    setViewItem(item)
  }

  function handlePrint() {
    printTable(filtered.map(e => ({
      Date: formatDate(e.expenseDate || e.date),
      Driver: e.driverName,
      Vehicle: e.vehiclePlate,
      Route: e.route,
      Material: e.materialTransported || '-',
      'Fuel Cost': e.fuelCost,
      'Loading Cost': e.loadingCost,
      'Other Cost': e.otherCost,
      'Total Cost': e.totalCost,
      'VAT (15%)': e.vat,
      'WHT (3%)': e.withholdingTax,
      'Net Payable': e.netPayable,
      Status: e.paymentStatus,
    })), 'Transport Expenses Report')
  }

  function handleExportExcel() {
    exportToExcel(filtered.map(e => ({
      Date: formatDate(e.expenseDate || e.date),
      Driver: e.driverName,
      Phone: e.driverPhone,
      Vehicle: e.vehiclePlate,
      'Vehicle Type': e.vehicleType,
      Route: e.route,
      Material: e.materialTransported,
      Quantity: e.quantity,
      Unit: e.unit,
      'Fuel Cost': e.fuelCost,
      'Loading Cost': e.loadingCost,
      'Other Cost': e.otherCost,
      'Total Cost': e.totalCost,
      'VAT (15%)': e.vat,
      'WHT (3%)': e.withholdingTax,
      'Net Payable': e.netPayable,
      'Payment Method': e.paymentMethod,
      'Payment Status': e.paymentStatus,
      'Receipt No': e.receiptNumber,
      'Invoice No': e.invoiceNumber,
      Notes: e.notes,
    })), 'transport-expenses')
  }

  function handleExportCSV() {
    exportToCSV(filtered.map(e => ({
      Date: formatDate(e.expenseDate || e.date),
      Driver: e.driverName,
      Vehicle: e.vehiclePlate,
      Route: e.route,
      Material: e.materialTransported,
      'Total Cost': e.totalCost,
      'VAT': e.vat,
      'WHT': e.withholdingTax,
      'Net Payable': e.netPayable,
      Status: e.paymentStatus,
    })), 'transport-expenses')
  }

  function resetFilters() {
    setSearch('')
    setFilterMonth('')
    setFilterYear('')
    setFilterStatus('')
    setFilterDriver('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
  }

  function handleSupplierSave(e) {
    e.preventDefault()
    if (!supplierForm.name.trim()) return
    addTransportSupplier(supplierForm)
    setSupplierModal(false)
    setSupplierForm({ name: '', phone: '', vehiclePlate: '', vehicleType: '', route: '' })
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data_ = new Uint8Array(ev.target.result)
        const workbook = XLSX.read(data_, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        if (json.length === 0) { alert('No data found'); return }
        setImportData(json)
        setImportColumns(Object.keys(json[0]))
        setColumnMap({})
        setImportMapped([])
        setImportPreview(null)
        setImportModal(true)
      } catch (err) { alert('Failed to parse: ' + err.message) }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  function toDateStr(val) {
    if (!val) return ''
    if (typeof val === 'object' && val instanceof Date && !isNaN(val)) {
      const y = val.getFullYear()
      const m = String(val.getMonth() + 1).padStart(2, '0')
      const d = String(val.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    const s = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    return s
  }

  function applyMapping() {
    const mapped = importData.map(row => {
      const get = (field) => row[columnMap[field]] || ''
      const fuel = parseFloat(get('fuelCost')) || 0
      const loading = parseFloat(get('loadingCost')) || 0
      const other = parseFloat(get('otherCost')) || 0
      const totalCost = fuel + loading + other
      const vat = totalCost * 0.15
      const withholdingTax = totalCost * 0.03
      const netPayable = totalCost + vat - withholdingTax
      return {
        expenseDate: toDateStr(get('expenseDate')) || today(),
        driverName: get('driverName'),
        vehiclePlate: get('vehiclePlate'),
        route: get('route'),
        materialTransported: get('materialTransported'),
        fuelCost: fuel,
        loadingCost: loading,
        otherCost: other,
        totalCost, vat, withholdingTax, netPayable,
        paymentStatus: get('paymentStatus'),
        notes: get('notes'),
      }
    })
    const valid = mapped.filter(m => m.driverName)
    const invalid = mapped.filter(m => !m.driverName)
    setImportMapped(mapped)
    setImportPreview({
      total: mapped.length,
      valid: valid.length,
      invalid: invalid.length,
      totalCost: valid.reduce((s, m) => s + m.totalCost, 0),
      vat: valid.reduce((s, m) => s + m.vat, 0),
      wht: valid.reduce((s, m) => s + m.withholdingTax, 0),
      net: valid.reduce((s, m) => s + m.netPayable, 0),
    })
  }

  function confirmImport() {
    const valid = importMapped.filter(m => m.driverName)
    valid.forEach(m => addTransportExpense(m))
    addTransportImportLog({ count: valid.length, source: 'import' })
    setImportModal(false)
    setImportData([])
    setImportPreview(null)
  }

  function removeAttachment() {
    setForm(prev => ({ ...prev, attachmentName: '', attachmentData: '' }))
  }

  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ]
  const years = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - 5 + i))

  const chartMonthly = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const d = new Date(e.expenseDate || e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { totalCost: 0, vat: 0, wht: 0, net: 0 }
      map[key].totalCost += parseFloat(e.totalCost) || 0
      map[key].vat += parseFloat(e.vat) || 0
      map[key].wht += parseFloat(e.withholdingTax) || 0
      map[key].net += parseFloat(e.netPayable) || 0
    })
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    return {
      labels: sorted.map(([k]) => k),
      totals: sorted.map(([, v]) => v.totalCost),
      vats: sorted.map(([, v]) => v.vat),
      whts: sorted.map(([, v]) => v.wht),
      nets: sorted.map(([, v]) => v.net),
    }
  }, [expenses])

  const chartDrivers = useMemo(() => {
    const map = {}
    expenses.forEach(e => {
      const n = e.driverName || 'Unknown'
      map[n] = (map[n] || 0) + (parseFloat(e.netPayable) || 0)
    })
    const sorted = Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 10)
    return { labels: sorted.map(([k]) => k), values: sorted.map(([, v]) => v) }
  }, [expenses])

  const chartCostBreakdown = useMemo(() => {
    const fuel = expenses.reduce((s, e) => s + (parseFloat(e.fuelCost) || 0), 0)
    const loading = expenses.reduce((s, e) => s + (parseFloat(e.loadingCost) || 0), 0)
    const other = expenses.reduce((s, e) => s + (parseFloat(e.otherCost) || 0), 0)
    return { labels: ['Fuel', 'Loading', 'Other'], values: [fuel, loading, other] }
  }, [expenses])

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: Truck },
    { id: 'drivers', label: 'Drivers', icon: Package },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'import', label: 'Import', icon: Upload },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Transport Expenses</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Export Excel"><FileSpreadsheet size={18} /></button>
          <button onClick={handleExportCSV} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Export CSV"><Download size={18} /></button>
          <button onClick={handlePrint} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white" title="Print"><Printer size={18} /></button>
          {hasPermission('expenses', 'create') && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> New Transport
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === t.id ? 'bg-card text-primary border border-border border-b-0' : 'text-muted hover:text-white'
            }`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'expenses' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <SummaryCard title="Total Transport Cost" value={formatCurrency(summary.totalCost)} color="blue" />
            <SummaryCard title="Total VAT Paid" value={formatCurrency(summary.totalVAT)} color="yellow" />
            <SummaryCard title="Total Withholding Tax" value={formatCurrency(summary.totalWHT)} color="orange" />
            <SummaryCard title="Total Net Payments" value={formatCurrency(summary.totalNet)} color="green" />
            <SummaryCard title="Number of Trips" value={summary.count} color="purple" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input type="text" placeholder="Search driver, vehicle, route..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                className="w-full bg-bg border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-muted" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  showFilters || filterMonth || filterYear || filterStatus || filterDriver || dateFrom || dateTo
                    ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card border-border text-muted hover:text-white'
                }`}>
                <Filter size={15} /> Filters
              </button>
              {(filterMonth || filterYear || filterStatus || filterDriver || dateFrom || dateTo) && (
                <button onClick={resetFilters} className="text-xs text-muted hover:text-white px-2">Clear</button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setCurrentPage(1) }} className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">All Months</option>
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select value={filterYear} onChange={e => { setFilterYear(e.target.value); setCurrentPage(1) }} className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }} className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">All Statuses</option>
                  {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterDriver} onChange={e => { setFilterDriver(e.target.value); setCurrentPage(1) }} className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">All Drivers</option>
                  {[...new Set(expenses.map(e => e.driverName).filter(Boolean))].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1) }} className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" placeholder="From" />
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1) }} className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white" placeholder="To" />
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left p-3 cursor-pointer select-none" onClick={() => setSortAsc(!sortAsc)}>
                    <span className="flex items-center gap-1">Date <ArrowUpDown size={12} className={`transition-opacity ${sortAsc ? 'text-primary' : 'text-muted'}`} /></span>
                  </th>
                  <th className="text-left p-3">Driver</th>
                  <th className="text-left p-3">Vehicle</th>
                  <th className="text-left p-3">Route</th>
                  <th className="text-right p-3">Fuel</th>
                  <th className="text-right p-3">Loading</th>
                  <th className="text-right p-3">Other</th>
                  <th className="text-right p-3">Total Cost</th>
                  <th className="text-right p-3">VAT</th>
                  <th className="text-right p-3">WHT</th>
                  <th className="text-right p-3">Net Payable</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-center p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(e => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-white/5">
                    <td className="p-3 whitespace-nowrap">{formatDate(e.expenseDate || e.date)}</td>
                    <td className="p-3">{e.driverName}</td>
                    <td className="p-3">{e.vehiclePlate}</td>
                    <td className="p-3">{e.route || '-'}</td>
                    <td className="p-3 text-right">{formatCurrency(e.fuelCost)}</td>
                    <td className="p-3 text-right">{formatCurrency(e.loadingCost)}</td>
                    <td className="p-3 text-right">{formatCurrency(e.otherCost)}</td>
                    <td className="p-3 text-right text-danger font-medium">{formatCurrency(e.totalCost)}</td>
                    <td className="p-3 text-right text-yellow-400">{formatCurrency(e.vat)}</td>
                    <td className="p-3 text-right text-orange-400">{formatCurrency(e.withholdingTax)}</td>
                    <td className="p-3 text-right text-success font-medium">{formatCurrency(e.netPayable)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        e.paymentStatus === 'Paid' ? 'bg-success/10 text-success' :
                        e.paymentStatus === 'Partially Paid' ? 'bg-warning/10 text-warning' :
                        e.paymentStatus === 'Pending' ? 'bg-danger/10 text-danger' : 'bg-muted/10 text-muted'
                      }`}>{e.paymentStatus || '-'}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleView(e)} className="p-1.5 text-muted hover:text-primary" title="View"><Eye size={15} /></button>
                        {hasPermission('expenses', 'update') && (
                          <button onClick={() => openEdit(e)} className="p-1.5 text-muted hover:text-primary" title="Edit"><Pencil size={15} /></button>
                        )}
                        {hasPermission('expenses', 'delete') && (
                          <button onClick={() => { if (confirm('Delete this expense?')) deleteTransportExpense(e.id) }} className="p-1.5 text-muted hover:text-danger" title="Delete"><Trash2 size={15} /></button>
                        )}
                        {hasPermission('expenses', 'create') && (
                          <button onClick={() => handleDuplicate(e)} className="p-1.5 text-muted hover:text-warning" title="Duplicate"><Copy size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={13} className="p-6 text-center text-muted">No transport expenses found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted">
              <span>{filtered.length} total records</span>
              <div className="flex items-center gap-2">
                <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}
                  className="px-3 py-1 rounded bg-card border border-border disabled:opacity-40 hover:text-white">Prev</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) pageNum = i + 1
                  else if (currentPage <= 3) pageNum = i + 1
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                  else pageNum = currentPage - 2 + i
                  return (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded text-xs ${currentPage === pageNum ? 'bg-primary text-white' : 'bg-card border border-border hover:text-white'}`}>
                      {pageNum}
                    </button>
                  )
                })}
                <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
                  className="px-3 py-1 rounded bg-card border border-border disabled:opacity-40 hover:text-white">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Driver Profiles</h2>
            <button onClick={() => { setSupplierForm({ name: '', phone: '', vehiclePlate: '', vehicleType: '', route: '' }); setSupplierModal(true) }}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus size={16} /> Add Driver
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suppliers.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{s.name}</h3>
                  <button onClick={() => { if (confirm('Delete driver?')) deleteTransportSupplier(s.id) }} className="text-muted hover:text-danger p-1"><Trash2 size={14} /></button>
                </div>
                {s.phone && <p className="text-xs text-muted">Phone: {s.phone}</p>}
                {s.vehiclePlate && <p className="text-xs text-muted">Vehicle: {s.vehiclePlate} {s.vehicleType && `(${s.vehicleType})`}</p>}
                {s.route && <p className="text-xs text-muted">Route: {s.route}</p>}
              </div>
            ))}
            {suppliers.length === 0 && <p className="text-muted text-sm col-span-full">No drivers added yet</p>}
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 text-muted">Monthly Transport Costs</h3>
              {chartMonthly.labels.length > 0 ? (
                <Bar data={{
                  labels: chartMonthly.labels,
                  datasets: [
                    { label: 'Total Cost', data: chartMonthly.totals, backgroundColor: '#3B82F6', borderRadius: 4 },
                    { label: 'VAT', data: chartMonthly.vats, backgroundColor: '#F59E0B', borderRadius: 4 },
                    { label: 'WHT', data: chartMonthly.whts, backgroundColor: '#EF4444', borderRadius: 4 },
                  ]
                }} options={chartOptions} />
              ) : <p className="text-muted text-sm py-8 text-center">No data</p>}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 text-muted">Net Payable Trend</h3>
              {chartMonthly.labels.length > 0 ? (
                <Line data={{
                  labels: chartMonthly.labels,
                  datasets: [{ label: 'Net Payable', data: chartMonthly.nets, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 }]
                }} options={chartOptions} />
              ) : <p className="text-muted text-sm py-8 text-center">No data</p>}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 text-muted">Top Drivers</h3>
              {chartDrivers.labels.length > 0 ? (
                <Bar data={{
                  labels: chartDrivers.labels,
                  datasets: [{ label: 'Net Payable', data: chartDrivers.values, backgroundColor: '#3B82F6', borderRadius: 4 }]
                }} options={{ ...chartOptions, indexAxis: 'y' }} />
              ) : <p className="text-muted text-sm py-8 text-center">No data</p>}
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium mb-3 text-muted">Cost Breakdown</h3>
              {chartCostBreakdown.values.some(v => v > 0) ? (
                <Doughnut data={{
                  labels: chartCostBreakdown.labels,
                  datasets: [{ data: chartCostBreakdown.values, backgroundColor: ['#3B82F6', '#F59E0B', '#EF4444'] }]
                }} options={chartOptions} />
              ) : <p className="text-muted text-sm py-8 text-center">No data</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Daily', 'Weekly', 'Monthly', 'Driver', 'Route', 'Cost Analysis', 'VAT Report', 'Withholding Report'].map(r => (
              <button key={r} onClick={() => {
                const reportData = filtered.map(e => ({
                  Date: formatDate(e.expenseDate || e.date),
                  Driver: e.driverName, Vehicle: e.vehiclePlate,
                  Route: e.route || '-',
                  'Fuel Cost': e.fuelCost, 'Loading Cost': e.loadingCost,
                  'Other Cost': e.otherCost, 'Total Cost': e.totalCost,
                  'VAT (15%)': e.vat, 'WHT (3%)': e.withholdingTax,
                  'Net Payable': e.netPayable, Status: e.paymentStatus,
                }))
                printTable(reportData, `${r} Report - Transport Expenses`)
              }} className="px-3 py-2 bg-card border border-border rounded-lg text-xs text-muted hover:text-white">{r}</button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'import' && (
        <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
          <Upload size={40} className="mx-auto text-muted" />
          <h2 className="text-lg font-semibold">Import Transport Expenses</h2>
          <p className="text-sm text-muted">Upload a CSV or Excel (.xlsx) file to bulk import transport expenses</p>
          <input ref={importFileRef} type="file" accept=".csv,.xlsx" onChange={handleImportFile} className="hidden" />
          <button onClick={() => importFileRef.current?.click()} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Upload size={16} className="inline mr-2" /> Import Expenses
          </button>
          <div className="text-xs text-muted">Supported columns: Driver, Vehicle, Route, Fuel Cost, Loading Cost, Other Cost, Date, Payment Status, Notes</div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Edit Transport Expense' : 'New Transport Expense'} size="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-medium text-muted mb-3">Trip Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <FormField label="Driver Name" name="driverName" required>
                  <div className="relative">
                    <input type="text" value={form.driverName} onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); setForm(prev => ({ ...prev, driverName: e.target.value, driverPhone: '', vehiclePlate: '' })) }}
                      onFocus={() => { setSupplierSearch(''); setShowSupplierDropdown(true) }}
                      placeholder="Search or select driver..."
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
                    {showSupplierDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg max-h-48 overflow-y-auto shadow-lg">
                        {filteredSuppliers.map(s => (
                          <button key={s.id} type="button" onClick={() => selectDriver(s.name)}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/5">{s.name} {s.vehiclePlate && <span className="text-muted">({s.vehiclePlate})</span>}</button>
                        ))}
                        {filteredSuppliers.length === 0 && supplierSearch.trim() && (
                          <button type="button" onClick={() => {
                            setSupplierForm({ name: supplierSearch, phone: '', vehiclePlate: '', vehicleType: '', route: '' })
                            setSupplierModal(true)
                            setShowSupplierDropdown(false)
                          }} className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-white/5">
                            <Plus size={14} className="inline mr-1" /> Add "{supplierSearch}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </FormField>
                {errors.driverName && <p className="text-danger text-xs mt-1">{errors.driverName}</p>}
              </div>
              <FormField label="Driver Phone" name="driverPhone" value={form.driverPhone} onChange={handleFormChange} />
              <FormField label="Vehicle Plate" name="vehiclePlate" value={form.vehiclePlate} onChange={handleFormChange} />
              <FormField label="Vehicle Type" name="vehicleType" placeholder="e.g. Dump Truck, Trailer" value={form.vehicleType} onChange={handleFormChange} />
              <div className="sm:col-span-2">
                <FormField label="Route / Destination" name="route" value={form.route} onChange={handleFormChange} />
              </div>
              <FormField label="Material Transported" name="materialTransported" value={form.materialTransported} onChange={handleFormChange} />
              <div className="flex gap-2">
                <div className="flex-1">
                  <FormField label="Quantity" name="quantity" type="number" step="0.01" value={form.quantity} onChange={handleFormChange} />
                </div>
                <div className="w-24">
                  <FormField label="Unit" name="unit">
                    <select name="unit" value={form.unit} onChange={handleFormChange} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">Unit</option>
                      <option value="Ton">Ton</option>
                      <option value="m³">m³</option>
                      <option value="Trip">Trip</option>
                    </select>
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-medium text-muted mb-3">Cost Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Fuel Cost (ETB)" name="fuelCost" type="number" step="0.01" min="0" value={form.fuelCost} onChange={handleFormChange} />
              <FormField label="Loading Cost (ETB)" name="loadingCost" type="number" step="0.01" min="0" value={form.loadingCost} onChange={handleFormChange} />
              <FormField label="Other Cost (ETB)" name="otherCost" type="number" step="0.01" min="0" value={form.otherCost} onChange={handleFormChange} />
              {errors.fuelCost && <p className="text-danger text-xs col-span-full">{errors.fuelCost}</p>}
            </div>
          </div>

          <div className="bg-bg border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-muted mb-3">Calculation Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted">Total Cost</p>
                <p className="text-lg font-bold text-white">{formatCurrency(form.totalCost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">VAT (15%)</p>
                <p className="text-lg font-bold text-yellow-400">+ {formatCurrency(form.vat)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Withholding Tax (3%)</p>
                <p className="text-lg font-bold text-orange-400">- {formatCurrency(form.withholdingTax)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Net Payable</p>
                <p className="text-lg font-bold text-success">{formatCurrency(form.netPayable)}</p>
              </div>
            </div>
          </div>

          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-medium text-muted mb-3">Payment Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Payment Method" name="paymentMethod">
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleFormChange} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select method</option>
                  {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </FormField>
              <FormField label="Payment Status" name="paymentStatus">
                <select name="paymentStatus" value={form.paymentStatus} onChange={handleFormChange} className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">Select status</option>
                  {paymentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Bank Account" name="bankAccount" value={form.bankAccount} onChange={handleFormChange} placeholder="Optional" />
              <FormField label="Transaction Reference" name="transactionReference" value={form.transactionReference} onChange={handleFormChange} placeholder="Optional" />
            </div>
          </div>

          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-medium text-muted mb-3">Document Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Expense Date" name="expenseDate" type="date" value={form.expenseDate} onChange={handleFormChange} required />
              {errors.expenseDate && <p className="text-danger text-xs mt-1">{errors.expenseDate}</p>}
              <FormField label="Receipt Number" name="receiptNumber" value={form.receiptNumber} onChange={handleFormChange} />
              <FormField label="Invoice Number" name="invoiceNumber" value={form.invoiceNumber} onChange={handleFormChange} />
              <FormField label="FS Number" name="fsNumber" value={form.fsNumber} onChange={handleFormChange} placeholder="Fiscal Sales Number" />
            </div>
          </div>

          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-medium text-muted mb-3">Attachment</h3>
            {form.attachmentData ? (
              <div className="flex items-center gap-3 bg-bg border border-border rounded-lg p-3">
                {form.attachmentData.startsWith('data:image') ? (
                  <img src={form.attachmentData} alt="Receipt" className="w-16 h-16 object-cover rounded" />
                ) : (
                  <FileType size={32} className="text-muted" />
                )}
                <span className="text-sm text-white flex-1 truncate">{form.attachmentName}</span>
                <button type="button" onClick={removeAttachment} className="text-danger hover:text-danger/80"><X size={16} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-3 bg-bg border border-dashed border-border rounded-lg text-sm text-muted hover:text-white w-full">
                <Image size={16} /> Upload Receipt (PDF, JPG, PNG - Max 20 MB)
              </button>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFormChange} className="hidden" />
          </div>

          <div>
            <FormField label="Notes" name="notes" type="textarea" value={form.notes} onChange={handleFormChange} rows={3} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              {editId ? 'Update' : 'Save'} Transport
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Transport Expense Details" size="max-w-xl">
        {viewItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted">Date:</span> <span className="text-white">{formatDate(viewItem.expenseDate || viewItem.date)}</span></div>
              <div><span className="text-muted">Driver:</span> <span className="text-white">{viewItem.driverName}</span></div>
              <div><span className="text-muted">Vehicle:</span> <span className="text-white">{viewItem.vehiclePlate || '-'}</span></div>
              <div><span className="text-muted">Route:</span> <span className="text-white">{viewItem.route || '-'}</span></div>
              <div><span className="text-muted">Fuel Cost:</span> <span className="text-white">{formatCurrency(viewItem.fuelCost)}</span></div>
              <div><span className="text-muted">Loading Cost:</span> <span className="text-white">{formatCurrency(viewItem.loadingCost)}</span></div>
              <div><span className="text-muted">Other Cost:</span> <span className="text-white">{formatCurrency(viewItem.otherCost)}</span></div>
              <div><span className="text-muted">Total Cost:</span> <span className="text-white">{formatCurrency(viewItem.totalCost)}</span></div>
              <div><span className="text-muted">VAT (15%):</span> <span className="text-yellow-400">{formatCurrency(viewItem.vat)}</span></div>
              <div><span className="text-muted">WHT (3%):</span> <span className="text-orange-400">{formatCurrency(viewItem.withholdingTax)}</span></div>
              <div><span className="text-muted">Net Payable:</span> <span className="text-success font-bold">{formatCurrency(viewItem.netPayable)}</span></div>
              <div><span className="text-muted">Status:</span> <span className="text-white">{viewItem.paymentStatus || '-'}</span></div>
              {viewItem.notes && <div className="col-span-2"><span className="text-muted">Notes:</span> <span className="text-white">{viewItem.notes}</span></div>}
            </div>
            {viewItem.attachmentData && (
              <div>
                <p className="text-sm text-muted mb-2">Attachment: {viewItem.attachmentName}</p>
                {viewItem.attachmentData.startsWith('data:image') ? (
                  <img src={viewItem.attachmentData} alt="Receipt" className="max-w-full max-h-64 rounded-lg" />
                ) : (
                  <a href={viewItem.attachmentData} download={viewItem.attachmentName} className="text-primary hover:underline text-sm">Download {viewItem.attachmentName}</a>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={supplierModal} onClose={() => setSupplierModal(false)} title="Add Driver" size="max-w-md">
        <form onSubmit={handleSupplierSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <FormField label="Driver Name" name="supName" required>
              <input type="text" value={supplierForm.name} onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))} required
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
            </FormField>
          </div>
          <FormField label="Phone" name="supPhone">
            <input type="text" value={supplierForm.phone} onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
          </FormField>
          <FormField label="Vehicle Plate" name="supVehicle">
            <input type="text" value={supplierForm.vehiclePlate} onChange={e => setSupplierForm(p => ({ ...p, vehiclePlate: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
          </FormField>
          <FormField label="Vehicle Type" name="supVehicleType">
            <select value={supplierForm.vehicleType} onChange={e => setSupplierForm(p => ({ ...p, vehicleType: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
              <option value="">Select type</option>
              <option value="Dump Truck">Dump Truck</option>
              <option value="Trailer">Trailer</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Tipper">Tipper</option>
              <option value="Pickup">Pickup</option>
              <option value="Other">Other</option>
            </select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Usual Route" name="supRoute">
              <input type="text" value={supplierForm.route} onChange={e => setSupplierForm(p => ({ ...p, route: e.target.value }))}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted" />
            </FormField>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setSupplierModal(false)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">Save Driver</button>
          </div>
        </form>
      </Modal>

      <Modal open={importModal} onClose={() => { setImportModal(false); setImportPreview(null) }} title="Import Transport Expenses" size="max-w-3xl">
        <div className="space-y-4">
          {!importPreview ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">Map your file columns to the system fields:</p>
              <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                {['driverName', 'vehiclePlate', 'route', 'materialTransported', 'fuelCost', 'loadingCost', 'otherCost', 'expenseDate', 'paymentStatus', 'notes'].map(field => (
                  <div key={field} className="space-y-1">
                    <label className="text-xs text-muted block">{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                    <select value={columnMap[field] || ''} onChange={e => setColumnMap(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white">
                      <option value="">- Skip -</option>
                      {importColumns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted max-h-32 overflow-y-auto bg-bg rounded-lg p-3">
                <p className="font-medium mb-1">Preview (first row):</p>
                {importData[0] && Object.entries(importData[0]).map(([k, v]) => (
                  <div key={k} className="flex gap-2"><span className="text-primary">{k}:</span> <span>{String(v).slice(0, 60)}</span></div>
                ))}
              </div>
              <button onClick={applyMapping} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                Preview Import
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-bg rounded-lg p-3 text-center"><p className="text-xs text-muted">Total</p><p className="text-lg font-bold">{importPreview.total}</p></div>
                <div className="bg-bg rounded-lg p-3 text-center"><p className="text-xs text-muted">Valid</p><p className="text-lg font-bold text-success">{importPreview.valid}</p></div>
                <div className="bg-bg rounded-lg p-3 text-center"><p className="text-xs text-muted">Invalid</p><p className="text-lg font-bold text-danger">{importPreview.invalid}</p></div>
                <div className="bg-bg rounded-lg p-3 text-center"><p className="text-xs text-muted">Total Cost</p><p className="text-lg font-bold">{formatCurrency(importPreview.totalCost)}</p></div>
                <div className="bg-bg rounded-lg p-3 text-center"><p className="text-xs text-muted">Total Net</p><p className="text-lg font-bold text-success">{formatCurrency(importPreview.net)}</p></div>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-muted border-b border-border"><th className="text-left p-2">Driver</th><th className="text-right p-2">Fuel</th><th className="text-right p-2">Loading</th><th className="text-right p-2">Other</th><th className="text-right p-2">Total</th><th className="text-right p-2">Net</th></tr></thead>
                  <tbody>
                    {importMapped.slice(0, 20).map((m, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-2">{m.driverName || <span className="text-danger">Missing</span>}</td>
                        <td className="p-2 text-right">{formatCurrency(m.fuelCost)}</td>
                        <td className="p-2 text-right">{formatCurrency(m.loadingCost)}</td>
                        <td className="p-2 text-right">{formatCurrency(m.otherCost)}</td>
                        <td className="p-2 text-right">{formatCurrency(m.totalCost)}</td>
                        <td className="p-2 text-right text-success">{formatCurrency(m.netPayable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setImportPreview(null)} className="px-4 py-2 text-sm text-muted hover:text-white">Back</button>
                <button onClick={confirmImport} className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                  Import {importPreview.valid} Records
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
