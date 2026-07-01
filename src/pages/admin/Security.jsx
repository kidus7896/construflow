import { useState } from 'react'
import { Lock, Shield, Save } from 'lucide-react'

export default function AdminSecurity() {
  const [settings, setSettings] = useState({
    twoFactor: false,
    ipRestrictions: false,
    sessionTimeout: '30',
    passwordPolicy: 'medium',
    failedLoginDetection: true,
    deviceTracking: false,
  })

  function handleToggle(key) {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security Settings</h1>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Two-Factor Authentication</p>
            <p className="text-xs text-muted">Require 2FA for admin accounts</p>
          </div>
          <button onClick={() => handleToggle('twoFactor')}
            className={`w-12 h-6 rounded-full transition-colors ${settings.twoFactor ? 'bg-primary' : 'bg-muted/30'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.twoFactor ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">IP Restrictions</p>
            <p className="text-xs text-muted">Restrict access by IP address</p>
          </div>
          <button onClick={() => handleToggle('ipRestrictions')}
            className={`w-12 h-6 rounded-full transition-colors ${settings.ipRestrictions ? 'bg-primary' : 'bg-muted/30'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.ipRestrictions ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Failed Login Detection</p>
            <p className="text-xs text-muted">Lock account after 5 failed attempts</p>
          </div>
          <button onClick={() => handleToggle('failedLoginDetection')}
            className={`w-12 h-6 rounded-full transition-colors ${settings.failedLoginDetection ? 'bg-primary' : 'bg-muted/30'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.failedLoginDetection ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Device Tracking</p>
            <p className="text-xs text-muted">Track and display login device info</p>
          </div>
          <button onClick={() => handleToggle('deviceTracking')}
            className={`w-12 h-6 rounded-full transition-colors ${settings.deviceTracking ? 'bg-primary' : 'bg-muted/30'}`}>
            <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.deviceTracking ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h2 className="font-semibold">Session & Password Policy</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-muted">Session Timeout (minutes)</label>
            <select value={settings.sessionTimeout} onChange={e => setSettings(prev => ({ ...prev, sessionTimeout: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="0">Never</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted">Password Policy</label>
            <select value={settings.passwordPolicy} onChange={e => setSettings(prev => ({ ...prev, passwordPolicy: e.target.value }))}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary">
              <option value="low">Low - any password</option>
              <option value="medium">Medium - min 8 chars</option>
              <option value="high">High - min 12 chars, special chars</option>
            </select>
          </div>
        </div>
      </div>

      <button className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
        <Save size={16} /> Save Security Settings
      </button>
    </div>
  )
}
