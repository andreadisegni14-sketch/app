'use client'

import { useLocale } from 'next-intl'
import { getPathname, Link, usePathname } from '@/i18n/navigation'

/**
 * Server-rendered link to the same page in the other language (works without JavaScript).
 * With JavaScript, the current query string (e.g. project filters) is carried over on click.
 */
export function LanguageSwitcher({ label, ariaLabel, className = '' }: { label: string; ariaLabel: string; className?: string }) {
  const locale = useLocale()
  const pathname = usePathname()
  const target = locale === 'en' ? 'it' : 'en'

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      data-testid="language-switch"
      onClick={(event) => {
        const search = window.location.search
        if (!search || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        window.location.assign(`${getPathname({ href: pathname, locale: target })}${search}`)
      }}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-ivory/25 px-3.5 text-xs font-semibold tracking-[0.14em] text-ivory uppercase transition-colors hover:border-gold hover:text-gold-light ${className}`}
    >
      <span aria-hidden="true">{target.toUpperCase()}</span>
      <span className="sr-only">{label}</span>
    </Link>
  )
}
