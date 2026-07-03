import { useState, useCallback, useEffect, useMemo } from 'react'
import { generateId } from '../utils/format'

const STORE_KEY = 'construction_flow_data'
const COMPANY_KEY = 'cf_active_company_id'

const defaultData = {
  supplies: [],
  payments: [],
  vatReports: [],
  vatSales: [],
  vatPurchases: [],
  vatImportLogs: [],
  withholdTaken: [],
  withholdGiven: [],
  whtImportLogs: [],
  whtAuditLog: [],
  aggregateExpenses: [],
  aggregateSuppliers: [],
  aggregateImportLogs: [],
  aggregateAttachments: [],
  aggregatePaymentHistory: [],
  transportExpenses: [],
  transportSuppliers: [],
  transportImportLogs: [],
  transportAttachments: [],
  fuelExpenses: [],
  equipmentRental: [],
  machineryMaintenance: [],
  siteExpenses: [],
  miscellaneousExpenses: [],
  companies: [],
  settings: {
    companyName: 'My Construction Company',
    tinNumber: '',
    address: '',
    phone: '',
    email: '',
    vatRate: 15,
    withholdingRate: 3,
  },
  transactionHistory: [],
  activityLogs: [],
  auditLogs: [],
  supportTickets: [],
  announcements: [],
  subscriptionPlans: [
    { id: 'free', name: 'Free', monthlyPrice: 0, yearlyPrice: 0, maxCompanies: 1, maxUsers: 3, storage: 50, apiAccess: false, ocr: false, reporting: false, prioritySupport: false, customBranding: false },
    { id: 'starter', name: 'Starter', monthlyPrice: 29, yearlyPrice: 290, maxCompanies: 1, maxUsers: 10, storage: 200, apiAccess: true, ocr: false, reporting: true, prioritySupport: false, customBranding: false },
    { id: 'professional', name: 'Professional', monthlyPrice: 79, yearlyPrice: 790, maxCompanies: 3, maxUsers: 25, storage: 1000, apiAccess: true, ocr: true, reporting: true, prioritySupport: true, customBranding: false },
    { id: 'enterprise', name: 'Enterprise', monthlyPrice: 199, yearlyPrice: 1990, maxCompanies: 10, maxUsers: 100, storage: 5000, apiAccess: true, ocr: true, reporting: true, prioritySupport: true, customBranding: true },
    { id: 'unlimited', name: 'Unlimited', monthlyPrice: 499, yearlyPrice: 4990, maxCompanies: 999, maxUsers: 999, storage: 50000, apiAccess: true, ocr: true, reporting: true, prioritySupport: true, customBranding: true },
  ],
}

function now() { return new Date().toISOString() }

function tag(entry, companyId) {
  return { ...entry, id: generateId(), companyId, createdAt: now() }
}

function filterByCompany(arr, companyId) {
  return (arr || []).filter(e => !companyId || e.companyId === companyId)
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...defaultData, ...parsed, settings: { ...defaultData.settings, ...parsed.settings } }
    }
  } catch (e) { console.error('Failed to load data', e) }
  return JSON.parse(JSON.stringify(defaultData))
}

function saveData(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) }
  catch (e) { console.error('Failed to save data', e) }
}

function getEntityKeys() {
  return ['supplies','payments','vatReports','vatSales','vatPurchases','vatImportLogs',
    'withholdTaken','withholdGiven','whtImportLogs','whtAuditLog',
    'aggregateExpenses','aggregateSuppliers','aggregateImportLogs','aggregateAttachments','aggregatePaymentHistory',
    'transportExpenses','transportSuppliers','transportImportLogs','transportAttachments',
    'fuelExpenses','equipmentRental','machineryMaintenance','siteExpenses','miscellaneousExpenses']
}

function getActiveCompanyId() {
  try {
    return localStorage.getItem(COMPANY_KEY) || null
  } catch { return null }
}

function setActiveCompanyId(id) {
  if (id) localStorage.setItem(COMPANY_KEY, id)
  else localStorage.removeItem(COMPANY_KEY)
}

export function useStore() {
  const [data, setData] = useState(() => {
    const d = loadData()
    if (!d.companies || d.companies.length === 0) {
      const defaultCompany = {
        id: generateId(),
        name: d.settings.companyName || 'My Construction Company',
        businessType: 'Construction',
        tinNumber: d.settings.tinNumber || '',
        phone: d.settings.phone || '',
        email: d.settings.email || '',
        address: d.settings.address || '',
        vatRate: d.settings.vatRate || 15,
        withholdingRate: d.settings.withholdingRate || 3,
        currency: 'ETB',
        status: 'active',
        createdAt: now(),
      }
      d.companies = [defaultCompany]
      const entityKeys = getEntityKeys()
      entityKeys.forEach(key => {
        d[key] = (d[key] || []).map(item => ({
          ...item,
          companyId: item.companyId || defaultCompany.id,
        }))
      })
      setActiveCompanyId(defaultCompany.id)
      saveData(d)
    }
    const activeId = getActiveCompanyId()
    if (activeId && d.companies.find(c => c.id === activeId)) {
      d.currentCompanyId = activeId
    } else {
      d.currentCompanyId = d.companies[0]?.id || null
      if (d.currentCompanyId) setActiveCompanyId(d.currentCompanyId)
    }
    return d
  })

  useEffect(() => { saveData(data) }, [data])

  const currentCompany = data.companies.find(c => c.id === data.currentCompanyId) || data.companies[0] || null

  const companyData = useMemo(() => {
    const filtered = {}
    getEntityKeys().forEach(key => {
      filtered[key] = filterByCompany(data[key], data.currentCompanyId)
    })
    return filtered
  }, [data])

  const updateSettings = useCallback((s) => {
    setData(prev => ({ ...prev, settings: { ...prev.settings, ...s } }))
  }, [])

  const setCurrentCompany = useCallback((id) => {
    setData(prev => prev.companies.find(c => c.id === id) ? { ...prev, currentCompanyId: id } : prev)
    setActiveCompanyId(id)
  }, [])

  const addCompany = useCallback((entry) => {
    const item = { ...entry, id: generateId(), status: 'active', createdAt: now() }
    setData(prev => ({ ...prev, companies: [...prev.companies, item] }))
    return item
  }, [])

  const editCompany = useCallback((id, entry) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(c => c.id === id ? { ...c, ...entry } : c),
    }))
  }, [])

  const archiveCompany = useCallback((id) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(c => c.id === id ? { ...c, status: 'archived' } : c),
    }))
  }, [])

  const deleteCompany = useCallback((id) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.filter(c => c.id !== id),
      currentCompanyId: prev.currentCompanyId === id
        ? (prev.companies.find(c => c.id !== id)?.id || null)
        : prev.currentCompanyId,
    }))
  }, [])

  const duplicateCompany = useCallback((id) => {
    const company = data.companies.find(c => c.id === id)
    if (!company) return null
    const { id: _id, createdAt: _ca, ...rest } = company
    const dup = { ...rest, name: `${rest.name} (Copy)`, id: generateId(), status: 'active', createdAt: now() }
    setData(prev => ({ ...prev, companies: [...prev.companies, dup] }))
    return dup
  }, [data.companies])

  const makeAddFn = (key) => useCallback((entry) => {
    const item = tag(entry, data.currentCompanyId)
    setData(prev => ({ ...prev, [key]: [...(prev[key] || []), item] }))
    return item
  }, [data.currentCompanyId])

  const makeEditFn = (key) => useCallback((id, entry) => {
    setData(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(e => e.id === id ? { ...e, ...entry } : e),
    }))
  }, [])

  const makeDeleteFn = (key) => useCallback((id) => {
    setData(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(e => e.id !== id),
    }))
  }, [])

  const makeClearFn = (key) => useCallback(() => {
    setData(prev => ({ ...prev, [key]: [] }))
  }, [])

  const addSupply = makeAddFn('supplies')
  const editSupply = makeEditFn('supplies')
  const deleteSupply = makeDeleteFn('supplies')

  const addPayment = makeAddFn('payments')
  const editPayment = makeEditFn('payments')
  const deletePayment = makeDeleteFn('payments')

  const addVatReport = makeAddFn('vatReports')
  const editVatReport = makeEditFn('vatReports')
  const deleteVatReport = makeDeleteFn('vatReports')

  const addVatSale = useCallback((entry) => {
    const item = { ...tag(entry, data.currentCompanyId), modifiedAt: now() }
    setData(prev => ({ ...prev, vatSales: [...(prev.vatSales || []), item] }))
    return item
  }, [data.currentCompanyId])

  const editVatSale = useCallback((id, entry) => {
    setData(prev => ({
      ...prev,
      vatSales: (prev.vatSales || []).map(v => v.id === id ? { ...v, ...entry, modifiedAt: now() } : v),
    }))
  }, [])

  const deleteVatSale = makeDeleteFn('vatSales')
  const clearVatSales = makeClearFn('vatSales')

  const addVatPurchase = useCallback((entry) => {
    const item = { ...tag(entry, data.currentCompanyId), modifiedAt: now() }
    setData(prev => ({ ...prev, vatPurchases: [...(prev.vatPurchases || []), item] }))
    return item
  }, [data.currentCompanyId])

  const editVatPurchase = useCallback((id, entry) => {
    setData(prev => ({
      ...prev,
      vatPurchases: (prev.vatPurchases || []).map(v => v.id === id ? { ...v, ...entry, modifiedAt: now() } : v),
    }))
  }, [])

  const deleteVatPurchase = makeDeleteFn('vatPurchases')
  const clearVatPurchases = makeClearFn('vatPurchases')

  const addVatImportLog = makeAddFn('vatImportLogs')
  const addWithholdTaken = makeAddFn('withholdTaken')
  const editWithholdTaken = makeEditFn('withholdTaken')
  const deleteWithholdTaken = makeDeleteFn('withholdTaken')
  const clearWithholdTaken = makeClearFn('withholdTaken')
  const clearWithholdGiven = makeClearFn('withholdGiven')
  const addWithholdGiven = makeAddFn('withholdGiven')
  const editWithholdGiven = makeEditFn('withholdGiven')
  const deleteWithholdGiven = makeDeleteFn('withholdGiven')
  const addWhtImportLog = makeAddFn('whtImportLogs')
  const addWhtAuditLog = makeAddFn('whtAuditLog')

  const addAggregateExpense = makeAddFn('aggregateExpenses')
  const editAggregateExpense = makeEditFn('aggregateExpenses')
  const deleteAggregateExpense = makeDeleteFn('aggregateExpenses')

  const addAggregateSupplier = makeAddFn('aggregateSuppliers')
  const editAggregateSupplier = makeEditFn('aggregateSuppliers')
  const deleteAggregateSupplier = makeDeleteFn('aggregateSuppliers')
  const addAggregateImportLog = makeAddFn('aggregateImportLogs')
  const addAggregateAttachment = makeAddFn('aggregateAttachments')
  const deleteAggregateAttachment = makeDeleteFn('aggregateAttachments')

  const addFuelExpense = makeAddFn('fuelExpenses')
  const editFuelExpense = makeEditFn('fuelExpenses')
  const deleteFuelExpense = makeDeleteFn('fuelExpenses')

  const addEquipmentRental = makeAddFn('equipmentRental')
  const editEquipmentRental = makeEditFn('equipmentRental')
  const deleteEquipmentRental = makeDeleteFn('equipmentRental')

  const addMachineryMaintenance = makeAddFn('machineryMaintenance')
  const editMachineryMaintenance = makeEditFn('machineryMaintenance')
  const deleteMachineryMaintenance = makeDeleteFn('machineryMaintenance')

  const addSiteExpense = makeAddFn('siteExpenses')
  const editSiteExpense = makeEditFn('siteExpenses')
  const deleteSiteExpense = makeDeleteFn('siteExpenses')

  const addMiscellaneousExpense = makeAddFn('miscellaneousExpenses')
  const editMiscellaneousExpense = makeEditFn('miscellaneousExpenses')
  const deleteMiscellaneousExpense = makeDeleteFn('miscellaneousExpenses')

  const addTransportSupplier = makeAddFn('transportSuppliers')
  const editTransportSupplier = makeEditFn('transportSuppliers')
  const deleteTransportSupplier = makeDeleteFn('transportSuppliers')
  const addTransportImportLog = makeAddFn('transportImportLogs')
  const addTransportAttachment = makeAddFn('transportAttachments')
  const deleteTransportAttachment = makeDeleteFn('transportAttachments')
  const addTransportExpense = makeAddFn('transportExpenses')
  const editTransportExpense = makeEditFn('transportExpenses')
  const deleteTransportExpense = makeDeleteFn('transportExpenses')

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data])

  const importData = useCallback((jsonStr) => {
    try {
      const imported = JSON.parse(jsonStr)
      setData(prev => ({ ...prev, ...imported }))
      return true
    } catch (e) { return false }
  }, [])

  const clearAllData = useCallback(() => {
    setData(JSON.parse(JSON.stringify(defaultData)))
    localStorage.removeItem('cf_active_company_id')
  }, [])

  const addActivityLog = useCallback((action, details, userId) => {
    const log = {
      id: generateId(),
      action,
      details,
      userId: userId || 'system',
      userName: 'User',
      userEmail: '',
      companyId: data.currentCompanyId,
      ip: '127.0.0.1',
      browser: navigator.userAgent?.slice(0, 100) || 'Unknown',
      timestamp: now(),
    }
    setData(prev => ({ ...prev, activityLogs: [log, ...(prev.activityLogs || [])] }))
    return log
  }, [data.currentCompanyId])

  const addAuditLog = useCallback((action, entityType, entityId, changes, userId) => {
    const log = {
      id: generateId(),
      action,
      entityType,
      entityId,
      changes,
      userId: userId || 'system',
      userName: 'User',
      companyId: data.currentCompanyId,
      timestamp: now(),
    }
    setData(prev => ({ ...prev, auditLogs: [log, ...(prev.auditLogs || [])] }))
    return log
  }, [data.currentCompanyId])

  const addSupportTicket = useCallback((ticket) => {
    const item = { ...ticket, id: generateId(), status: 'open', createdAt: now(), updatedAt: now() }
    setData(prev => ({ ...prev, supportTickets: [...(prev.supportTickets || []), item] }))
    addActivityLog('support_ticket_created', `Ticket: ${ticket.subject}`, ticket.createdBy)
    return item
  }, [addActivityLog])

  const updateSupportTicket = useCallback((id, updates) => {
    setData(prev => ({
      ...prev,
      supportTickets: (prev.supportTickets || []).map(t => t.id === id ? { ...t, ...updates, updatedAt: now() } : t),
    }))
    addActivityLog('support_ticket_updated', `Ticket ${id} updated`, updates.updatedBy)
  }, [addActivityLog])

  const deleteSupportTicket = useCallback((id) => {
    setData(prev => ({ ...prev, supportTickets: (prev.supportTickets || []).filter(t => t.id !== id) }))
    addActivityLog('support_ticket_deleted', `Ticket ${id} deleted`)
  }, [addActivityLog])

  const addAnnouncement = useCallback((announcement) => {
    const item = { ...announcement, id: generateId(), createdAt: now() }
    setData(prev => ({ ...prev, announcements: [item, ...(prev.announcements || [])] }))
    addActivityLog('announcement_sent', `Announcement: ${announcement.title}`)
    return item
  }, [addActivityLog])

  const updateSubscriptionPlan = useCallback((planId, updates) => {
    setData(prev => ({
      ...prev,
      subscriptionPlans: (prev.subscriptionPlans || []).map(p => p.id === planId ? { ...p, ...updates } : p),
    }))
    addActivityLog('subscription_plan_updated', `Plan ${planId} updated`)
  }, [addActivityLog])

  const getReceivables = useCallback(() => {
    const receivables = []
    const cid = data.currentCompanyId
    const supplies = filterByCompany(data.supplies, cid)
    const payments = filterByCompany(data.payments, cid)
    const suppliesMap = new Map()
    supplies.forEach(s => {
      const inv = s.invoiceNumber || ''
      if (!suppliesMap.has(inv)) suppliesMap.set(inv, [])
      suppliesMap.get(inv).push(s)
    })
    const paymentTotals = {}
    payments.forEach(p => {
      const inv = p.invoiceNumber || ''
      paymentTotals[inv] = (paymentTotals[inv] || 0) + (parseFloat(p.paymentAmount) || 0)
    })
    suppliesMap.forEach((items, inv) => {
      const totalInvAmount = items.reduce((sum, s) => sum + (parseFloat(s.totalAmount) || 0), 0)
      const paid = paymentTotals[inv] || 0
      receivables.push({
        id: inv,
        customerName: items[0]?.customerName || '',
        invoiceNumber: inv,
        invoiceAmount: totalInvAmount,
        amountPaid: paid,
        outstandingBalance: totalInvAmount - paid,
        dueDate: items[0]?.date || '',
        status: (totalInvAmount - paid) <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid'),
      })
    })
    return receivables
  }, [data.supplies, data.payments, data.currentCompanyId])

  const getTransactions = useCallback(() => {
    const transactions = []
    const cid = data.currentCompanyId
    const s = data.settings
    const vatR = (s?.vatRate || 15) / 100
    const whtR = (s?.withholdingRate || 3) / 100

    filterByCompany(data.supplies, cid).forEach(s => {
      transactions.push({ date: s.date, type: 'Supply', description: `${s.materialName} - ${s.customerName}`, cashIn: s.totalAmount || 0, cashOut: 0, vat: 0, withholding: 0 })
    })
    filterByCompany(data.payments, cid).forEach(p => {
      const wt = parseFloat(p.paymentAmount || 0) * whtR
      transactions.push({ date: p.date, type: 'Payment', description: `Payment from ${p.customerName}`, cashIn: parseFloat(p.paymentAmount || 0) - wt, cashOut: 0, vat: 0, withholding: wt })
    })
    const addExpenseTx = (arr, type, desc, getAmt) => {
      (arr || []).forEach(e => {
        transactions.push({ date: e.date, type, description: desc(e), cashIn: 0, cashOut: getAmt(e), vat: 0, withholding: 0 })
      })
    }
    const e = filterByCompany(data.aggregateExpenses, cid)
    addExpenseTx(e, 'Aggregate Expense', e => `${e.description||e.materialType} from ${e.supplierName}`, e => parseFloat(e.netPayable || e.totalCost || 0))
    addExpenseTx(filterByCompany(data.transportExpenses, cid), 'Transport Expense', t => `Transport - ${t.provider}`, t => parseFloat(t.netPayable||0))
    addExpenseTx(filterByCompany(data.fuelExpenses, cid), 'Fuel Expense', f => `Fuel - ${f.vehiclePlate||''}`, f => parseFloat(f.totalCost||f.amount||0))
    addExpenseTx(filterByCompany(data.equipmentRental, cid), 'Equipment Rental', e => `Rental - ${e.equipmentName||''}`, e => parseFloat(e.totalCost||e.amount||0))
    addExpenseTx(filterByCompany(data.machineryMaintenance, cid), 'Machinery Maintenance', m => `Maintenance - ${m.equipmentName||''}`, m => parseFloat(m.totalCost||m.amount||0))
    addExpenseTx(filterByCompany(data.siteExpenses, cid), 'Site Expense', s => `Site - ${s.description||''}`, s => parseFloat(s.totalCost||s.amount||0))
    addExpenseTx(filterByCompany(data.miscellaneousExpenses, cid), 'Misc. Expense', m => `Misc - ${m.description||''}`, m => parseFloat(m.totalCost||m.amount||0))
    filterByCompany(data.vatSales, cid).forEach(v => {
      const vt = parseFloat(v.amountBeforeVat || 0) * vatR
      transactions.push({ date: v.date, type: 'VAT Sale', description: `VAT Sale - ${v.customerName}`, cashIn: parseFloat(v.amountBeforeVat||0)+vt, cashOut: 0, vat: vt, withholding: 0 })
    })
    filterByCompany(data.vatPurchases, cid).forEach(v => {
      const vt = parseFloat(v.amountBeforeVat || 0) * vatR
      transactions.push({ date: v.date, type: 'VAT Purchase', description: `VAT Purchase - ${v.supplierName}`, cashIn: 0, cashOut: parseFloat(v.amountBeforeVat||0)+vt, vat: vt, withholding: 0 })
    })
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date))
    let balance = 0
    return transactions.map(t => { balance += (t.cashIn || 0) - (t.cashOut || 0); return { ...t, balance } })
  }, [data])

  return {
    data,
    companies: data.companies,
    companyData,
    currentCompany,
    setCurrentCompany,
    addCompany, editCompany, archiveCompany, deleteCompany, duplicateCompany,
    updateSettings,
    addSupply, editSupply, deleteSupply,
    addPayment, editPayment, deletePayment,
    addVatReport, editVatReport, deleteVatReport,
    addVatSale, editVatSale, deleteVatSale, clearVatSales,
    addVatPurchase, editVatPurchase, deleteVatPurchase, clearVatPurchases,
    addVatImportLog,
    addWithholdTaken, editWithholdTaken, deleteWithholdTaken, clearWithholdTaken,
    addWithholdGiven, editWithholdGiven, deleteWithholdGiven, clearWithholdGiven,
    addWhtImportLog, addWhtAuditLog,
    addAggregateExpense, editAggregateExpense, deleteAggregateExpense,
    addAggregateSupplier, editAggregateSupplier, deleteAggregateSupplier,
    addAggregateImportLog, addAggregateAttachment, deleteAggregateAttachment,
    addFuelExpense, editFuelExpense, deleteFuelExpense,
    addEquipmentRental, editEquipmentRental, deleteEquipmentRental,
    addMachineryMaintenance, editMachineryMaintenance, deleteMachineryMaintenance,
    addSiteExpense, editSiteExpense, deleteSiteExpense,
    addMiscellaneousExpense, editMiscellaneousExpense, deleteMiscellaneousExpense,
    addTransportSupplier, editTransportSupplier, deleteTransportSupplier,
    addTransportImportLog, addTransportAttachment, deleteTransportAttachment,
    addTransportExpense, editTransportExpense, deleteTransportExpense,
    exportData, importData, clearAllData,
    getReceivables, getTransactions,
    addActivityLog, addAuditLog,
    addSupportTicket, updateSupportTicket, deleteSupportTicket,
    addAnnouncement, updateSubscriptionPlan,
  }
}
