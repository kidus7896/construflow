export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ET', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0) + ' ETB'
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
    return d.toLocaleDateString('en-GB')
  }
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB')
}

export function today() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
