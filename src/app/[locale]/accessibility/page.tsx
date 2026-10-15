import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { LegalSections, LegalShell } from '@/components/site/LegalPage'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'accessibility', '/accessibility')
}

export default async function AccessibilityPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('legal')
  const sections = t.raw('accessibility.sections') as { heading: string; body: string[] }[]
  return (
    <LegalShell title={t('accessibility.title')} intro={t('accessibility.intro')}>
      <LegalSections sections={sections} replacements={{ controller: t('controllerPending') }} />
    </LegalShell>
  )
}
