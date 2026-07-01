import { useState } from 'react'
import { Shield, Edit3, X, Check } from 'lucide-react'

const defaultRoles = [
  { id: 'super_admin', name: 'Super Admin', level: 0, description: 'Full system access', color: 'purple' },
  { id: 'company_admin', name: 'Company Admin', level: 1, description: 'Own company management', color: 'blue' },
  { id: 'finance_manager', name: 'Finance Manager', level: 2, description: 'Financial operations', color: 'green' },
  { id: 'accountant', name: 'Accountant', level: 3, description: 'Accounting & records', color: 'yellow' },
  { id: 'project_manager', name: 'Project Manager', level: 4, description: 'Project expense tracking', color: 'orange' },
  { id: 'viewer', name: 'Viewer', level: 5, description: 'Read-only access', color: 'muted' },
]

const permissionModules = [
  'dashboard', 'payments', 'expenses', 'vat', 'withholding', 'reports',
  'settings', 'users', 'companySettings', 'export', 'delete', 'approve',
]

const permissionActions = ['view', 'create', 'read', 'update', 'delete', 'export', 'approve']

const defaultPerms = {
  super_admin: { dashboard: ['view'], companies: ['create','read','update','delete','suspend','activate','archive'], users: ['create','read','update','delete','suspend'], roles: ['create','read','update','delete'], subscriptions: ['create','read','update','delete','approve'], billing: ['read','update'], reports: ['read','export'], support: ['create','read','update','delete','assign'], announcements: ['create','read','update','delete'], activityLogs: ['read','export'], security: ['read','update'], backup: ['create','read','restore','export'], systemSettings: ['read','update'], auditLogs: ['read','export'], payments: ['read','export'], expenses: ['read','export'], vat: ['read','export'], withholding: ['read','export'], settings: ['read','update'], companySettings: ['read','update'], export: ['read'], delete: ['read'], approve: ['read'] },
  company_admin: { dashboard: ['view'], users: ['create','read','update','delete'], payments: ['create','read','update','delete','export'], expenses: ['create','read','update','delete','export'], vat: ['create','read','update','delete','export'], withholding: ['create','read','update','delete','export'], reports: ['read','export'], settings: ['read','update'], companySettings: ['read','update'], export: ['read'], delete: ['read'], approve: ['read'] },
  finance_manager: { dashboard: ['view'], payments: ['create','read','update','export'], expenses: ['create','read','update','export'], vat: ['create','read','update','export'], withholding: ['create','read','update','export'], reports: ['read','export'] },
  accountant: { dashboard: ['view'], payments: ['create','read','export'], expenses: ['create','read','export'], vat: ['create','read','export'], withholding: ['create','read','export'], reports: ['read','export'] },
  project_manager: { dashboard: ['view'], expenses: ['create','read','export'], reports: ['read'] },
  viewer: { dashboard: ['view'], payments: ['read'], expenses: ['read'], vat: ['read'], withholding: ['read'], reports: ['read'] },
}

export default function AdminRoles() {
  const [roles] = useState(defaultRoles)
  const [editingRole, setEditingRole] = useState(null)
  const [permissions, setPermissions] = useState(defaultPerms)

  function togglePerm(roleId, module, action) {
    setPermissions(prev => {
      const rolePerms = { ...(prev[roleId] || {}) }
      const modulePerms = [...(rolePerms[module] || [])]
      const idx = modulePerms.indexOf(action)
      if (idx >= 0) modulePerms.splice(idx, 1)
      else modulePerms.push(action)
      rolePerms[module] = modulePerms
      return { ...prev, [roleId]: rolePerms }
    })
  }

  function hasPerm(roleId, module, action) {
    return permissions[roleId]?.[module]?.includes(action) || false
  }

  const colorMap = { purple: 'text-purple-400', blue: 'text-blue-400', green: 'text-green-400', yellow: 'text-yellow-400', orange: 'text-orange-400', muted: 'text-muted' }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Roles & Permissions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {roles.map(r => (
          <div key={r.id} className={`bg-card border border-border rounded-xl p-4 ${editingRole === r.id ? 'ring-2 ring-primary' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className={colorMap[r.color]} />
                <h3 className="font-semibold">{r.name}</h3>
              </div>
              <button onClick={() => setEditingRole(editingRole === r.id ? null : r.id)}
                className={`p-1.5 rounded-lg ${editingRole === r.id ? 'bg-primary/10 text-primary' : 'text-muted hover:text-white hover:bg-white/5'}`}>
                <Edit3 size={16} />
              </button>
            </div>
            <p className="text-xs text-muted">{r.description}</p>
            <p className="text-xs text-muted mt-1">Level {r.level}</p>
          </div>
        ))}
      </div>

      {editingRole && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">{roles.find(r => r.id === editingRole)?.name} - Permissions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="text-left px-3 py-2 font-medium">Module</th>
                  {permissionActions.map(a => (
                    <th key={a} className="text-center px-2 py-2 font-medium capitalize text-xs">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissionModules.map(mod => (
                  <tr key={mod} className="border-b border-border/50 hover:bg-white/5">
                    <td className="px-3 py-2.5 capitalize">{mod.replace(/([A-Z])/g, ' $1')}</td>
                    {permissionActions.map(action => (
                      <td key={action} className="text-center px-2 py-2.5">
                        <button onClick={() => togglePerm(editingRole, mod, action)}
                          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                            hasPerm(editingRole, mod, action) ? 'bg-primary/20 text-primary' : 'text-muted/30 hover:text-muted'
                          }`}>
                          {hasPerm(editingRole, mod, action) ? <Check size={14} /> : '-'}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
