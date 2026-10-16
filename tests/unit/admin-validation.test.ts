import { describe, expect, it } from 'vitest'
import { budgetLinesTextSchema, budgetLinesToText, projectSchema } from '@/lib/admin-validation'

describe('budget lines text', () => {
  it('parses "EN | IT | amount" lines and round-trips', () => {
    const lines = budgetLinesTextSchema.parse('Classroom works | Lavori aule | 20000\n\nAccessibility | Accessibilità | 8.000,50')
    expect(lines).toEqual([
      { labelEn: 'Classroom works', labelIt: 'Lavori aule', amountCents: 2_000_000 },
      { labelEn: 'Accessibility', labelIt: 'Accessibilità', amountCents: 800_050 },
    ])
    expect(budgetLinesTextSchema.parse(budgetLinesToText(lines))).toEqual(lines)
  })

  it('reports the offending line number', () => {
    const result = budgetLinesTextSchema.safeParse('Good | Buono | 10\nmissing amount | manca')
    expect(result.success).toBe(false)
    expect(result.error!.issues[0]!.message).toContain('Budget line 2')
  })
})

describe('project schema', () => {
  const base = {
    slug: 'test-project',
    pillar: 'COASTAL_SCHOOL_RENEWAL',
    status: 'IDEA',
    titleEn: 'T', titleIt: 'T', summaryEn: 'S', summaryIt: 'S', descriptionEn: 'D', descriptionIt: 'D', locationEn: 'L', locationIt: 'L',
    goalsEn: 'One\nTwo\n', goalsIt: '', budgetLines: '', pledged: '', spent: '1500',
    budgetIsIllustrative: true, isPublished: false, isFeatured: false, isDemo: false, sortOrder: '3',
  }

  it('normalises goals, money and sort order', () => {
    const result = projectSchema.parse(base)
    expect(result.goalsEn).toEqual(['One', 'Two'])
    expect(result.goalsIt).toEqual([])
    expect(result.pledged).toBe(0)
    expect(result.spent).toBe(150_000)
    expect(result.sortOrder).toBe(3)
  })

  it('rejects unsafe slugs and unknown statuses', () => {
    expect(projectSchema.safeParse({ ...base, slug: 'Bad Slug!' }).success).toBe(false)
    expect(projectSchema.safeParse({ ...base, status: 'FUNDED' }).success).toBe(false)
  })
})
