'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { buttonStyles } from '@/components/ui/styles'

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('error')
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <section className="flex min-h-[60vh] items-center bg-ivory py-24" role="alert">
      <div className="container-page max-w-2xl text-center">
        <h1 className="text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-4 text-lg text-muted">{t('body')}</p>
        <button type="button" onClick={reset} className={`${buttonStyles.primary} mt-10`}>
          {t('retry')}
        </button>
      </div>
    </section>
  )
}
