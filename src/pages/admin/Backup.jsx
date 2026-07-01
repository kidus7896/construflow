import { useState } from 'react'
import { Database, Download, Upload, RefreshCw, Cloud, Clock } from 'lucide-react'

export default function AdminBackup() {
  const [backups, setBackups] = useState([])
  const [running, setRunning] = useState(false)

  function handleBackup() {
    setRunning(true)
    setTimeout(() => {
      const data = localStorage.getItem('construction_flow_data')
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `construflow-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setBackups(prev => [{ date: new Date().toISOString(), size: `${(blob.size / 1024).toFixed(1)} KB`, type: 'Manual' }, ...prev])
      setRunning(false)
    }, 1000)
  }

  function handleRestore() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result)
          localStorage.setItem('construction_flow_data', JSON.stringify(data))
          alert('Data restored! Please refresh the page.')
          window.location.reload()
        } catch { alert('Invalid backup file') }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Backup & Restore</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={handleBackup} disabled={running}
          className="bg-card border border-border rounded-xl p-6 hover:bg-white/5 transition-colors text-left">
          <Database size={24} className="text-primary mb-2" />
          <p className="font-medium">{running ? 'Backing up...' : 'Manual Backup'}</p>
          <p className="text-xs text-muted mt-1">Download a full data backup</p>
        </button>
        <button onClick={handleRestore}
          className="bg-card border border-border rounded-xl p-6 hover:bg-white/5 transition-colors text-left">
          <Upload size={24} className="text-warning mb-2" />
          <p className="font-medium">Restore Database</p>
          <p className="text-xs text-muted mt-1">Restore from a backup file</p>
        </button>
        <div className="bg-card border border-border rounded-xl p-6 opacity-60">
          <Cloud size={24} className="text-muted mb-2" />
          <p className="font-medium">Cloud Backup</p>
          <p className="text-xs text-muted mt-1">Coming soon</p>
        </div>
      </div>

      {backups.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold mb-4">Recent Backups</h2>
          <div className="space-y-2">
            {backups.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted">{new Date(b.date).toLocaleString()}</span>
                <span className="text-muted">{b.size}</span>
                <span className="text-xs text-primary">{b.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
