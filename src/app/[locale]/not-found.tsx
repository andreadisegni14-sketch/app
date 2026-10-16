import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { buttonStyles } from '@/components/ui/styles'

export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <section className="flex min-h-[60vh] items-center bg-ivory py-24">
      <div className="container-page max-w-2xl text-center">
        <p className="font-display text-7xl text-gold-ink">404</p>
        <h1 className="mt-4 text-4xl md:text-5xl">{t('title')}</h1>
        <p className="mt-4 text-lg text-muted">{t('body')}</p>
        <Link href="/" className={`${buttonStyles.primary} mt-10`}>
          {t('home')}
        </Link>
      </div>
    </section>
  )
}
