import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { EventInterestForm } from '@/components/forms/EventInterestForm'
import { EventCard } from '@/components/site/EventCard'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeader } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'
import { listPublishedEvents, pick } from '@/lib/server/public-data'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'sailing', '/sailing')
}

export default async function SailingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const events = await listPublishedEvents('REGATTA')
  const openEvent = events.find((e) => e.interestOpen && (e.status === 'PROPOSED' || e.status === 'CONFIRMED'))

  const programme = t.raw('sailing.programme.items') as { title: string; body: string }[]
  const partnerships = t.raw('sailing.partnerships.items') as { title: string; body: string }[]

  return (
    <>
      <PageHero eyebrow={t('sailing.hero.eyebrow')} title={t('sailing.hero.title')} lead={t('sailing.hero.lead')} art="regatta" caption={t('a11y.artworkCaption')} />

      <Section labelledBy="programme">
        <SectionHeader eyebrow={t('sailing.programme.eyebrow')} title={t('sailing.programme.title')} id="programme" />
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {programme.map((item, i) => (
            <li key={item.title} className="border-t border-gold pt-6">
              <span className="font-display text-3xl text-gold-ink" aria-hidden="true">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-xl">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="deep" labelledBy="events">
        <SectionHeader eyebrow={t('sailing.events.eyebrow')} title={t('sailing.events.title')} lead={t('sailing.events.lead')} id="events" />
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line p-10 text-center text-muted">{t('sailing.events.empty')}</p>
        ) : (
          <ul className="grid gap-6 md:grid-cols-2">
            {events.map((event) => (
              <li key={event.id}>
                <EventCard
                  event={{
                    ...event,
                    title: pick(event, 'title', locale),
                    summary: pick(event, 'summary', locale),
                    location: pick(event, 'location', locale),
                    dateLabel: pick(event, 'dateLabel', locale),
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section tone="navy" labelledBy="partnerships">
        <SectionHeader eyebrow={t('sailing.partnerships.eyebrow')} title={t('sailing.partnerships.title')} id="partnerships" />
        <ul className="grid gap-px overflow-hidden rounded-xl bg-ivory/15 md:grid-cols-2">
          {partnerships.map((item) => (
            <li key={item.title} className="bg-navy p-8">
              <h3 className="text-2xl">{item.title}</h3>
              <p className="mt-3 leading-relaxed text-ivory/80">{item.body}</p>
            </li>
          ))}
        </ul>
        <Link href="/partners" className={`${buttonStyles.gold} mt-10`}>
          {t('sailing.partnerships.cta')}
        </Link>
      </Section>

      {openEvent && (
        <Section labelledBy="regatta-interest">
          <div className="mx-auto max-w-2xl">
            <SectionHeader title={t('sailing.interestTitle')} lead={t('sailing.interestLead')} id="regatta-interest" />
            <EventInterestForm eventSlug={openEvent.slug} />
          </div>
        </Section>
      )}
    </>
  )
}
