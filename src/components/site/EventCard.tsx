import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/Badge'
import type { EventStatus } from '@/generated/prisma/enums'

export async function EventCard({
  event,
}: {
  event: { slug: string; status: EventStatus; isDemo: boolean; title: string; summary: string; location: string; dateLabel: string; interestOpen: boolean }
}) {
  const t = await getTranslations()
  return (
    <article className="flex h-full flex-col rounded-xl border border-line bg-white p-7" data-testid="event-card">
      <div className="flex flex-wrap gap-2">
        <Badge tone={event.status === 'CONFIRMED' ? 'success' : 'gold'}>{t(`eventStatus.${event.status}`)}</Badge>
        {event.isDemo && <Badge tone="demo">{t('status.demo')}</Badge>}
      </div>
      <h3 className="mt-4 text-2xl leading-snug">
        <Link href={`/events/${event.slug}`} className="link-underline text-navy hover:text-navy-soft">
          {event.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 leading-relaxed text-muted">{event.summary}</p>
      <dl className="mt-6 grid gap-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">{t('sailing.events.date')}</dt>
          <dd className="font-medium">{event.dateLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t('sailing.events.location')}</dt>
          <dd className="font-medium">{event.location}</dd>
        </div>
      </dl>
    </article>
  )
}
