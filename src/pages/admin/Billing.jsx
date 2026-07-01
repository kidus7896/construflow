import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { Download, Search, CreditCard, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'

export default function AdminBilling() {
  const { data } = useStore()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('subscriptions')

  const companies = data.companies || []
  const plans = data.subscriptionPlans || []

  const activeCompanies = companies.filter(c => c.status === 'active' || c.status === 'trial')
  const monthlyRevenue = activeCompanies.reduce((sum, c) => {
    const plan = plans.find(p => p.name === c.subscriptionPlan)
    return sum + (plan?.monthlyPrice || 0)
  }, 0)
  const yearlyRevenue = activeCompanies.reduce((sum, c) => {
    const plan = plans.find(p => p.name === c.subscriptionPlan)
    return sum + (plan?.yearlyPrice || 0)
  }, 0)

  const planCounts = {}
  companies.forEach(c => {
    const plan = c.subscriptionPlan || 'Free'
    planCounts[plan] = (planCounts[plan] || 0) + 1
  })

  const filteredCompanies = companies.filter(c => {
    if (search && !c.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Revenue</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Monthly Revenue</span>
            <DollarSign size={20} className="text-green-400" />
          </div>
          <p className="text-2xl font-bold text-green-400">${monthlyRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">From {activeCompanies.length} active subscriptions</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Yearly Revenue (est.)</span>
            <TrendingUp size={20} className="text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">${yearlyRevenue.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">Annual projection</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Active Subscriptions</span>
            <CreditCard size={20} className="text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-yellow-400">{activeCompanies.length}</p>
          <p className="text-xs text-muted mt-1">Of {companies.length} total companies</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted">Pending Invoices</span>
            <AlertCircle size={20} className="text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">0</p>
          <p className="text-xs text-muted mt-1">No outstanding invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {Object.entries(planCounts).map(([plan, count]) => {
          const planData = plans.find(p => p.name === plan)
          return (
            <div key={plan} className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-muted">{plan}</p>
              <p className="text-xl font-bold text-white">{count}</p>
              <p className="text-xs text-muted">${planData?.monthlyPrice || 0}/mo each</p>
            </div>
          )
        })}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Subscription List</h2>
            <div className="flex gap-1 ml-4">
              {['subscriptions', 'invoices', 'payments'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs transition-colors ${tab === t ? 'bg-primary text-white' : 'text-muted hover:text-white'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-bg border border-border rounded-lg px-3 py-1.5">
              <Search size={14} className="text-muted" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                className="bg-transparent border-none text-xs text-white w-32 focus:outline-none placeholder-muted" />
            </div>
            <button className="flex items-center gap-1 bg-card border border-border px-3 py-1.5 rounded-lg text-xs text-muted hover:text-white">
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {tab === 'subscriptions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left px-3 py-2 font-medium">Company</th>
                  <th className="text-left px-3 py-2 font-medium">Plan</th>
                  <th className="text-left px-3 py-2 font-medium">Monthly</th>
                  <th className="text-left px-3 py-2 font-medium">Yearly</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Users</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map(c => {
                  const plan = plans.find(p => p.name === c.subscriptionPlan)
                  const companyUsers = JSON.parse(localStorage.getItem('cf_users') || '[]').filter(u => u.companyId === c.id)
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-white/5">
                      <td className="px-3 py-2.5 font-medium text-white">{c.name}</td>
                      <td className="px-3 py-2.5">{c.subscriptionPlan || 'Free'}</td>
                      <td className="px-3 py-2.5 text-success">${plan?.monthlyPrice || 0}</td>
                      <td className="px-3 py-2.5">${plan?.yearlyPrice || 0}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs ${c.status === 'active' ? 'text-success' : c.status === 'trial' ? 'text-warning' : 'text-muted'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted">{companyUsers.length}/{c.maxUsers || '∞'}</td>
                    </tr>
                  )
                })}
                {filteredCompanies.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted">No subscriptions</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {tab === 'invoices' && (
          <div className="text-center py-8 text-muted">
            <p>Invoice management coming soon. Invoices will be generated automatically based on subscription plans.</p>
          </div>
        )}
        {tab === 'payments' && (
          <div className="text-center py-8 text-muted">
            <p>Payment tracking coming soon. This will integrate with payment gateways to track renewals, failed payments, and refunds.</p>
          </div>
        )}
      </div>
    </div>
  )
}