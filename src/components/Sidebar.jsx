import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../services/authService'
import {
  LayoutDashboard, Banknote, FileText, FileSpreadsheet,
  Truck, BarChart3, History, Settings, X, LogOut,
  MoreHorizontal, ChevronDown, Package, Building2, UserCircle
} from 'lucide-react'

const otherExpensesLinks = [
  { to: '/aggregate-expenses', label: 'Aggregate Expenses', icon: Package },
  { to: '/transport-expenses', label: 'Transport Expenses', icon: Truck },
  { to: '/miscellaneous-expenses', label: 'Miscellaneous Expenses', icon: MoreHorizontal },
]

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/payments', label: 'Payments', icon: Banknote },
  { to: '/vat-reports', label: 'VAT Reports', icon: FileText },
  { to: '/withholding-reports', label: 'Withholding Reports', icon: FileSpreadsheet },
  { to: '/financial-statements', label: 'Financial Statements', icon: BarChart3 },
  { to: '/transaction-history', label: 'Transaction History', icon: History },
  { to: '/companies', label: 'Companies', icon: Building2 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [expensesOpen, setExpensesOpen] = useState(
    otherExpensesLinks.some(l => location.pathname.startsWith(l.to))
  )

  async function handleLogout() {
    await logoutUser()
    navigate('/login', { replace: true })
  }

  function isOtherExpensesActive() {
    return otherExpensesLinks.some(l => location.pathname.startsWith(l.to))
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h1 className="text-sm font-bold text-primary">ConstruFlow</h1>
            <button onClick={onClose} className="lg:hidden text-muted hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex flex-col h-[calc(100%-60px)]">
          <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <l.icon size={18} />
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2">
              <button
                onClick={() => setExpensesOpen(!expensesOpen)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isOtherExpensesActive() ? 'text-primary' : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package size={18} />
                  <span>Other Expenses</span>
                </div>
                <ChevronDown size={16} className={`transition-transform ${expensesOpen ? '' : '-rotate-90'}`} />
              </button>
              {expensesOpen && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                  {otherExpensesLinks.map(l => (
                    <NavLink
                      key={l.to}
                      to={l.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <l.icon size={16} />
                      {l.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </nav>
          <div className="border-t border-border p-3 space-y-2">
            <NavLink to="/profile" onClick={onClose}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-colors">
              <UserCircle size={16} />
              <span className="truncate">{profile?.fullName || profile?.email || 'User'}</span>
            </NavLink>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted hover:text-danger hover:bg-danger/10 transition-colors">
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
