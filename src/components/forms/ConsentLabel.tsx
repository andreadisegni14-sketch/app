'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'

export function ConsentLabel() {
  const t = useTranslations('forms')
  return (
    <>
      {t.rich('consent', {
        privacy: (chunks) => (
          <Link href="/privacy" className="link-underline font-medium text-navy" target="_blank">
            {chunks}
          </Link>
        ),
      })}
    </>
  )
}
