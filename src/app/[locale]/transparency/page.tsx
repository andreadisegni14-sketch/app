import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/Badge'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeader } from '@/components/ui/Section'
import {
  computeTransparencyTotals,
  formatMoney,
  ILLUSTRATIVE_EXPENSES,
  ILLUSTRATIVE_REVENUE,
  percentageOf,
  summarizeIllustrativeBudget,
} from '@/lib/finance'
import { getTransparencyLedger } from '@/lib/server/donations'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'transparency', '/transparency')
}

export default async function TransparencyPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const totals = computeTransparencyTotals(await getTransparencyLedger())
  const budget = summarizeIllustrativeBudget()
  const money = (cents: number) => formatMoney(cents, locale)
  const percent = new Intl.NumberFormat(locale === 'it' ? 'it-IT' : 'en-IE', { maximumFractionDigits: 1 })

  const legalItems = t.raw('transparency.legal.items') as { label: string; value: string }[]
  const policies = t.raw('transparency.policies.items') as { name: string; state: string; href?: string }[]
  const allZero = totals.netReceivedCents === 0 && totals.pledgedCents === 0 && totals.spentCents === 0
  const maxExpense = Math.max(...ILLUSTRATIVE_EXPENSES.map((l) => l.amountCents))

  return (
    <>
      <PageHero eyebrow={t('transparency.hero.eyebrow')} title={t('transparency.hero.title')} lead={t('transparency.hero.lead')} art="day" caption={t('a11y.artworkCaption')} />

      <Section labelledBy="legal-status">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow={t('transparency.legal.eyebrow')} title={t('transparency.legal.title')} id="legal-status" />
            <p className="text-sm leading-relaxed text-muted">{t('footer.notLegalAdvice')}</p>
          </div>
          <dl className="divide-y divide-line rounded-xl border border-line bg-white lg:col-span-7" data-testid="legal-status">
            {legalItems.map((item) => (
              <div key={item.label} className="grid gap-1 px-6 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="text-sm text-muted">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section tone="navy" labelledBy="ledger">
        <SectionHeader eyebrow={t('transparency.ledger.eyebrow')} title={t('transparency.ledger.title')} lead={t('transparency.ledger.lead')} id="ledger" />
        <dl className="grid gap-px overflow-hidden rounded-xl bg-ivory/15 md:grid-cols-3" data-testid="ledger-totals">
          {[
            { label: t('transparency.ledger.received'), value: totals.netReceivedCents },
            { label: t('transparency.ledger.pledged'), value: totals.pledgedCents },
            { label: t('transparency.ledger.spent'), value: totals.spentCents },
          ].map((item) => (
            <div key={item.label} className="bg-navy p-8">
              <dt className="text-sm text-ivory/70">{item.label}</dt>
              <dd className="mt-2 font-display text-5xl tabular-nums">{money(item.value)}</dd>
            </div>
          ))}
        </dl>
        {allZero && <p className="mt-6 text-sm text-ivory/75">{t('transparency.ledger.zeroNote')}</p>}
      </Section>

      <Section labelledBy="illustrative-budget">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader eyebrow={t('transparency.budget.eyebrow')} title={t('transparency.budget.title')} lead={t('transparency.budget.lead')} id="illustrative-budget" />
          <Badge tone="gold" title={t('status.illustrativeHelp')}>
            {t('status.illustrative')}
          </Badge>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {[
            { title: t('transparency.budget.revenue'), lines: ILLUSTRATIVE_REVENUE, ns: 'finance.revenue', total: budget.revenueCents, id: 'revenue' },
            { title: t('transparency.budget.expenses'), lines: ILLUSTRATIVE_EXPENSES, ns: 'finance.expenses', total: budget.expensesCents, id: 'expenses' },
          ].map((table) => (
            <div key={table.id} className="rounded-xl border border-line bg-white p-6">
              <table className="w-full text-sm" data-testid={`budget-${table.id}`}>
                <caption className="mb-4 text-left font-display text-2xl">
                  {table.title} <span className="text-sm text-muted">({t('status.illustrative').toLowerCase()})</span>
                </caption>
                <tbody>
                  {table.lines.map((line) => (
                    <tr key={line.key} className="border-b border-line">
                      <th scope="row" className="py-3 pr-4 text-left font-normal">
                        {t(`${table.ns}.${line.key}`)}
                      </th>
                      <td className="py-3 text-right tabular-nums">{money(line.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" className="pt-4 text-left">
                      {t('transparency.budget.total')}
                    </th>
                    <td className="pt-4 text-right font-semibold tabular-nums">{money(table.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <figure className="rounded-xl border border-line bg-white p-6">
            <figcaption className="font-display text-xl">{t('transparency.budget.chartLabel')}</figcaption>
            {/* Single series: one hue, values as text; the expenses table above is the data view. */}
            <ul className="mt-5 space-y-3">
              {ILLUSTRATIVE_EXPENSES.map((line) => {
                const share = percentageOf(line.amountCents, budget.expensesCents)
                return (
                  <li key={line.key} title={`${t(`finance.expenses.${line.key}`)}: ${money(line.amountCents)} (${percent.format(share)}%)`}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{t(`finance.expenses.${line.key}`)}</span>
                      <span className="text-muted tabular-nums">{percent.format(share)}%</span>
                    </div>
                    <div className="mt-1.5 h-2.5 rounded-sm bg-ivory-deep" aria-hidden="true">
                      <div className="h-full rounded-r-[4px] bg-navy" style={{ width: `${(line.amountCents / maxExpense) * 100}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </figure>
          <div className="space-y-4 rounded-xl border border-line bg-ivory-deep p-6 text-sm leading-relaxed">
            <p className="flex justify-between gap-4 border-b border-line pb-3 font-medium">
              <span>{t('transparency.budget.balance')}</span>
              <span className="tabular-nums">{money(budget.balanceCents)}</span>
            </p>
            <p>{t('transparency.budget.programmeShare', { share: percent.format(budget.programmeShare) })}</p>
            <p>{t('transparency.budget.galaNote', { net: money(budget.galaNetCents) })}</p>
            <p className="text-muted">{t('status.illustrativeHelp')}</p>
          </div>
        </div>
      </Section>

      <Section tone="deep" labelledBy="policies">
        <SectionHeader eyebrow={t('transparency.policies.eyebrow')} title={t('transparency.policies.title')} lead={t('transparency.policies.lead')} id="policies" />
        <ul className="divide-y divide-line rounded-xl border border-line bg-ivory">
          {policies.map((policy) => (
            <li key={policy.name} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              {policy.href ? (
                <Link href={policy.href} className="link-underline font-medium text-navy">
                  {policy.name}
                </Link>
              ) : (
                <span className="font-medium">{policy.name}</span>
              )}
              <span className="text-sm text-muted">{policy.state}</span>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
