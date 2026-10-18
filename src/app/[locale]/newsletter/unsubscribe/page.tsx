import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { unsubscribeNewsletterAction } from '@/app/actions/public'
import { Link } from '@/i18n/navigation'
import { Section } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'
import { getUnsubscribeState } from '@/lib/server/newsletter'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'newsletterUnsubscribe', '/newsletter/unsubscribe', { noIndex: true })
}

export default async function NewsletterUnsubscribePage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('newsletter.unsubscribe')
  const query = await searchParams
  const token = typeof query.token === 'string' ? query.token.slice(0, 100) : ''
  // GET never changes state (mail scanners follow links); only the button below unsubscribes.
  const info = await getUnsubscribeState(token)

  return (
    <Section className="min-h-[60vh]">
      <div className="mx-auto max-w-2xl text-center" data-testid="newsletter-unsubscribe" data-state={info.state}>
        {info.state === 'subscribed' ? (
          <>
            <h1 className="text-4xl md:text-5xl">{t('title')}</h1>
            <p className="mt-6 text-lg leading-relaxed break-words text-ink/85">{t('prompt', { email: info.maskedEmail })}</p>
            <form action={unsubscribeNewsletterAction} className="mt-10">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className={buttonStyles.primary}>
                {t('button')}
              </button>
            </form>
          </>
        ) : info.state === 'unsubscribed' ? (
          <>
            <h1 className="text-4xl md:text-5xl">{t('doneTitle')}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink/85" role="status">
              {t('doneBody')}
            </p>
            <Link href="/newsletter" className={`${buttonStyles.outline} mt-10`}>
              {t('resubscribe')}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl">{t('invalidTitle')}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink/85" role="status">
              {t('invalidBody')}
            </p>
            <Link href="/contact" className={`${buttonStyles.primary} mt-10`}>
              {t('contact')}
            </Link>
          </>
        )}
      </div>
    </Section>
  )
}
