import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { FooterNewsletterForm } from '@/components/forms/NewsletterForm'
import { analyticsConfigured } from '@/lib/public-config'
import { isSiteOffline } from '@/lib/runtime-config'
import { ConsentReopenButton } from './ConsentBanner'
import { Wordmark } from './Logo'
import { LEGAL_NAV, PRIMARY_NAV } from './nav-items'

export async function SiteFooter() {
  const t = await getTranslations()
  const year = new Date().getFullYear()
  return (
    <footer className="on-dark bg-navy-deep text-ivory">
      {!isSiteOffline() && (
        <section aria-labelledby="footer-newsletter-title" className="border-b border-ivory/10">
          <div className="container-page grid gap-6 py-12 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-5">
              <h2 id="footer-newsletter-title" className="text-2xl">
                {t('forms.newsletter.title')}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-ivory/75">{t('forms.newsletter.lead')}</p>
              <Link href="/newsletter" className="mt-3 inline-block text-sm font-medium text-gold-light underline-offset-4 hover:underline">
                {t('forms.newsletter.more')} →
              </Link>
            </div>
            <div className="md:col-span-7">
              <FooterNewsletterForm />
            </div>
          </div>
        </section>
      )}
      <div className="container-page grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark name={t('meta.siteName')} />
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ivory/75">{t('footer.about')}</p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-ivory/60">{t('footer.notLegalAdvice')}</p>
        </div>
        <nav aria-label={t('a11y.footerNav')} className="md:col-span-4">
          <h2 className="eyebrow mb-5 font-sans text-xs">{t('footer.explore')}</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[...PRIMARY_NAV, { href: '/donate', key: 'donate' } as const, { href: '/newsletter', key: 'newsletter' } as const].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ivory/80 transition-colors hover:text-gold-light">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('a11y.legalNav')} className="md:col-span-3">
          <h2 className="eyebrow mb-5 font-sans text-xs">{t('footer.legal')}</h2>
          <ul className="space-y-3 text-sm">
            {LEGAL_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-ivory/80 transition-colors hover:text-gold-light">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
            {analyticsConfigured() && (
              <li>
                <ConsentReopenButton label={t('consent.manage')} />
              </li>
            )}
          </ul>
        </nav>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ivory/60 md:flex-row md:justify-between">
          <p>{t('footer.copyright', { year })}</p>
          <p>{t('footer.credits')}</p>
        </div>
      </div>
    </footer>
  )
}
