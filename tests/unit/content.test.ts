import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import en from '../../messages/en.json'
import it_ from '../../messages/it.json'

function keys(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k))
  }
  return [prefix]
}

const corpus = [JSON.stringify(en), JSON.stringify(it_), readFileSync('prisma/seed.ts', 'utf8')].join('\n')

describe('bilingual content', () => {
  it('has identical message keys in English and Italian', () => {
    expect(keys(it_).sort()).toEqual(keys(en).sort())
  })

  it('contains no placeholder text', () => {
    expect(corpus).not.toMatch(/lorem ipsum|\bTODO\b|\bFIXME\b/)
  })
})

describe('no unauthorised claims', () => {
  it.each(['Luna Rossa', 'Rolex', 'Barcolana', 'Nave Italia'])('never mentions %s', (name) => {
    expect(corpus.toLowerCase()).not.toContain(name.toLowerCase())
  })

  it('states the unincorporated status in both languages', () => {
    expect(en.status.banner).toMatch(/not yet incorporated/i)
    expect(it_.status.banner).toMatch(/non ancora costituita/i)
  })

  it('only mentions tax deductibility to say it is not available', () => {
    const strings = (value: unknown): string[] =>
      typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : []
    const sentences = strings(en)
      .flatMap((text) => text.split(/(?<=[.!?])\s+/))
      // Short labels (e.g. table headings paired with 'Not available') are not claims.
      .filter((sentence) => /deductib/i.test(sentence) && sentence.split(/\s+/).length > 4)
    expect(sentences.length).toBeGreaterThan(0)
    for (const sentence of sentences) expect(sentence).toMatch(/\bnot\b|cannot|no claim|only where the law allows/i)
  })
})
