import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export function exportToExcel(data, filename = 'export') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf]), `${filename}.xlsx`)
}

export function exportToCSV(data, filename = 'export') {
  const ws = XLSX.utils.json_to_sheet(data)
  const csv = XLSX.utils.sheet_to_csv(ws)
  saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

export function printTable(data, title = 'Report') {
  const w = window.open('', '_blank')
  w.document.write('<html><head><title>' + title + '</title>')
  w.document.write('<style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f4f4f4}</style></head><body>')
  w.document.write('<h2>' + title + '</h2>')
  w.document.write('<table><thead><tr>')
  if (data.length > 0) {
    Object.keys(data[0]).forEach(k => w.document.write('<th>' + k + '</th>'))
    w.document.write('</tr></thead><tbody>')
    data.forEach(row => {
      w.document.write('<tr>')
      Object.values(row).forEach(v => w.document.write('<td>' + (v ?? '') + '</td>'))
      w.document.write('</tr>')
    })
  }
  w.document.write('</tbody></table></body></html>')
  w.document.close()
  w.print()
}
