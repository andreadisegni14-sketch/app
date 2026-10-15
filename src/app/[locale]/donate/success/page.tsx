import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Section } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'
import { db } from '@/lib/db'
import { formatMoney } from '@/lib/finance'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'donateSuccess', '/donate/success', { noIndex: true })
}

export default async function DonationSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('donate.success')
  const query = await searchParams
  const sessionId = typeof query.session_id === 'string' ? query.session_id.slice(0, 200) : null

  // The success page is informational only: the webhook is the source of truth for payment status.
  const donation = sessionId
    ? await db.donation.findUnique({
        where: { stripeCheckoutSessionId: sessionId },
        select: { status: true, amountCents: true, currency: true, provider: true },
      })
    : null

  return (
    <Section className="min-h-[60vh]">
      <div className="mx-auto max-w-2xl text-center" data-testid="donation-success">
        <h1 className="text-4xl md:text-6xl">{t('title')}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/85" role="status">
          {!donation
            ? t('unknown')
            : donation.status === 'SUCCEEDED'
              ? t('confirmed', { amount: formatMoney(donation.amountCents, locale, donation.currency, true) })
              : t('pending')}
        </p>
        {donation?.provider === 'MOCK' && <p className="mt-4 text-sm font-medium text-gold-ink">{t('mock')}</p>}
        <p className="mt-4 text-sm text-muted">{t('notReceipt')}</p>
        <Link href="/" className={`${buttonStyles.primary} mt-10`}>
          {t('back')}
        </Link>
      </div>
    </Section>
  )
}
