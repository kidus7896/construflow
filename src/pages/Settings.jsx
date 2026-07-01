import { useState, useRef } from 'react'
import { useStore } from '../store/useStore'
import FormField from '../components/FormField'
import { Save, Upload, Download, Trash2, AlertTriangle } from 'lucide-react'

export default function Settings() {
  const { data, updateSettings, exportData, importData, clearAllData } = useStore()
  const [saved, setSaved] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    companyName: data.settings?.companyName || '',
    tinNumber: data.settings?.tinNumber || '',
    address: data.settings?.address || '',
    phone: data.settings?.phone || '',
    email: data.settings?.email || '',
    vatRate: data.settings?.vatRate || 15,
    withholdingRate: data.settings?.withholdingRate || 3,
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm({ ...form, [name]: name === 'vatRate' || name === 'withholdingRate' ? parseFloat(value) || 0 : value })
  }

  function handleSave() {
    updateSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleExport() {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `construction-flow-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importData(ev.target.result)
      setImportMsg(ok ? 'Data restored successfully!' : 'Invalid file format')
      setTimeout(() => setImportMsg(''), 3000)
    }
    reader.readAsText(file)
  }

  function handleClearAll() {
    if (confirm('Are you sure? This will delete ALL data permanently.')) {
      if (confirm('This cannot be undone! Continue?')) {
        clearAllData()
        setForm({
          companyName: '', tinNumber: '', address: '', phone: '', email: '',
          vatRate: 15, withholdingRate: 3,
        })
      }
    }
  }

  const inputClass = "w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-muted focus:ring-1 focus:ring-primary focus:border-primary"

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Company Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Company Name" name="companyName" value={form.companyName} onChange={handleChange}>
            <input type="text" name="companyName" value={form.companyName} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="TIN Number" name="tinNumber" value={form.tinNumber} onChange={handleChange}>
            <input type="text" name="tinNumber" value={form.tinNumber} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Address" name="address" value={form.address} onChange={handleChange}>
            <input type="text" name="address" value={form.address} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange}>
            <input type="text" name="phone" value={form.phone} onChange={handleChange} className={inputClass} />
          </FormField>
          <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange}>
            <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} />
          </FormField>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Tax Rates</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="VAT Rate (%)" name="vatRate" type="number" step="0.1" value={form.vatRate} onChange={handleChange} />
          <FormField label="Withholding Rate (%)" name="withholdingRate" type="number" step="0.1" value={form.withholdingRate} onChange={handleChange} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Save size={16} /> Save Settings
        </button>
        {saved && <span className="text-sm text-success">Settings saved!</span>}
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Data Management</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 bg-card border border-border text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5">
              <Download size={16} /> Export / Backup Data
            </button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 bg-card border border-border text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5">
              <Upload size={16} /> Restore Data
            </button>
            <input type="file" ref={fileRef} onChange={handleImport} accept=".json" className="hidden" />
            {importMsg && <span className={`text-sm ${importMsg.includes('success') ? 'text-success' : 'text-danger'}`}>{importMsg}</span>}
          </div>
          <button onClick={handleClearAll} className="flex items-center gap-2 bg-danger/10 text-danger border border-danger/30 px-4 py-2 rounded-lg text-sm font-medium hover:bg-danger/20">
            <Trash2 size={16} /> Clear All Data
          </button>
        </div>
      </div>
    </div>
  )
}
