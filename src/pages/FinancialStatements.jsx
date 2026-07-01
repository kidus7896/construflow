import { useStore } from '../store/useStore'
import { formatCurrency } from '../utils/format'
import { exportToExcel, printTable } from '../utils/export'
import { FileSpreadsheet, Printer } from 'lucide-react'

export default function FinancialStatements() {
  const { data, companyData, getReceivables } = useStore()
  const receivables = getReceivables()
  const vatRate = (data.settings?.vatRate || 15) / 100
  const withHoldingRate = (data.settings?.withholdingRate || 3) / 100

  const totalSales = companyData.supplies.reduce((s, x) => s + (parseFloat(x.totalAmount) || 0), 0)
  const totalPayments = companyData.payments.reduce((s, x) => s + (parseFloat(x.paymentAmount) || 0), 0)
  const aggregateTotal = companyData.aggregateExpenses.reduce((s, x) => s + (parseFloat(x.totalCost) || 0), 0)
  const transportTotal = companyData.transportExpenses.reduce((s, x) => {
    return s + (parseFloat(x.fuelCost || 0) + parseFloat(x.loadingCost || 0) + parseFloat(x.otherCost || 0))
  }, 0)
  const totalExpenses = aggregateTotal + transportTotal
  const totalWithholding = companyData.payments.reduce((s, x) => s + (parseFloat(x.paymentAmount || 0) * withHoldingRate), 0)
  const totalVat = companyData.vatReports.reduce((s, x) => s + (parseFloat(x.amountBeforeVat || 0) * vatRate), 0)
  const outstandingReceivables = receivables.reduce((s, r) => s + r.outstandingBalance, 0)
  const grossProfit = totalSales - totalExpenses
  const netProfit = grossProfit - totalWithholding - totalVat

  const cashIn = totalPayments
  const cashOut = totalExpenses + totalWithholding + totalVat
  const netCashFlow = cashIn - cashOut

  function renderSection(title, items) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>
        <table className="w-full text-sm">
          <tbody>
            {items.map((item, i) => (
              <tr key={i} className={i < items.length - 1 ? 'border-b border-border/50' : ''}>
                <td className={`py-2 ${item.bold ? 'font-semibold' : ''} ${item.indent ? 'pl-4' : ''}`}>{item.label}</td>
                <td className={`py-2 text-right ${item.bold ? 'font-semibold' : ''} ${item.color || ''}`}>{formatCurrency(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const allStatements = [
    { title: 'Income Statement', items: [
      { label: 'Total Sales', value: totalSales, bold: true, color: 'text-success' },
      { label: 'Total Expenses', value: totalExpenses, bold: true, color: 'text-danger' },
      { label: 'Aggregate Expenses', value: aggregateTotal, indent: true },
      { label: 'Transport Expenses', value: transportTotal, indent: true },
      { label: 'Gross Profit', value: grossProfit, bold: true },
      { label: 'Withholding Tax', value: totalWithholding, indent: true, color: 'text-warning' },
      { label: 'VAT', value: totalVat, indent: true, color: 'text-warning' },
      { label: 'Net Profit', value: netProfit, bold: true, color: netProfit >= 0 ? 'text-success' : 'text-danger' },
    ]},
    { title: 'Cash Flow Statement', items: [
      { label: 'Cash In (Payments)', value: cashIn, bold: true, color: 'text-success' },
      { label: 'Cash Out', value: cashOut, bold: true, color: 'text-danger' },
      { label: 'Expenses', value: totalExpenses, indent: true },
      { label: 'Withholding Tax', value: totalWithholding, indent: true, color: 'text-warning' },
      { label: 'VAT', value: totalVat, indent: true, color: 'text-warning' },
      { label: 'Net Cash Flow', value: netCashFlow, bold: true, color: netCashFlow >= 0 ? 'text-success' : 'text-danger' },
    ]},
    { title: 'Balance Sheet', items: [
      { label: 'Assets', value: '', bold: true },
      { label: 'Cash', value: netCashFlow, indent: true },
      { label: 'Receivables', value: outstandingReceivables, indent: true, color: 'text-warning' },
      { label: 'Total Assets', value: netCashFlow + outstandingReceivables, bold: true },
      { label: '', value: '' },
      { label: 'Liabilities', value: '', bold: true },
      { label: 'Taxes Payable (VAT)', value: totalVat, indent: true, color: 'text-warning' },
      { label: 'Total Liabilities', value: totalVat, bold: true },
      { label: '', value: '' },
      { label: 'Equity', value: '', bold: true },
      { label: 'Owner Capital', value: 0, indent: true },
      { label: 'Retained Earnings', value: netProfit, indent: true, color: netProfit >= 0 ? 'text-success' : 'text-danger' },
      { label: 'Total Equity', value: netProfit, bold: true },
    ]},
  ]

  function exportAll() {
    const rows = []
    allStatements.forEach(s => {
      rows.push({ 'Statement': s.title, 'Item': '', 'Amount': '' })
      s.items.forEach(i => rows.push({ 'Statement': '', 'Item': i.label, 'Amount': i.value }))
      rows.push({ 'Statement': '', 'Item': '', 'Amount': '' })
    })
    exportToExcel(rows, 'financial-statements')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Statements</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportAll} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white"><FileSpreadsheet size={18} /></button>
          <button onClick={() => printTable([], 'Financial Statements')} className="p-2 bg-card border border-border rounded-lg text-muted hover:text-white"><Printer size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {allStatements.map(s => renderSection(s.title, s.items))}
      </div>
    </div>
  )
}
