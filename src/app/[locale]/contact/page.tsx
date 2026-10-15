import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ContactForm } from '@/components/forms/ContactForm'
import { PageHero } from '@/components/ui/PageHero'
import { Section } from '@/components/ui/Section'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'contact', '/contact')
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const next = t.raw('contact.next.items') as string[]

  return (
    <>
      <PageHero eyebrow={t('contact.hero.eyebrow')} title={t('contact.hero.title')} lead={t('contact.hero.lead')} art="coast" caption={t('a11y.artworkCaption')} />
      <Section labelledBy="contact-form-title">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="contact-form-title" className="mb-8 text-3xl">
              {t('contact.formTitle')}
            </h2>
            <ContactForm />
          </div>
          <aside className="lg:col-span-5">
            <div className="rounded-xl border border-line bg-ivory-deep p-7">
              <h2 className="text-2xl">{t('contact.next.title')}</h2>
              <ol className="mt-5 space-y-4">
                {next.map((item, i) => (
                  <li key={item} className="flex gap-4 text-sm leading-relaxed">
                    <span className="font-display text-lg text-gold-ink" aria-hidden="true">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </Section>
    </>
  )
}
