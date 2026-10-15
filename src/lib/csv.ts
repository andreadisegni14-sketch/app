/** Minimal RFC 4180 CSV writer with spreadsheet formula-injection protection. */

export type CsvValue = string | number | boolean | Date | null | undefined

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  let text = value instanceof Date ? value.toISOString() : String(value)
  // Cells starting with these characters can be executed as formulas by spreadsheet software.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv(headers: readonly string[], rows: readonly CsvValue[][]): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))]
  // BOM so Excel opens UTF-8 (accented Italian characters) correctly.
  return `﻿${lines.join('\r\n')}\r\n`
}
