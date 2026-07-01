import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Smartphone, Monitor, LogOut, Trash2 } from 'lucide-react'

export default function ActiveSessions() {
  const { getSessions, deleteSession, logoutOtherSessions, logoutAll } = useAuth()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      const data = await getSessions()
      setSessions(data)
    } catch (err) {
      if (err.status === 401) navigate('/login', { replace: true })
      else setError(err.message)
    }
    setLoading(false)
  }

  async function handleDeleteSession(sessionId) {
    setActionLoading(sessionId)
    try {
      await deleteSession(sessionId)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (err) {
      setError(err.message)
    }
    setActionLoading('')
  }

  async function handleLogoutOther() {
    setActionLoading('other')
    try {
      await logoutOtherSessions()
      setSessions(prev => prev.filter(s => s.isCurrent))
    } catch (err) {
      setError(err.message)
    }
    setActionLoading('')
  }

  async function handleLogoutAll() {
    setActionLoading('all')
    try {
      await logoutAll()
    } catch (err) {
      setError(err.message)
    }
    navigate('/login', { replace: true })
    setActionLoading('')
  }

  function getDeviceIcon(os) {
    const lower = (os || '').toLowerCase()
    if (lower.includes('windows') || lower.includes('mac') || lower.includes('linux')) return Monitor
    return Smartphone
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-muted" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Sessions</h1>
          <p className="text-sm text-muted mt-1">Manage your active login sessions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLogoutOther} disabled={actionLoading === 'other'}
            className="text-sm px-3 py-2 rounded-lg border border-border text-muted hover:text-white hover:border-white/30 disabled:opacity-50 transition-colors">
            {actionLoading === 'other' ? 'Processing...' : 'Logout Others'}
          </button>
          <button onClick={handleLogoutAll} disabled={actionLoading === 'all'}
            className="text-sm px-3 py-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-50 transition-colors">
            {actionLoading === 'all' ? 'Processing...' : 'Logout All'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-lg p-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <p>No active sessions found</p>
          </div>
        ) : (
          sessions.map(session => {
            const DeviceIcon = getDeviceIcon(session.os)
            return (
              <div key={session.id}
                className={`bg-card border rounded-xl p-4 flex items-center justify-between gap-4 ${
                  session.isCurrent ? 'border-primary/30' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${session.isCurrent ? 'bg-primary/10 text-primary' : 'bg-white/5 text-muted'}`}>
                    <DeviceIcon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {session.deviceName || session.browser || 'Unknown Device'}
                      </span>
                      {session.isCurrent && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Current</span>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-0.5 space-x-2">
                      <span>{session.os || 'Unknown OS'}</span>
                      <span>·</span>
                      <span>{session.browser?.slice(0, 50) || 'Unknown browser'}</span>
                      {session.ipAddress && session.ipAddress !== '127.0.0.1' && (
                        <>
                          <span>·</span>
                          <span>{session.ipAddress}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Login time: {new Date(session.loginTime).toLocaleString()}
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button onClick={() => handleDeleteSession(session.id)}
                    disabled={actionLoading === session.id}
                    className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                    {actionLoading === session.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <LogOut size={16} />}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
