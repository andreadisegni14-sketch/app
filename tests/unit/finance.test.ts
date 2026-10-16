import { describe, expect, it } from 'vitest'
import {
  computeTransparencyTotals,
  formatMoney,
  galaNet,
  ILLUSTRATIVE_EXPENSES,
  ILLUSTRATIVE_REVENUE,
  parseAmountToCents,
  percentageOf,
  sumCents,
  summarizeIllustrativeBudget,
} from '@/lib/finance'

describe('illustrative first-year budget', () => {
  const summary = summarizeIllustrativeBudget()

  it('totals €95,000 of revenue and €95,000 of expenses', () => {
    expect(summary.revenueCents).toBe(9_500_000)
    expect(summary.expensesCents).toBe(9_500_000)
    expect(summary.balanceCents).toBe(0)
  })

  it('matches each line of the brief', () => {
    expect(Object.fromEntries(ILLUSTRATIVE_REVENUE.map((l) => [l.key, l.amountCents / 100]))).toEqual({
      familyContributions: 25_000,
      corporateSponsors: 30_000,
      galaGross: 30_000,
      individualDonations: 10_000,
    })
    expect(Object.fromEntries(ILLUSTRATIVE_EXPENSES.map((l) => [l.key, l.amountCents / 100]))).toEqual({
      schoolRenovation: 35_000,
      youthSailing: 15_000,
      equipmentScholarships: 10_000,
      gala: 15_000,
      administration: 12_000,
      reserve: 8_000,
    })
  })

  it('distinguishes gross gala revenue from net contribution', () => {
    expect(summary.galaGrossCents).toBe(3_000_000)
    expect(summary.galaCostCents).toBe(1_500_000)
    expect(summary.galaNetCents).toBe(1_500_000)
  })

  it('computes expense shares that add up to 100%', () => {
    expect(summary.programmeCents).toBe(6_000_000)
    expect(summary.programmeShare).toBe(63.2)
    expect(summary.administrationShare).toBe(12.6)
    expect(summary.fundraisingShare).toBe(15.8)
    expect(summary.reserveShare).toBe(8.4)
    expect(summary.programmeShare + summary.administrationShare + summary.fundraisingShare + summary.reserveShare).toBeCloseTo(100, 0)
  })
})

describe('money helpers', () => {
  it('sums integer cents and rejects fractional cents', () => {
    expect(sumCents([{ amountCents: 1 }, { amountCents: 2 }])).toBe(3)
    expect(sumCents([])).toBe(0)
    expect(() => sumCents([{ amountCents: 1.5 }])).toThrow(RangeError)
  })

  it('handles zero denominators and negative net results', () => {
    expect(percentageOf(5, 0)).toBe(0)
    expect(galaNet(1_000, 2_500)).toBe(-1_500)
  })

  it.each([
    ['25', 2_500],
    ['25.5', 2_550],
    ['25,50', 2_550],
    ['€ 100', 10_000],
    ['1.250,00', 125_000],
    ['1,250.00', 125_000],
    ['1.250', 125_000],
    ['10000', 1_000_000],
    // A single separator followed by exactly three digits is read as a thousands group.
    ['12.345', 1_234_500],
  ])('parses %s as %i cents', (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents)
  })

  it.each(['', 'abc', '-5', '1.2.3,4.5', '1e3', '25,5055', '0.001'])('rejects %s', (input) => {
    expect(parseAmountToCents(input)).toBeNull()
  })

  it('formats euros for both locales', () => {
    expect(formatMoney(3_500_000, 'en')).toBe('€35,000')
    expect(formatMoney(3_500_000, 'it').replace(/\s/g, ' ')).toBe('35.000 €')
    expect(formatMoney(2_550, 'en', 'EUR', true)).toBe('€25.50')
  })
})

describe('transparency totals', () => {
  it('reports zero when no funds exist', () => {
    expect(
      computeTransparencyTotals({ succeededDonationCents: [], refundedDonationCents: [], projectPledgedCents: [], projectSpentCents: [] }),
    ).toEqual({ receivedCents: 0, refundedCents: 0, netReceivedCents: 0, pledgedCents: 0, spentCents: 0, unspentCents: 0 })
  })

  it('nets refunds and separates pledged from received', () => {
    const totals = computeTransparencyTotals({
      succeededDonationCents: [5_000, 10_000, 2_500],
      refundedDonationCents: [2_500],
      projectPledgedCents: [100_000],
      projectSpentCents: [4_000],
    })
    expect(totals.receivedCents).toBe(17_500)
    expect(totals.netReceivedCents).toBe(15_000)
    expect(totals.pledgedCents).toBe(100_000)
    expect(totals.unspentCents).toBe(11_000)
  })
})
