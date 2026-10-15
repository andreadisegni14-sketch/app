import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Section } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'donateCancel', '/donate/cancel', { noIndex: true })
}

export default async function DonationCancelPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  return (
    <Section className="min-h-[60vh]">
      <div className="mx-auto max-w-2xl text-center" data-testid="donation-cancel">
        <h1 className="text-4xl md:text-5xl">{t('donate.cancel.title')}</h1>
        <p className="mt-6 text-lg leading-relaxed text-ink/85">{t('donate.cancel.body')}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/donate" className={buttonStyles.primary}>
            {t('donate.cancel.retry')}
          </Link>
          <Link href="/contact" className={buttonStyles.outline}>
            {t('common.contactUs')}
          </Link>
        </div>
      </div>
    </Section>
  )
}
