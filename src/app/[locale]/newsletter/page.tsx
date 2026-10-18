import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { Link } from '@/i18n/navigation'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'newsletter', '/newsletter')
}

export default async function NewsletterPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('newsletter')
  const items = t.raw('what.items') as string[]

  return (
    <>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} lead={t('hero.lead')} art="dusk" />
      <Section labelledBy="newsletter-what-title">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-7">
            <section>
              <h2 id="newsletter-what-title" className="text-3xl">
                {t('what.title')}
              </h2>
              <ul className="mt-6 space-y-4">
                {items.map((item) => (
                  <li key={item} className="flex gap-4 leading-relaxed">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 leading-relaxed text-ink/85">{t('frequency')}</p>
            </section>
            <div className="grid gap-6 sm:grid-cols-2">
              <section className="rounded-xl border border-line bg-white p-6">
                <h2 className="text-xl">{t('optIn.title')}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/85">{t('optIn.body')}</p>
              </section>
              <section className="rounded-xl border border-line bg-white p-6">
                <h2 className="text-xl">{t('leave.title')}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/85">{t('leave.body')}</p>
              </section>
            </div>
            <p className="text-sm leading-relaxed text-muted">
              {t.rich('privacy', {
                privacy: (chunks) => (
                  <Link href="/privacy" className="link-underline font-medium text-navy">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
          <aside className="lg:col-span-5">
            <div className="rounded-xl border border-line bg-ivory-deep p-7">
              <h2 className="mb-6 text-2xl">{t('formTitle')}</h2>
              <NewsletterForm />
            </div>
          </aside>
        </div>
      </Section>
    </>
  )
}
