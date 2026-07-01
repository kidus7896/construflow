import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { Building2, ChevronRight } from 'lucide-react'

export default function SelectCompany() {
  const { selectCompany, user, companies, authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const availableCompanies = location.state?.companies || companies
  const [error, setError] = useState('')

  async function handleSelect(companyId) {
    const result = await selectCompany(companyId)
    if (result.success) {
      localStorage.setItem('cf_session_user', JSON.stringify({ email: user?.email }))
      localStorage.setItem('cf_active_company_id', companyId)
      navigate(user?.role === 'super_admin' ? '/system-admin' : '/', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">ConstruFlow</h1>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-white">Choose Your Company</h2>
            <p className="text-sm text-muted mt-1">
              Welcome, {user?.firstName || user?.email}! Select a company to continue.
            </p>
          </div>

          {error && (
            <div className="text-sm text-danger bg-danger/10 rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {availableCompanies.map(company => (
              <button
                key={company.id}
                onClick={() => handleSelect(company.id)}
                disabled={authLoading}
                className="w-full flex items-center justify-between bg-bg border border-border rounded-xl px-4 py-3.5 text-left hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{company.name}</p>
                    <p className="text-xs text-muted">{company.business_type || 'Construction'}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-muted group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>

          {availableCompanies.length === 0 && (
            <div className="text-center py-8 text-muted">
              <p>No companies found. Please contact your administrator.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
