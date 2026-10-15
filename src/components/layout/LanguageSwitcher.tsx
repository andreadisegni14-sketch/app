'use client'

import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'

export function LanguageSwitcher({ label, ariaLabel, className = '' }: { label: string; ariaLabel: string; className?: string }) {
  const locale = useLocale()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const target = locale === 'en' ? 'it' : 'en'
  const query = Object.fromEntries(searchParams.entries())

  return (
    <Link
      href={{ pathname, query }}
      locale={target}
      hrefLang={target}
      lang={target}
      aria-label={ariaLabel}
      data-testid="language-switch"
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-ivory/25 px-3.5 text-xs font-semibold tracking-[0.14em] text-ivory uppercase transition-colors hover:border-gold hover:text-gold-light ${className}`}
    >
      <span aria-hidden="true">{target.toUpperCase()}</span>
      <span className="sr-only">{label}</span>
    </Link>
  )
}
