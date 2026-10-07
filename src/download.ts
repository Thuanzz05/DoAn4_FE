import { apiBlob } from './api'

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadFile(path: string, filename: string) {
  saveBlob(await apiBlob(path), filename)
}

export function csvText(rows: Array<Array<string | number | null | undefined>>) {
  return '\uFEFF' + rows.map((row) => row.map((value) => {
    const text = value == null ? '' : String(value)
    const safe = typeof value === 'string' && /^\s*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safe.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
}

if (import.meta.env.DEV && csvText([['Tên, "A"', 'Dòng\nmới', '=1+1', ' @SUM(A1)', 0, null]]) !== '\uFEFF"Tên, ""A""","Dòng\nmới","\'=1+1","\' @SUM(A1)","0",""') throw new Error('CSV escaping check failed')

export function downloadCsv(rows: Array<Array<string | number | null | undefined>>, filename: string) {
  saveBlob(new Blob([csvText(rows)], { type: 'text/csv;charset=utf-8' }), filename)
}
