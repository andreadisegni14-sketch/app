import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { confirmNewsletterAction } from '@/app/actions/public'
import { Link } from '@/i18n/navigation'
import { Section } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'
import { checkConfirmToken } from '@/lib/server/newsletter'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'newsletterConfirm', '/newsletter/confirm', { noIndex: true })
}

export default async function NewsletterConfirmPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('newsletter.confirm')
  const query = await searchParams
  const token = typeof query.token === 'string' ? query.token.slice(0, 100) : ''
  // Viewing this page changes nothing: the subscription is confirmed only by pressing the button.
  const state = query.confirmed === '1' ? 'confirmed' : await checkConfirmToken(token)

  return (
    <Section className="min-h-[60vh]">
      <div className="mx-auto max-w-2xl text-center" data-testid="newsletter-confirm" data-state={state}>
        {state === 'confirmed' ? (
          <>
            <h1 className="text-4xl md:text-5xl">{t('doneTitle')}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink/85" role="status">
              {t('doneBody')}
            </p>
            <Link href="/" className={`${buttonStyles.primary} mt-10`}>
              {t('home')}
            </Link>
          </>
        ) : state === 'valid' ? (
          <>
            <h1 className="text-4xl md:text-5xl">{t('title')}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink/85">{t('prompt')}</p>
            <form action={confirmNewsletterAction} className="mt-10">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className={buttonStyles.primary}>
                {t('button')}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-4xl md:text-5xl">{t('invalidTitle')}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink/85" role="status">
              {t('invalidBody')}
            </p>
            <Link href="/newsletter" className={`${buttonStyles.primary} mt-10`}>
              {t('subscribeAgain')}
            </Link>
          </>
        )}
      </div>
    </Section>
  )
}
