import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Building2, Check, ChevronDown, Plus, Settings } from 'lucide-react'

export default function CompanySwitcher({ onClose }) {
  const { data, currentCompany, companies, setCurrentCompany } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(id) {
    setCurrentCompany(id)
    setOpen(false)
  }

  const activeCompanies = companies.filter(c => c.status === 'active')
  const archivedCompanies = companies.filter(c => c.status === 'archived')

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <Building2 size={16} />
        <span className="truncate flex-1 text-left">{currentCompany?.name || 'Select Company'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {activeCompanies.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors hover:bg-white/5 ${
                currentCompany?.id === c.id ? 'text-primary' : 'text-muted'
              }`}
            >
              <Building2 size={14} />
              <span className="truncate flex-1 text-left">{c.name}</span>
              {currentCompany?.id === c.id && <Check size={14} />}
            </button>
          ))}
          {archivedCompanies.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs text-muted border-t border-border">Archived</div>
              {archivedCompanies.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors hover:bg-white/5 ${
                    currentCompany?.id === c.id ? 'text-primary' : 'text-muted/60'
                  }`}
                >
                  <Building2 size={14} />
                  <span className="truncate flex-1 text-left">{c.name}</span>
                </button>
              ))}
            </>
          )}
          <div className="border-t border-border">
            <button
              onClick={() => { setOpen(false); navigate('/companies'); onClose?.() }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-muted hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings size={14} />
              <span>Manage Companies</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
