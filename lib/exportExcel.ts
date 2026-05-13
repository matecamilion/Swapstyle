import ExcelJS from 'exceljs'

const C = {
  purpleDark: 'FF4C1D95',
  purpleMed: 'FF7C3AED',
  purpleBorder: 'FF5B21B6',
  purpleLight: 'FFEDE9FE',
  purpleText: 'FF4C1D95',
  white: 'FFFFFFFF',
  grayLight: 'FFF3F4F6',
  grayVLight: 'FFF9FAFB',
  grayMed: 'FFD1D5DB',
  grayDark: 'FF111827',
  grayBorder: 'FFE5E7EB',
  graySubtitle: 'FF6B7280',
  yellowBg: 'FFFEF3C7',
  yellowText: 'FF92400E',
  greenBg: 'FFD1FAE5',
  greenText: 'FF065F46',
}

const thinBorder = (color: string): ExcelJS.Border => ({ style: 'thin', color: { argb: color } })
const solidFill = (color: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } })

interface ExportConfig {
  title: string
  subtitle: string
  sheetName?: string
  moneyColumns?: string[]
  statusColumn?: string
  sectionRows?: number[]
  totalRows?: number[]
}

export async function exportToExcel(
  data: Record<string, string | number | null | undefined>[],
  fileName: string,
  config: ExportConfig
) {
  if (data.length === 0) return

  const { title, subtitle, sheetName = 'Datos', moneyColumns = [], statusColumn, sectionRows = [], totalRows = [] } = config
  const headers = Object.keys(data[0])
  const colCount = headers.length
  const moneySet = new Set(moneyColumns)
  const sectionSet = new Set(sectionRows)
  const totalSet = new Set(totalRows)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'SwapStyle'
  const ws = wb.addWorksheet(sheetName, {
    views: [{ showGridLines: false, state: 'frozen', ySplit: 3 }],
  })

  // Row 1 — Title
  const r1 = ws.addRow([title])
  ws.mergeCells(1, 1, 1, colCount)
  r1.height = 36
  const c1 = ws.getCell('A1')
  c1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: C.white } }
  c1.fill = solidFill(C.purpleDark)
  c1.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row 2 — Subtitle
  const r2 = ws.addRow([subtitle])
  ws.mergeCells(2, 1, 2, colCount)
  r2.height = 20
  const c2 = ws.getCell('A2')
  c2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: C.graySubtitle } }
  c2.fill = solidFill(C.grayLight)
  c2.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row 3 — Headers
  const r3 = ws.addRow(headers)
  r3.height = 24
  r3.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.white } }
    cell.fill = solidFill(C.purpleMed)
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = { top: thinBorder(C.purpleBorder), bottom: thinBorder(C.purpleBorder), left: thinBorder(C.purpleBorder), right: thinBorder(C.purpleBorder) }
  })

  // Data rows (row 4+)
  data.forEach((rowData, di) => {
    const vals = headers.map((h) => rowData[h] ?? '')
    const row = ws.addRow(vals)
    row.height = 20
    const excelRow = di + 4
    const isSection = sectionSet.has(di)
    const isTotal = totalSet.has(di)
    const isEven = di % 2 === 0
    const dataBorder = { top: thinBorder(C.grayBorder), bottom: thinBorder(C.grayBorder), left: thinBorder(C.grayBorder), right: thinBorder(C.grayBorder) }

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const hdr = headers[colNum - 1]
      const isMoney = moneySet.has(hdr)
      cell.font = { name: 'Calibri', size: 11 }
      cell.border = dataBorder

      if (isSection) {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.grayDark } }
        cell.fill = solidFill(C.grayMed)
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      } else if (isTotal) {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.purpleText } }
        cell.fill = solidFill(C.purpleLight)
        cell.border = { ...dataBorder, top: { style: 'medium', color: { argb: C.purpleBorder } } }
        if (isMoney) { cell.alignment = { horizontal: 'right' }; cell.numFmt = '#,##0' }
      } else {
        cell.fill = solidFill(isEven ? C.white : C.grayVLight)
        if (isMoney) { cell.alignment = { horizontal: 'right' }; cell.numFmt = '#,##0' }
        else { cell.alignment = { horizontal: 'left', vertical: 'middle' } }

        if (statusColumn && hdr === statusColumn) {
          const v = String(cell.value)
          if (v === 'Pendiente') { cell.fill = solidFill(C.yellowBg); cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.yellowText } } }
          else if (v === 'Pagado') { cell.fill = solidFill(C.greenBg); cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: C.greenText } } }
        }
      }
    })

    if (isSection && colCount > 1) ws.mergeCells(excelRow, 1, excelRow, colCount)
  })

  // Auto-width (min 15)
  headers.forEach((h, i) => {
    let mx = h.length
    for (const r of data) { const l = r[h] != null ? String(r[h]).length : 0; if (l > mx) mx = l }
    ws.getColumn(i + 1).width = Math.max(mx + 4, 15)
  })

  // Download
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${fileName}.xlsx`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

/** Format ISO date to dd/mm/yyyy */
export function fmtDateExcel(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
