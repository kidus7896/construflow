import { useState, useMemo } from 'react'
import { BarChart3, Download, FileText, TrendingUp, Building2, Users, Database, CreditCard } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { Bar } from 'react-chartjs-2'

const reportTypes = [
  { id: 'revenue', label: 'Revenue Report', icon: TrendingUp },
  { id: 'companies', label: 'Company Growth', icon: Building2 },
  { id: 'users', label: 'User Growth', icon: Users },
  { id: 'subscriptions', label: 'Subscription Report', icon: CreditCard },
  { id: 'usage', label: 'System Usage', icon: BarChart3 },
  { id: 'database', label: 'Database Size', icon: Database },
]

export default function AdminReports() {
  const { data } = useStore()
  const [reportType, setReportType] = useState('revenue')
  const companies = data.companies || []
  const plans = data.subscriptionPlans || []
  const users = JSON.parse(localStorage.getItem('cf_users') || '[]')
  const activityLogs = data.activityLogs || []

  const chartData = useMemo(() => {
    if (reportType === 'revenue') {
      return {
        labels: plans.filter(p => p.monthlyPrice > 0).map(p => p.name),
        datasets: [{
          label: 'Monthly Revenue',
          data: plans.filter(p => p.monthlyPrice > 0).map(p => {
            return companies.filter(c => c.subscriptionPlan === p.name && c.status === 'active').length * p.monthlyPrice
          }),
          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
          borderRadius: 6,
        }]
      }
    }
    if (reportType === 'companies') {
      const statuses = ['active', 'inactive', 'suspended', 'trial', 'archived']
      return {
        labels: statuses,
        datasets: [{
          label: 'Companies',
          data: statuses.map(s => companies.filter(c => c.status === s).length),
          backgroundColor: ['#10B981', '#94A3B8', '#EF4444', '#F59E0B', '#64748B'],
          borderRadius: 6,
        }]
      }
    }
    if (reportType === 'users') {
      const roleCounts = {}
      users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1 })
      return {
        labels: Object.keys(roleCounts).map(r => r.replace(/_/g, ' ')),
        datasets: [{
          label: 'Users',
          data: Object.values(roleCounts),
          backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#F97316', '#94A3B8'],
          borderRadius: 6,
        }]
      }
    }
    return null
  }, [reportType, companies, plans, users])

  function handleExport() {
    const reportData = { type: reportType, generatedAt: new Date().toISOString(), data: {} }
    if (reportType === 'revenue') {
      reportData.data = { totalCompanies: companies.length, activeCompanies: companies.filter(c => c.status === 'active').length, totalUsers: users.length, monthlyRevenue: companies.filter(c => c.status === 'active').length * 79 }
    }
    if (reportType === 'companies') {
      reportData.data = { total: companies.length, byStatus: { active: companies.filter(c => c.status === 'active').length, inactive: companies.filter(c => c.status === 'inactive').length, suspended: companies.filter(c => c.status === 'suspended').length, trial: companies.filter(c => c.status === 'trial').length, archived: companies.filter(c => c.status === 'archived').length } }
    }
    if (reportType === 'users') {
      const byRole = {}; users.forEach(u => { byRole[u.role] = (byRole[u.role] || 0) + 1 })
      reportData.data = { total: users.length, byRole }
    }
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${reportType}-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Reports</h1>
        <button onClick={handleExport} className="flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg text-sm text-muted hover:text-white transition-colors">
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {reportTypes.map(r => (
          <button key={r.id} onClick={() => setReportType(r.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              reportType === r.id ? 'bg-primary text-white' : 'bg-card border border-border text-muted hover:text-white'
            }`}>
            <r.icon size={16} /> {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">{reportTypes.find(r => r.id === reportType)?.label}</h2>
          {reportType === 'revenue' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg rounded-lg p-3">
                  <p className="text-xs text-muted">Total Companies</p>
                  <p className="text-xl font-bold text-white">{companies.length}</p>
                </div>
                <div className="bg-bg rounded-lg p-3">
                  <p className="text-xs text-muted">Active Companies</p>
                  <p className="text-xl font-bold text-success">{companies.filter(c => c.status === 'active').length}</p>
                </div>
                <div className="bg-bg rounded-lg p-3">
                  <p className="text-xs text-muted">Total Users</p>
                  <p className="text-xl font-bold text-white">{users.length}</p>
                </div>
                <div className="bg-bg rounded-lg p-3">
                  <p className="text-xs text-muted">Est. Monthly Revenue</p>
                  <p className="text-xl font-bold text-success">${(companies.filter(c => c.status === 'active').length * 79).toLocaleString()}</p>
                </div>
              </div>
              <div className="h-48">
                {chartData && <Bar data={chartData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false }, ticks: { color: '#94A3B8' } }, y: { grid: { color: '#1E293B' }, ticks: { color: '#94A3B8' } } }
                }} />}
              </div>
            </div>
          )}
          {reportType === 'companies' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Total', companies.length, 'white'],
                  ['Active', companies.filter(c => c.status === 'active').length, 'text-success'],
                  ['Inactive', companies.filter(c => c.status === 'inactive').length, 'text-warning'],
                  ['Suspended', companies.filter(c => c.status === 'suspended').length, 'text-danger'],
                  ['Trial', companies.filter(c => c.status === 'trial').length, 'text-blue-400'],
                  ['Archived', companies.filter(c => c.status === 'archived').length, 'text-muted'],
                ].map(([label, value, color]) => (
                  <div key={label} className="bg-bg rounded-lg p-3">
                    <p className="text-xs text-muted">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="h-48">
                {chartData && <Bar data={chartData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false }, ticks: { color: '#94A3B8' } }, y: { grid: { color: '#1E293B' }, ticks: { color: '#94A3B8', stepSize: 1 } } }
                }} />}
              </div>
            </div>
          )}
          {reportType === 'users' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Total Users', users.length],
                  ['Company Admins', users.filter(u => u.role === 'company_admin').length],
                  ['Finance Managers', users.filter(u => u.role === 'finance_manager').length],
                  ['Accountants', users.filter(u => u.role === 'accountant').length],
                  ['Project Managers', users.filter(u => u.role === 'project_manager').length],
                  ['Viewers', users.filter(u => u.role === 'viewer').length],
                ].map(([label, value]) => (
                  <div key={label} className="bg-bg rounded-lg p-3">
                    <p className="text-xs text-muted">{label}</p>
                    <p className="text-xl font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
              <div className="h-48">
                {chartData && <Bar data={chartData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false }, ticks: { color: '#94A3B8' } }, y: { grid: { color: '#1E293B' }, ticks: { color: '#94A3B8', stepSize: 1 } } }
                }} />}
              </div>
            </div>
          )}
          {reportType === 'subscriptions' && (
            <div className="space-y-3">
              {plans.map(p => {
                const count = companies.filter(c => c.subscriptionPlan === p.name).length
                return (
                  <div key={p.id} className="flex items-center justify-between bg-bg rounded-lg p-3">
                    <div>
                      <p className="font-medium text-white">{p.name}</p>
                      <p className="text-xs text-muted">${p.monthlyPrice}/mo</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-xs text-muted">companies</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {reportType === 'usage' && (
            <div className="space-y-3">
              {[
                ['Total Companies', companies.length],
                ['Total Users', users.length],
                ['Total Activity Logs', activityLogs.length],
                ['Total Support Tickets', (data.supportTickets || []).length],
                ['Total Announcements', (data.announcements || []).length],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between bg-bg rounded-lg p-3">
                  <span className="text-muted">{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          )}
          {reportType === 'database' && (
            <div className="space-y-3">
              {[
                ['Local Storage Size', `${(JSON.stringify(localStorage).length / 1024).toFixed(1)} KB`],
                ['Companies Table', `${companies.length} records`],
                ['Users Table', `${users.length} records`],
                ['Activity Logs Table', `${activityLogs.length} records`],
                ['Support Tickets Table', `${(data.supportTickets || []).length} records`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between bg-bg rounded-lg p-3">
                  <span className="text-muted">{label}</span>
                  <span className="font-bold text-white">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <div className="space-y-4">
            <div className="bg-bg rounded-lg p-4">
              <p className="text-sm text-muted mb-2">Platform Overview</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Companies</span><span className="font-bold text-white">{companies.length}</span></div>
                <div className="flex justify-between"><span>Users</span><span className="font-bold text-white">{users.length}</span></div>
                <div className="flex justify-between"><span>Active Rate</span><span className="font-bold text-success">{companies.length > 0 ? Math.round(companies.filter(c => c.status === 'active').length / companies.length * 100) : 0}%</span></div>
                <div className="flex justify-between"><span>Avg Users/Company</span><span className="font-bold text-white">{companies.length > 0 ? (users.length / companies.length).toFixed(1) : 0}</span></div>
              </div>
            </div>
            <div className="text-xs text-muted">
              <p>Report generated: {new Date().toLocaleString()}</p>
              <p>Data source: localStorage</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}