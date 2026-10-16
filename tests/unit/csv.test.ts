import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from '@/lib/csv'

describe('csv', () => {
  it('quotes separators, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"')
    expect(csvCell(null)).toBe('')
    expect(csvCell(new Date('2026-01-02T03:04:05.000Z'))).toBe('2026-01-02T03:04:05.000Z')
  })

  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`)
    expect(csvCell('+39 010')).toBe("'+39 010")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('writes a UTF-8 BOM and CRLF rows', () => {
    expect(toCsv(['a', 'b'], [[1, 'è']])).toBe('﻿a,b\r\n1,è\r\n')
  })
})
