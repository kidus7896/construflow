import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../services/authService'
import {
  LayoutDashboard, Building2, Users, Shield, CreditCard, Banknote,
  BarChart3, LifeBuoy, Bell, Settings, LogOut, X, Menu,
  Database, Lock, UserCircle, Activity, FileText, Smartphone,
} from 'lucide-react'

const navItems = [
  { to: '/system-admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/system-admin/companies', label: 'Companies', icon: Building2 },
  { to: '/system-admin/users', label: 'Users', icon: Users },
  { to: '/system-admin/roles', label: 'Roles & Permissions', icon: Shield },
  { to: '/system-admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/system-admin/billing', label: 'Billing', icon: Banknote },
  { to: '/system-admin/reports', label: 'System Reports', icon: BarChart3 },
  { to: '/system-admin/support', label: 'Support Tickets', icon: LifeBuoy },
  { to: '/system-admin/announcements', label: 'Announcements', icon: Bell },
  { to: '/system-admin/activity-logs', label: 'Activity Logs', icon: Activity },
  { to: '/system-admin/security', label: 'Security', icon: Lock },
  { to: '/system-admin/backup', label: 'Backup & Restore', icon: Database },
  { to: '/system-admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { to: '/system-admin/system-settings', label: 'System Settings', icon: Settings },
]

export default function AdminLayout() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openTickets, setOpenTickets] = useState(0)

  useEffect(() => {
    try {
      const storeData = JSON.parse(localStorage.getItem('construction_flow_data') || '{}')
      const tickets = storeData.supportTickets || []
      setOpenTickets(tickets.filter(t => t.status === 'open' || t.status === 'pending').length)
    } catch {}
  }, [])

  async function handleLogout() {
    await logoutUser()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border
        transform transition-transform duration-200 ease-in-out overflow-y-auto
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-3 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-bold text-primary">System Admin</h1>
              <p className="text-xs text-muted">ConstruFlow</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Support Tickets' && openTickets > 0 && (
                <span className="bg-danger text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-medium">{openTickets}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3 mt-2">
          <NavLink to="/system-admin/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:text-white hover:bg-white/5 transition-colors"
          >
            <UserCircle size={18} />
            {profile?.fullName || 'Profile'}
          </NavLink>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted hover:text-danger hover:bg-danger/10 transition-colors mt-1"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 p-4 border-b border-border bg-card">
          <button onClick={() => setSidebarOpen(true)} className="text-muted hover:text-white">
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-bold text-primary">System Admin</h1>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
