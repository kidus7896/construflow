import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { FileText, Search, Download, Filter, Clock } from 'lucide-react'

export default function AdminAuditLogs() {
  const { data } = useStore()
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')

  const logs = data.auditLogs || []

  const entityTypes = useMemo(() => {
    const types = {}
    logs.forEach(l => { types[l.entityType] = (types[l.entityType] || 0) + 1 })
    return Object.entries(types).sort((a, b) => b[1] - a[1])
  }, [logs])

  const filteredLogs = logs.filter(log => {
    if (search && !log.action?.toLowerCase().includes(search.toLowerCase()) && !log.entityType?.toLowerCase().includes(search.toLowerCase()) && !log.userName?.toLowerCase().includes(search.toLowerCase())) return false
    if (entityFilter !== 'all' && log.entityType !== entityFilter) return false
    return true
  })

  function actionColor(action) {
    if (action === 'create' || action === 'created') return 'text-success'
    if (action === 'delete' || action === 'deleted') return 'text-danger'
    if (action === 'update' || action === 'updated') return 'text-primary'
    return 'text-muted'
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <button onClick={handleExport} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors">
          <Download size={16} /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <Search size={18} className="text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit logs..."
            className="bg-transparent border-none text-sm text-white w-full focus:outline-none placeholder-muted" />
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3">
          <Filter size={18} className="text-muted" />
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
            className="bg-transparent border-none text-sm text-white w-full focus:outline-none">
            <option value="all">All Entities</option>
            {entityTypes.map(([type, count]) => (
              <option key={type} value={type}>{type} ({count})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-border/50">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium capitalize ${actionColor(log.action)}`}>{log.action}</span>
                      <span className="text-xs text-muted">on</span>
                      <span className="text-sm text-white font-medium">{log.entityType}</span>
                      {log.entityId && <span className="text-xs text-muted">#{log.entityId.slice(0, 8)}</span>}
                      <span className="text-xs text-muted">—</span>
                      <span className="text-xs text-muted"><Clock size={12} className="inline" /> {new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>By: {log.userName}</span>
                      {log.companyId && <span>Company: {data.companies?.find(c => c.id === log.companyId)?.name || '-'}</span>}
                    </div>
                    {log.changes && typeof log.changes === 'object' && Object.keys(log.changes).length > 0 && (
                      <div className="mt-2 bg-bg rounded-lg p-2">
                        <p className="text-xs text-muted mb-1">Changes:</p>
                        <div className="space-y-1">
                          {Object.entries(log.changes).slice(0, 5).map(([key, value]) => (
                            <div key={key} className="text-xs">
                              <span className="text-muted">{key}: </span>
                              <span className="text-white">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-muted text-center py-8">Audit logs will appear here as actions are performed across the system.</p>
          </div>
        )}
      </div>

      <div className="text-xs text-muted text-center">
        Showing {filteredLogs.length} of {logs.length} total audit logs
      </div>
    </div>
  )
}