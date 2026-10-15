import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { buttonStyles } from '@/components/ui/styles'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Wordmark } from './Logo'
import { MobileNav } from './MobileNav'
import { NavLinks } from './NavLinks'
import { PRIMARY_NAV } from './nav-items'

export async function SiteHeader() {
  const t = await getTranslations()
  const items = PRIMARY_NAV.map((item) => ({ href: item.href, label: t(`nav.${item.key}`) }))
  const switcher = (
    <Suspense fallback={null}>
      <LanguageSwitcher label={t('nav.switchLanguage')} ariaLabel={t('nav.switchLanguageLabel')} />
    </Suspense>
  )

  return (
    <header className="on-dark sticky top-0 z-40 border-b border-ivory/10 bg-navy-deep/95 text-ivory backdrop-blur supports-[backdrop-filter]:bg-navy-deep/85">
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-3 md:gap-6">
        <Link href="/" className="shrink-0 rounded-sm" aria-label={`${t('meta.siteName')} — ${t('nav.home')}`}>
          <Wordmark name={t('meta.siteName')} />
        </Link>
        <nav aria-label={t('a11y.mainNav')} className="hidden lg:block">
          <NavLinks items={items} variant="desktop" />
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">{switcher}</div>
          <div className="hidden sm:block">
            <Link href="/donate" className={`${buttonStyles.gold} px-5 py-2.5`}>
              {t('nav.donate')}
            </Link>
          </div>
          <MobileNav
            items={[{ href: '/', label: t('nav.home') }, ...items, { href: '/donate', label: t('nav.donate') }]}
            openLabel={t('a11y.openMenu')}
            closeLabel={t('a11y.closeMenu')}
            navLabel={t('a11y.mainNav')}
            footer={switcher}
          />
        </div>
      </div>
    </header>
  )
}
