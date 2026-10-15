import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalSections, LegalShell } from '@/components/site/LegalPage'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'privacy', '/privacy')
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('legal')
  const sections = t.raw('privacy.sections') as { heading: string; body: string[] }[]
  return (
    <LegalShell title={t('privacy.title')} intro={t('privacy.intro')}>
      <LegalSections sections={sections} replacements={{ controller: t('controllerPending') }} />
    </LegalShell>
  )
}
