import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../store/useStore'
import { formatCurrency } from '../utils/format'
import { LayoutDashboard, Banknote, BarChart3, TrendingUp, Clock } from 'lucide-react'

export default function UserDashboard() {
  const { user } = useAuth()
  const { companyData } = useStore()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  const totalPayments = companyData.payments.reduce((s, x) => s + (parseFloat(x.paymentAmount) || 0), 0)
  const totalExpenses = companyData.aggregateExpenses.reduce((s, x) => s + (parseFloat(x.totalCost) || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-sm text-muted mt-1">{time.toLocaleDateString()} - {time.toLocaleTimeString()}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <Banknote size={16} className="text-success" />
            Payments Received
          </div>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalPayments)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <BarChart3 size={16} className="text-danger" />
            Total Expenses
          </div>
          <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-muted mb-1">
            <TrendingUp size={16} className="text-blue" />
            Net Cash Flow
          </div>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalPayments - totalExpenses)}</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <LayoutDashboard size={32} className="text-muted mx-auto mb-2" />
        <h2 className="text-lg font-semibold mb-1">Your Dashboard</h2>
        <p className="text-sm text-muted">Your role: <span className="text-primary capitalize">{user?.role?.replace('_', ' ')}</span></p>
        <p className="text-xs text-muted mt-2">You have access to modules assigned by your company admin.</p>
      </div>
    </div>
  )
}
