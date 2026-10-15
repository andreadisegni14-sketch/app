import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { EventInterestForm } from '@/components/forms/EventInterestForm'
import { Badge } from '@/components/ui/Badge'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeader } from '@/components/ui/Section'
import { formatMoney, summarizeIllustrativeBudget } from '@/lib/finance'
import { listPublishedEvents, pick } from '@/lib/server/public-data'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'gala', '/gala')
}

export default async function GalaPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const [gala] = await listPublishedEvents('GALA')
  const budget = summarizeIllustrativeBudget()
  const money = (cents: number) => formatMoney(cents, locale)
  const concept = t.raw('gala.concept.items') as { title: string; body: string }[]
  const interestOpen = gala && gala.interestOpen && (gala.status === 'PROPOSED' || gala.status === 'CONFIRMED')

  return (
    <>
      <PageHero eyebrow={t('gala.hero.eyebrow')} title={t('gala.hero.title')} lead={t('gala.hero.lead')} art="night" caption={t('a11y.artworkCaption')} />

      <Section labelledBy="concept">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <SectionHeader eyebrow={t('gala.concept.eyebrow')} title={t('gala.concept.title')} id="concept" />
            <ul className="grid gap-8 sm:grid-cols-2">
              {concept.map((item) => (
                <li key={item.title} className="border-t border-gold pt-6">
                  <h3 className="text-xl">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
          {gala && (
            <aside className="lg:col-span-4">
              <div className="rounded-xl border border-line bg-white p-6">
                <h2 className="text-2xl">{t('gala.details.title')}</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted">{t('gala.details.status')}</dt>
                    <dd className="mt-1">
                      <Badge tone={gala.status === 'CONFIRMED' ? 'success' : 'gold'}>{t(`eventStatus.${gala.status}`)}</Badge>
                      {gala.isDemo && (
                        <span className="ml-2">
                          <Badge tone="demo">{t('status.demo')}</Badge>
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{t('gala.details.date')}</dt>
                    <dd className="font-medium">{pick(gala, 'dateLabel', locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">{t('gala.details.location')}</dt>
                    <dd className="font-medium">{pick(gala, 'location', locale)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-muted">{pick(gala, 'summary', locale)}</p>
              </div>
            </aside>
          )}
        </div>
      </Section>

      <Section tone="navy" labelledBy="gross-net">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow mb-5">{t('gala.finance.eyebrow')}</p>
            <h2 id="gross-net" className="text-3xl leading-tight md:text-5xl">
              {t('gala.finance.title')}
            </h2>
            <p className="mt-6 leading-relaxed text-ivory/85">
              {t('gala.finance.body', { gross: money(budget.galaGrossCents), costs: money(budget.galaCostCents), net: money(budget.galaNetCents) })}
            </p>
          </div>
          <dl className="grid content-center gap-px overflow-hidden rounded-xl bg-ivory/15" data-testid="gala-gross-net">
            <div className="bg-navy p-6">
              <dt className="text-sm text-ivory/70">{t('gala.finance.gross')}</dt>
              <dd className="mt-1 font-display text-4xl">{money(budget.galaGrossCents)}</dd>
            </div>
            <div className="bg-navy p-6">
              <dt className="text-sm text-ivory/70">{t('gala.finance.costs')}</dt>
              <dd className="mt-1 font-display text-4xl">− {money(budget.galaCostCents)}</dd>
            </div>
            <div className="bg-navy-soft p-6">
              <dt className="text-sm text-gold-light">{t('gala.finance.net')}</dt>
              <dd className="mt-1 font-display text-4xl text-gold">{money(budget.galaNetCents)}</dd>
            </div>
          </dl>
        </div>
      </Section>

      <Section labelledBy="gala-interest">
        <div className="mx-auto max-w-2xl">
          <div className="mb-12 rounded-xl border border-gold/50 bg-gold/10 p-6" role="note" data-testid="tickets-disabled">
            <h2 className="text-2xl">{t('gala.tickets.title')}</h2>
            <p className="mt-2 leading-relaxed text-ink/85">{t('gala.tickets.body')}</p>
          </div>
          {interestOpen && gala && (
            <>
              <SectionHeader title={t('gala.interestTitle')} lead={t('gala.interestLead')} id="gala-interest" />
              <EventInterestForm eventSlug={gala.slug} showPartySize />
            </>
          )}
        </div>
      </Section>
    </>
  )
}
