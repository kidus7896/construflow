const colors = {
  blue: 'border-l-blue-500',
  green: 'border-l-green-500',
  red: 'border-l-red-500',
  yellow: 'border-l-yellow-500',
  purple: 'border-l-purple-500',
  orange: 'border-l-orange-500',
  teal: 'border-l-teal-500',
}

export default function SummaryCard({ title, value, color = 'blue' }) {
  return (
    <div className={`bg-card border border-border border-l-4 ${colors[color] || colors.blue} rounded-xl p-4`}>
      <p className="text-sm text-muted">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
