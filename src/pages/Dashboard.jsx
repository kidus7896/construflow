import { useStore } from '../store/useStore'
import { formatCurrency } from '../utils/format'
import SummaryCard from '../components/SummaryCard'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, PointElement, LineElement
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

export default function Dashboard() {
  const { data, companyData, getReceivables } = useStore()
  const receivables = getReceivables()
  const vatRate = (data.settings?.vatRate || 15) / 100
  const withHoldingRate = (data.settings?.withholdingRate || 3) / 100

  const totalSales = companyData.supplies.reduce((s, x) => s + (parseFloat(x.totalAmount) || 0), 0)
  const totalPayments = companyData.payments.reduce((s, x) => s + (parseFloat(x.netPayable) || 0), 0)
  const aggregateTotal = companyData.aggregateExpenses.reduce((s, x) => s + (parseFloat(x.subtotal) || 0), 0)
  const transportTotal = companyData.transportExpenses.reduce((s, x) => s + (parseFloat(x.subtotal) || 0), 0)
  const miscellaneousTotal = companyData.miscellaneousExpenses.reduce((s, x) => s + (parseFloat(x.subtotal) || parseFloat(x.totalCost) || 0), 0)
  const totalExpenses = aggregateTotal + transportTotal + miscellaneousTotal

  const cashInData = totalPayments
  const cashOutData = totalExpenses

  const monthlySales = {}
  companyData.supplies.forEach(s => {
    const m = s.date ? s.date.slice(0, 7) : 'Unknown'
    monthlySales[m] = (monthlySales[m] || 0) + (parseFloat(s.totalAmount) || 0)
  })
  const months = Object.keys(monthlySales).sort()
  const monthlyChart = {
    labels: months,
    datasets: [{
      label: 'Monthly Sales',
      data: months.map(m => monthlySales[m]),
      backgroundColor: '#3B82F6',
      borderRadius: 4,
    }]
  }

  const cashFlowChart = {
    labels: ['Cash In', 'Cash Out'],
    datasets: [{
      data: [cashInData, cashOutData],
      backgroundColor: ['#10B981', '#EF4444'],
      borderRadius: 4,
    }]
  }

  const expenseLabels = ['Aggregate', 'Transport', 'Miscellaneous']
  const expenseValues = [aggregateTotal, transportTotal, miscellaneousTotal]
  const expenseChart = {
    labels: expenseLabels,
    datasets: [{
      data: expenseValues,
      backgroundColor: ['#F59E0B', '#3B82F6', '#8B5CF6'],
    }]
  }

  const outstandingChart = {
    labels: receivables.filter(r => r.status !== 'Paid').slice(0, 10).map(r => r.customerName),
    datasets: [{
      label: 'Outstanding',
      data: receivables.filter(r => r.status !== 'Paid').slice(0, 10).map(r => r.outstandingBalance),
      backgroundColor: '#EF4444',
      borderRadius: 4,
    }]
  }

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94A3B8' } } },
    scales: { x: { ticks: { color: '#94A3B8' } }, y: { ticks: { color: '#94A3B8' } } },
  }

  const cardClass = "bg-card border border-border rounded-xl p-4"

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Total Sales" value={formatCurrency(totalSales)} color="blue" />
        <SummaryCard title="Payments Received" value={formatCurrency(totalPayments)} color="green" />
        <SummaryCard title="Total Cash Out" value={formatCurrency(totalExpenses)} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={cardClass}>
          <h2 className="text-lg font-semibold mb-4">Cash In vs Cash Out</h2>
          <Bar data={cashFlowChart} options={chartOptions} />
        </div>
        <div className={cardClass}>
          <h2 className="text-lg font-semibold mb-4">Monthly Sales Trend</h2>
          {months.length > 0 ? <Bar data={monthlyChart} options={chartOptions} /> : <p className="text-muted">No data yet</p>}
        </div>
        <div className={cardClass}>
          <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
          {totalExpenses > 0 ? <Doughnut data={expenseChart} options={chartOptions} /> : <p className="text-muted">No expenses yet</p>}
        </div>
        <div className={cardClass}>
          <h2 className="text-lg font-semibold mb-4">Outstanding Receivables</h2>
          {receivables.filter(r => r.status !== 'Paid').length > 0
            ? <Bar data={outstandingChart} options={chartOptions} />
            : <p className="text-muted">No outstanding receivables</p>}
        </div>
      </div>
    </div>
  )
}
