import type { Metadata } from 'next'
import { randomUUID } from 'node:crypto'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { DonationForm } from '@/components/forms/DonationForm'
import { SupportInterestForm } from '@/components/forms/SupportInterestForm'
import { Badge } from '@/components/ui/Badge'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeader } from '@/components/ui/Section'
import { db } from '@/lib/db'
import { getDonationsMode } from '@/lib/env'
import { pick } from '@/lib/server/public-data'
import { pageMetadata } from '@/lib/seo'

// Feature flags are read at request time.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'donate', '/donate')
}

export default async function DonatePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const mode = getDonationsMode()

  const why = t.raw('donate.why.items') as string[]

  if (mode.enabled) {
    const projects = await db.project.findMany({
      where: { isPublished: true, status: 'FUNDRAISING' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, titleEn: true, titleIt: true },
    })
    return (
      <>
        <PageHero eyebrow={t('donate.hero.eyebrow')} title={t('donate.enabled.title')} lead={t('donate.enabled.lead')} art="dusk" />
        <Section labelledBy="donation-form-title">
          <div className="mx-auto max-w-2xl" data-testid="donations-enabled">
            {mode.provider === 'mock' && (
              <p className="mb-6 rounded-md border border-dashed border-gold-ink/60 bg-gold/10 px-4 py-3 text-sm font-medium text-gold-ink">
                {t('donate.enabled.mockNotice')}
              </p>
            )}
            <h2 id="donation-form-title" className="sr-only">
              {t('donate.enabled.title')}
            </h2>
            <DonationForm
              idempotencyKey={randomUUID()}
              projects={projects.map((p) => ({ id: p.id, title: pick(p, 'title', locale) }))}
              labels={{
                amount: t('donate.enabled.amount'),
                presets: t('donate.enabled.presets'),
                designation: t('donate.enabled.designation'),
                general: t('donate.enabled.general'),
                terms: t('donate.enabled.terms'),
                termsLink: t('donate.enabled.termsLink'),
                privacyLink: t('donate.enabled.privacyLink'),
                submit: t('donate.enabled.submit'),
                redirecting: t('donate.enabled.redirecting'),
              }}
            />
            <p className="mt-8 text-sm leading-relaxed text-muted">{t('donate.enabled.noTaxReceipt')}</p>
          </div>
        </Section>
      </>
    )
  }

  return (
    <>
      <PageHero eyebrow={t('donate.hero.eyebrow')} title={t('donate.hero.title')} lead={t('donate.hero.lead')} art="dusk" caption={t('a11y.artworkCaption')} />
      <Section labelledBy="support-interest">
        <div className="grid gap-14 lg:grid-cols-12" data-testid="donations-disabled">
          <div className="space-y-10 lg:col-span-5">
            <div>
              <Badge tone="warning">{t('status.banner')}</Badge>
              <h2 className="mt-6 text-3xl">{t('donate.why.title')}</h2>
              <ul className="mt-6 space-y-4">
                {why.map((item) => (
                  <li key={item} className="flex gap-3 leading-relaxed">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-ivory-deep p-6">
              <h2 className="text-2xl">{t('donate.tax.title')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/85">{t('donate.tax.body')}</p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <SectionHeader title={t('donate.interestTitle')} lead={t('donate.interestLead')} id="support-interest" />
            <SupportInterestForm />
          </div>
        </div>
      </Section>
    </>
  )
}
