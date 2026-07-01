import { useState, useEffect, useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { useAuth } from '../../context/AuthContext'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js'
import { Building2, Users, CreditCard, AlertCircle, TrendingUp, Clock, LifeBuoy, Activity, DollarSign, Zap, Ticket, UserCheck } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted">{label}</span>
        <div className={`p-2 rounded-lg bg-${color}-500/10`}>
          <Icon size={18} className={`text-${color}-400`} />
        </div>
      </div>
      <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const { data } = useStore()
  const { user } = useAuth()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const companies = data.companies || []
  const totalCompanies = companies.length
  const activeCompanies = companies.filter(c => c.status === 'active').length
  const inactiveCompanies = companies.filter(c => c.status === 'inactive').length
  const suspendedCompanies = companies.filter(c => c.status === 'suspended').length
  const trialCompanies = companies.filter(c => c.status === 'trial').length
  const archivedCompanies = companies.filter(c => c.status === 'archived').length

  const users = JSON.parse(localStorage.getItem('cf_users') || '[]')
  const totalUsers = users.length
  const onlineUsers = users.filter(u => u.status === 'active').length || 0
  const newRegistrations = users.filter(u => {
    if (!u.createdAt) return false
    const days = (Date.now() - new Date(u.createdAt).getTime()) / 86400000
    return days < 7
  }).length

  const supportTickets = data.supportTickets || []
  const openTickets = supportTickets.filter(t => t.status === 'open' || t.status === 'pending').length
  const activityLogs = data.activityLogs || []
  const recentActivity = activityLogs.slice(0, 8)

  const monthlyRevenue = companies.filter(c => c.status === 'active').reduce((sum, c) => {
    const plan = (data.subscriptionPlans || []).find(p => p.name === c.subscriptionPlan)
    return sum + (plan?.monthlyPrice || 0)
  }, 0)

  const expiredSubs = companies.filter(c => {
    if (!c.subscriptionEndDate) return false
    return new Date(c.subscriptionEndDate) < new Date()
  }).length

  const lastBackup = localStorage.getItem('cf_last_backup')
  const storageSize = JSON.stringify(localStorage).length

  const companyChartData = useMemo(() => ({
    labels: ['Active', 'Inactive', 'Suspended', 'Trial', 'Archived'],
    datasets: [{
      label: 'Companies',
      data: [activeCompanies, inactiveCompanies, suspendedCompanies, trialCompanies, archivedCompanies],
      backgroundColor: ['#10B981', '#94A3B8', '#EF4444', '#F59E0B', '#64748B'],
      borderRadius: 6,
    }]
  }), [activeCompanies, inactiveCompanies, suspendedCompanies, trialCompanies, archivedCompanies])

  const userRoleData = useMemo(() => {
    const roles = {}
    users.forEach(u => { roles[u.role] = (roles[u.role] || 0) + 1 })
    return {
      labels: Object.keys(roles).map(r => r.replace('_', ' ')),
      datasets: [{
        label: 'Users by Role',
        data: Object.values(roles),
        backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#F97316', '#94A3B8'],
        borderRadius: 6,
      }]
    }
  }, [users])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">System Admin Dashboard</h1>
          <p className="text-sm text-muted mt-1">{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} — {time.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-sm text-success font-medium">System Online</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Total Companies" value={totalCompanies} color="blue" subtitle={`${activeCompanies} active, ${suspendedCompanies} suspended`} />
        <StatCard icon={Users} label="Total Users" value={totalUsers} color="purple" subtitle={`${onlineUsers} active, ${newRegistrations} new this week`} />
        <StatCard icon={DollarSign} label="Monthly Revenue" value={`$${monthlyRevenue.toLocaleString()}`} color="green" subtitle={`From ${activeCompanies} active subscriptions`} />
        <StatCard icon={CreditCard} label="Active Subscriptions" value={activeCompanies} color="yellow" subtitle={`${expiredSubs} expired`} />
        <StatCard icon={TrendingUp} label="New Registrations" value={newRegistrations} color="blue" subtitle="In the last 7 days" />
        <StatCard icon={Ticket} label="Support Tickets" value={openTickets} color="orange" subtitle={`${supportTickets.length} total`} />
        <StatCard icon={UserCheck} label="Online Users" value={onlineUsers} color="green" subtitle="Active accounts" />
        <StatCard icon={Zap} label="System Health" value="98%" color="green" subtitle="All systems operational" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Company Distribution</h2>
          <div className="h-64">
            <Bar data={companyChartData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { grid: { display: false }, ticks: { color: '#94A3B8' } }, y: { grid: { color: '#1E293B' }, ticks: { color: '#94A3B8', stepSize: 1 } } }
            }} />
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
          <div className="h-64">
            <Bar data={userRoleData} options={{
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { x: { grid: { display: false }, ticks: { color: '#94A3B8' } }, y: { grid: { color: '#1E293B' }, ticks: { color: '#94A3B8', stepSize: 1 } } }
            }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentActivity.length > 0 ? recentActivity.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5">
                <Activity size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{log.details}</p>
                  <p className="text-xs text-muted">{log.userName} — {new Date(log.timestamp).toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted">No recent activity</p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">System Health</h2>
          <div className="space-y-4">
            {[
              ['Database', 'Connected', 'success'],
              ['Storage', `${(storageSize / 1024).toFixed(1)} KB used`, 'success'],
              ['API Status', 'Running', 'success'],
              ['Last Backup', lastBackup ? new Date(lastBackup).toLocaleString() : 'Not yet', lastBackup ? 'success' : 'muted'],
              ['Cached Data', `${(storageSize / 1024 / 1024).toFixed(2)} MB`, 'success'],
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted">{label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-${color}`} />
                  <span className={`text-sm text-${color}`}>{value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
