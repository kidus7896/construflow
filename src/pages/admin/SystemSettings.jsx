import { useState } from 'react'
import { Settings, Save, Image, Mail, Globe, Key, Wrench } from 'lucide-react'
import { useStore } from '../../store/useStore'

export default function AdminSystemSettings() {
  const { data, updateSettings, addActivityLog } = useStore()
  const [activeSection, setActiveSection] = useState('general')
  const [form, setForm] = useState({
    appName: 'ConstruFlow',
    logo: '',
    favicon: '',
    defaultCurrency: 'ETB',
    defaultVatRate: data.settings?.vatRate || 15,
    defaultWhtRate: data.settings?.withholdingRate || 3,
    smtpHost: '',
    smtpPort: '587',
    smtpEmail: '',
    smtpPassword: '',
    smsGateway: '',
    storageProvider: 'local',
    apiKeys: '',
    maintenanceMode: false,
    version: '1.0.0',
  })

  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    updateSettings({ vatRate: Number(form.defaultVatRate), withholdingRate: Number(form.defaultWhtRate) })
    localStorage.setItem('cf_system_settings', JSON.stringify(form))
    addActivityLog('system_settings_updated', 'System settings updated')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'email', label: 'SMTP Email', icon: Mail },
    { id: 'localization', label: 'Localization', icon: Globe },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Settings</h1>
        {saved && <span className="text-sm text-success">Settings saved!</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              activeSection === s.id ? 'bg-primary text-white' : 'bg-card border border-border text-muted hover:text-white'
            }`}>
            <s.icon size={16} /> {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {activeSection === 'general' && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold">General Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">Application Name</label>
                <input value={form.appName} onChange={e => setForm({ ...form, appName: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Version</label>
                <input value={form.version} onChange={e => setForm({ ...form, version: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Logo URL</label>
                <div className="flex items-center gap-2">
                  <Image size={16} className="text-muted" />
                  <input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} placeholder="/logo.svg"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Favicon URL</label>
                <div className="flex items-center gap-2">
                  <Image size={16} className="text-muted" />
                  <input value={form.favicon} onChange={e => setForm({ ...form, favicon: e.target.value })} placeholder="/favicon.svg"
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'email' && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold">SMTP Email Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">SMTP Host</label>
                <input value={form.smtpHost} onChange={e => setForm({ ...form, smtpHost: e.target.value })} placeholder="smtp.example.com"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">SMTP Port</label>
                <input value={form.smtpPort} onChange={e => setForm({ ...form, smtpPort: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">SMTP Email</label>
                <input type="email" value={form.smtpEmail} onChange={e => setForm({ ...form, smtpEmail: e.target.value })} placeholder="noreply@construflow.com"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">SMTP Password</label>
                <input type="password" value={form.smtpPassword} onChange={e => setForm({ ...form, smtpPassword: e.target.value })} placeholder="••••••••"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'localization' && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold">Localization</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">Default Currency</label>
                <select value={form.defaultCurrency} onChange={e => setForm({ ...form, defaultCurrency: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                  <option value="ETB">ETB - Ethiopian Birr</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Default VAT Rate (%)</label>
                <input type="number" step="0.1" value={form.defaultVatRate} onChange={e => setForm({ ...form, defaultVatRate: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Default WHT Rate (%)</label>
                <input type="number" step="0.1" value={form.defaultWhtRate} onChange={e => setForm({ ...form, defaultWhtRate: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'integrations' && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold">Integrations & API</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">SMS Gateway</label>
                <input value={form.smsGateway} onChange={e => setForm({ ...form, smsGateway: e.target.value })} placeholder="SMS provider URL"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted">Storage Provider</label>
                <select value={form.storageProvider} onChange={e => setForm({ ...form, storageProvider: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
                  <option value="local">Local Storage</option>
                  <option value="s3">Amazon S3</option>
                  <option value="gcs">Google Cloud Storage</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm text-muted">API Keys (JSON format)</label>
                <textarea rows={3} value={form.apiKeys} onChange={e => setForm({ ...form, apiKeys: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:ring-1 focus:ring-primary resize-none" placeholder='{"stripe": "sk_...", "sendgrid": "SG..."}' />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'maintenance' && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <h2 className="font-semibold">Maintenance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted">Block user access during maintenance. Only Super Admin can access.</p>
              </div>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                className={`w-12 h-6 rounded-full transition-colors ${form.maintenanceMode ? 'bg-warning' : 'bg-muted/30'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        )}

        <button type="submit" className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90">
          <Save size={16} /> Save Settings
        </button>
      </form>
    </div>
  )
}