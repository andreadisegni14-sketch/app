/**
 * Illustrative first-year budget and financial helpers.
 *
 * Every figure here is an ILLUSTRATIVE SCENARIO for planning discussions. None of it is an actual
 * financial result, forecast commitment or pledge.
 * All amounts are integer euro cents to avoid floating-point rounding.
 */

export type IllustrativeLine = {
  key: string
  amountCents: number
}

export const ILLUSTRATIVE_REVENUE: readonly IllustrativeLine[] = [
  { key: 'familyContributions', amountCents: 2_500_000 },
  { key: 'corporateSponsors', amountCents: 3 * 1_000_000 },
  { key: 'galaGross', amountCents: 3_000_000 },
  { key: 'individualDonations', amountCents: 1_000_000 },
]

export const ILLUSTRATIVE_EXPENSES: readonly IllustrativeLine[] = [
  { key: 'schoolRenovation', amountCents: 3_500_000 },
  { key: 'schoolEquipment', amountCents: 1_500_000 },
  { key: 'scholarships', amountCents: 1_000_000 },
  { key: 'gala', amountCents: 1_500_000 },
  { key: 'administration', amountCents: 1_200_000 },
  { key: 'reserve', amountCents: 800_000 },
]

/** Expense lines that fund programmes directly (as opposed to fundraising, admin or reserve). */
export const PROGRAMME_EXPENSE_KEYS = ['schoolRenovation', 'schoolEquipment', 'scholarships'] as const

export const CORPORATE_SPONSOR_SCENARIO = { count: 3, amountCentsEach: 1_000_000 } as const

function assertCents(value: number, label = 'amount'): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be an integer number of cents`)
}

export function sumCents(lines: readonly { amountCents: number }[]): number {
  return lines.reduce((total, line) => {
    assertCents(line.amountCents)
    return total + line.amountCents
  }, 0)
}

/** Share of `part` in `whole` as a percentage rounded to one decimal place. Returns 0 when whole is 0. */
export function percentageOf(part: number, whole: number): number {
  assertCents(part, 'part')
  assertCents(whole, 'whole')
  if (whole === 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

/** Net gala contribution: gross fundraising minus the direct cost of staging the gala. */
export function galaNet(grossCents: number, costCents: number): number {
  assertCents(grossCents, 'gross')
  assertCents(costCents, 'cost')
  return grossCents - costCents
}

export function lineAmount(lines: readonly IllustrativeLine[], key: string): number {
  const line = lines.find((l) => l.key === key)
  if (!line) throw new Error(`Unknown budget line: ${key}`)
  return line.amountCents
}

export type BudgetSummary = {
  revenueCents: number
  expensesCents: number
  balanceCents: number
  galaGrossCents: number
  galaCostCents: number
  galaNetCents: number
  programmeCents: number
  programmeShare: number
  administrationShare: number
  fundraisingShare: number
  reserveShare: number
}

export function summarizeIllustrativeBudget(
  revenue: readonly IllustrativeLine[] = ILLUSTRATIVE_REVENUE,
  expenses: readonly IllustrativeLine[] = ILLUSTRATIVE_EXPENSES,
): BudgetSummary {
  const revenueCents = sumCents(revenue)
  const expensesCents = sumCents(expenses)
  const galaGrossCents = lineAmount(revenue, 'galaGross')
  const galaCostCents = lineAmount(expenses, 'gala')
  const programmeCents = sumCents(
    expenses.filter((l) => (PROGRAMME_EXPENSE_KEYS as readonly string[]).includes(l.key)),
  )
  return {
    revenueCents,
    expensesCents,
    balanceCents: revenueCents - expensesCents,
    galaGrossCents,
    galaCostCents,
    galaNetCents: galaNet(galaGrossCents, galaCostCents),
    programmeCents,
    programmeShare: percentageOf(programmeCents, expensesCents),
    administrationShare: percentageOf(lineAmount(expenses, 'administration'), expensesCents),
    fundraisingShare: percentageOf(galaCostCents, expensesCents),
    reserveShare: percentageOf(lineAmount(expenses, 'reserve'), expensesCents),
  }
}

/**
 * Parses a user-entered amount in euros ("25", "25.50", "25,50", "1.250,00", "1,250.00") into cents.
 * Returns null for anything ambiguous or invalid.
 */
export function parseAmountToCents(input: string): number | null {
  const raw = input.trim().replace(/\s|€/g, '')
  if (!raw || !/^[0-9.,]+$/.test(raw)) return null

  let normalized: string
  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    // Both separators: the right-most one is the decimal separator.
    const decimalSep = lastComma > lastDot ? ',' : '.'
    const thousandsSep = decimalSep === ',' ? '.' : ','
    const [integerPart = '', ...rest] = raw.split(decimalSep)
    const groups = integerPart.split(thousandsSep)
    const validGroups = /^[1-9]\d{0,2}$/.test(groups[0]!) && groups.slice(1).every((g) => /^\d{3}$/.test(g))
    if (rest.length !== 1 || !validGroups) return null
    normalized = `${groups.join('')}.${rest[0]}`
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.'
    const parts = raw.split(sep)
    if (parts.length === 2 && parts[1]!.length <= 2) {
      normalized = `${parts[0]}.${parts[1]}`
    } else if (/^[1-9]\d{0,2}$/.test(parts[0]!) && parts.slice(1).every((p) => /^\d{3}$/.test(p))) {
      normalized = parts.join('')
    } else {
      return null
    }
  } else {
    normalized = raw
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [whole, fraction = ''] = normalized.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

export function formatMoney(cents: number, locale: string, currency = 'EUR', withDecimals = false): string {
  return new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(cents / 100)
}

export type TransparencyTotals = {
  receivedCents: number
  refundedCents: number
  netReceivedCents: number
  pledgedCents: number
  spentCents: number
  unspentCents: number
}

/** Actual vs pledged vs spent. Only real ledger entries feed this — never illustrative figures. */
export function computeTransparencyTotals(input: {
  succeededDonationCents: readonly number[]
  refundedDonationCents: readonly number[]
  projectPledgedCents: readonly number[]
  projectSpentCents: readonly number[]
}): TransparencyTotals {
  const total = (values: readonly number[]) => sumCents(values.map((amountCents) => ({ amountCents })))
  const receivedCents = total(input.succeededDonationCents)
  const refundedCents = total(input.refundedDonationCents)
  const netReceivedCents = receivedCents - refundedCents
  const spentCents = total(input.projectSpentCents)
  return {
    receivedCents,
    refundedCents,
    netReceivedCents,
    pledgedCents: total(input.projectPledgedCents),
    spentCents,
    unspentCents: netReceivedCents - spentCents,
  }
}
