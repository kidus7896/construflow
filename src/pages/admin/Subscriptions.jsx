import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { CreditCard, Check, X, Edit3, Save } from 'lucide-react'

export default function AdminSubscriptions() {
  const { data, updateSubscriptionPlan } = useStore()
  const [editingPlan, setEditingPlan] = useState(null)
  const [form, setForm] = useState({})

  const plans = data.subscriptionPlans || []

  function openEdit(plan) {
    setForm({ ...plan })
    setEditingPlan(plan.id)
  }

  function handleSave(e) {
    e.preventDefault()
    updateSubscriptionPlan(editingPlan, {
      ...form,
      monthlyPrice: Number(form.monthlyPrice),
      yearlyPrice: Number(form.yearlyPrice),
      maxCompanies: Number(form.maxCompanies),
      maxUsers: Number(form.maxUsers),
      storage: Number(form.storage),
    })
    setEditingPlan(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {plans.map(plan => (
          <div key={plan.id} className={`bg-card border rounded-xl p-4 relative ${plan.monthlyPrice === 0 ? 'border-border' : 'border-primary/30'}`}>
            <button onClick={() => openEdit(plan)} className="absolute top-3 right-3 p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
              <Edit3 size={14} />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={18} className="text-primary" />
              <h3 className="font-semibold text-lg">{plan.name}</h3>
            </div>
            <div className="mb-4">
              <p className="text-2xl font-bold">${plan.monthlyPrice}<span className="text-sm text-muted font-normal">/mo</span></p>
              <p className="text-xs text-muted">${plan.yearlyPrice}/year</p>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Companies', plan.maxCompanies],
                ['Users', plan.maxUsers],
                ['Storage', `${plan.storage}MB`],
                ['API Access', plan.apiAccess],
                ['OCR', plan.ocr],
                ['Reporting', plan.reporting],
                ['Priority Support', plan.prioritySupport],
                ['Custom Branding', plan.customBranding],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted">{label}</span>
                  {typeof val === 'boolean' ? (
                    val ? <Check size={14} className="text-success" /> : <X size={14} className="text-muted/40" />
                  ) : (
                    <span className="text-white">{val}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingPlan(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">Edit Plan: {plans.find(p => p.id === editingPlan)?.name}</h2>
              <button onClick={() => setEditingPlan(null)} className="text-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-muted">Plan Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-muted">Monthly Price ($)</label>
                  <input type="number" value={form.monthlyPrice} onChange={e => setForm({ ...form, monthlyPrice: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Yearly Price ($)</label>
                  <input type="number" value={form.yearlyPrice} onChange={e => setForm({ ...form, yearlyPrice: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Max Companies</label>
                  <input type="number" value={form.maxCompanies} onChange={e => setForm({ ...form, maxCompanies: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Max Users</label>
                  <input type="number" value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted">Storage (MB)</label>
                  <input type="number" value={form.storage} onChange={e => setForm({ ...form, storage: e.target.value })}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="text-sm font-medium">Features</h3>
                {['apiAccess', 'ocr', 'reporting', 'prioritySupport', 'customBranding'].map(f => (
                  <div key={f} className="flex items-center justify-between">
                    <span className="text-sm text-muted capitalize">{f.replace(/([A-Z])/g, ' $1')}</span>
                    <button type="button" onClick={() => setForm({ ...form, [f]: !form[f] })}
                      className={`w-12 h-6 rounded-full transition-colors ${form[f] ? 'bg-primary' : 'bg-muted/30'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${form[f] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 text-sm text-muted hover:text-white">Cancel</button>
                <button type="submit" className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
                  <Save size={16} /> Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}