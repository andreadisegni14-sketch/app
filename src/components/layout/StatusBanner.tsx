import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export async function StatusBanner() {
  const t = await getTranslations('status')
  return (
    <div className="bg-gold text-navy-deep" data-testid="status-banner">
      <p className="container-page flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-xs font-medium tracking-wide">
        <span>{t('banner')}</span>
        <Link href="/transparency" className="link-underline font-semibold">
          {t('bannerLink')}
        </Link>
      </p>
    </div>
  )
}
