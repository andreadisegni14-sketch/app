import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { SeascapeVariant } from '@/components/art/Seascape'
import { EventInterestForm } from '@/components/forms/EventInterestForm'
import { Badge } from '@/components/ui/Badge'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeader } from '@/components/ui/Section'
import { getPublishedEvent, isEventInterestOpen, pick } from '@/lib/server/public-data'
import { alternates, localizedPath } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; slug: string }> }

function heroArt(type: string): SeascapeVariant {
  if (type === 'GALA') return 'night'
  if (type === 'REGATTA') return 'regatta'
  return 'dusk'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const event = await getPublishedEvent(slug)
  if (!event) return { title: 'Not found', robots: { index: false } }
  const t = await getTranslations({ locale, namespace: 'meta' })
  const title = pick(event, 'title', locale)
  const description = pick(event, 'summary', locale)
  const path = `/events/${slug}`
  return {
    title,
    description,
    alternates: alternates(locale, path),
    openGraph: {
      title,
      description,
      url: localizedPath(locale, path),
      siteName: t('siteName'),
      locale: locale === 'it' ? 'it_IT' : 'en_GB',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function EventPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const event = await getPublishedEvent(slug)
  if (!event) notFound()

  const t = await getTranslations()
  const title = pick(event, 'title', locale)
  const interestOpen = isEventInterestOpen(event)

  return (
    <>
      <PageHero
        eyebrow={t(`eventStatus.${event.status}`)}
        title={title}
        lead={pick(event, 'summary', locale)}
        art={heroArt(event.type)}
        caption={t('a11y.artworkCaption')}
      />

      {event.isDemo && (
        <div className="border-b border-gold/40 bg-gold/10">
          <p className="container-page py-3 text-sm text-gold-ink">{t('status.demoHelp')}</p>
        </div>
      )}

      <Section labelledBy="event-interest">
        <div className="grid gap-12 lg:grid-cols-12">
          <aside className="space-y-6 lg:order-2 lg:col-span-4">
            <section aria-labelledby="event-details" className="rounded-xl border border-line bg-white p-6">
              <h2 id="event-details" className="text-2xl">
                {t('events.detail.detailsTitle')}
              </h2>
              <dl className="mt-4 space-y-4 text-sm" data-testid="event-details">
                <div>
                  <dt className="text-xs text-muted">{t('common.status')}</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    <Badge tone={event.status === 'CONFIRMED' ? 'success' : 'gold'}>{t(`eventStatus.${event.status}`)}</Badge>
                    {event.isDemo && <Badge tone="demo">{t('status.demo')}</Badge>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('sailing.events.date')}</dt>
                  <dd className="font-medium">{pick(event, 'dateLabel', locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">{t('sailing.events.location')}</dt>
                  <dd className="font-medium">{pick(event, 'location', locale)}</dd>
                </div>
              </dl>
            </section>
          </aside>

          <div className="lg:order-1 lg:col-span-8">
            <div className="mb-12 rounded-xl border border-gold/50 bg-gold/10 p-6" role="note" data-testid="event-not-a-booking">
              <h2 className="text-2xl">{t('events.detail.noteTitle')}</h2>
              {event.status === 'PROPOSED' && <p className="mt-2 leading-relaxed text-ink/85">{t('events.detail.proposal')}</p>}
              <p className="mt-2 leading-relaxed text-ink/85">{t('events.detail.noteBody')}</p>
            </div>

            {interestOpen ? (
              <>
                <SectionHeader title={t('events.detail.interestTitle')} lead={t('events.detail.interestLead')} id="event-interest" />
                <EventInterestForm eventSlug={event.slug} showPartySize={event.type === 'GALA' || event.type === 'OTHER'} />
              </>
            ) : (
              <>
                <h2 id="event-interest" className="text-3xl leading-tight">
                  {t('events.detail.interestTitle')}
                </h2>
                <p className="mt-4 leading-relaxed text-muted" data-testid="event-interest-closed">
                  {t('events.detail.closed')}
                </p>
              </>
            )}
          </div>
        </div>
      </Section>
    </>
  )
}
