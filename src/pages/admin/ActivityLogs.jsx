import { useState, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Activity, Search, Download, Filter, UserCircle, Globe, Clock } from 'lucide-react'

export default function AdminActivityLogs() {
  const { data } = useStore()
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const logs = data.activityLogs || []

  const actionTypes = useMemo(() => {
    const types = {}
    logs.forEach(l => { types[l.action] = (types[l.action] || 0) + 1 })
    return Object.entries(types).sort((a, b) => b[1] - a[1])
  }, [logs])

  const filteredLogs = logs.filter(log => {
    if (search && !log.details?.toLowerCase().includes(search.toLowerCase()) && !log.userName?.toLowerCase().includes(search.toLowerCase()) && !log.action?.toLowerCase().includes(search.toLowerCase())) return false
    if (actionFilter !== 'all' && log.action !== actionFilter) return false
    if (dateFilter === 'today') {
      const today = new Date().toDateString()
      if (new Date(log.timestamp).toDateString() !== today) return false
    }
    if (dateFilter === 'week') {
      const weekAgo = Date.now() - 7 * 86400000
      if (new Date(log.timestamp).getTime() < weekAgo) return false
    }
    if (dateFilter === 'month') {
      const monthAgo = Date.now() - 30 * 86400000
      if (new Date(log.timestamp).getTime() < monthAgo) return false
    }
    return true
  })

  function actionIcon(action) {
    if (action?.includes('created') || action?.includes('added')) return 'text-success'
    if (action?.includes('deleted') || action?.includes('removed')) return 'text-danger'
    if (action?.includes('updated') || action?.includes('edited')) return 'text-primary'
    if (action?.includes('login') || action?.includes('logout')) return 'text-purple-400'
    if (action?.includes('export') || action?.includes('import')) return 'text-warning'
    return 'text-muted'
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <button onClick={handleExport} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors">
          <Download size={16} /> Export
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
          <Search size={18} className="text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
            className="bg-transparent border-none text-sm text-white w-full focus:outline-none placeholder-muted" />
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3">
          <Filter size={18} className="text-muted" />
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
            className="bg-transparent border-none text-sm text-white w-full focus:outline-none">
            <option value="all">All Actions</option>
            {actionTypes.map(([action, count]) => (
              <option key={action} value={action}>{action.replace(/_/g, ' ')} ({count})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-3">
          <Clock size={18} className="text-muted" />
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="bg-transparent border-none text-sm text-white w-full focus:outline-none">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl">
        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-border/50">
            {filteredLogs.map(log => (
              <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-${actionIcon(log.action).replace('text-', '')}/10 mt-0.5`}>
                    <Activity size={16} className={actionIcon(log.action)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{log.action?.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-muted">—</span>
                      <span className="text-xs text-muted">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted">{log.details}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted">
                      <span className="flex items-center gap-1"><UserCircle size={12} /> {log.userName}</span>
                      <span className="flex items-center gap-1"><Globe size={12} /> {log.ip}</span>
                      {log.browser && <span className="truncate max-w-[200px]">{log.browser}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <p className="text-sm text-muted text-center py-8">No activity logs recorded yet. Activity tracking will appear here as users interact with the system.</p>
          </div>
        )}
      </div>

      <div className="text-xs text-muted text-center">
        Showing {filteredLogs.length} of {logs.length} total logs
      </div>
    </div>
  )
}