import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { SponsorForm } from '@/components/forms/SponsorForm'
import { Badge } from '@/components/ui/Badge'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeader } from '@/components/ui/Section'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'partners', '/partners')
}

type Package = { key: string; name: string; amount: string; body: string; benefits: string[] }

export default async function PartnersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const principles = t.raw('partners.principles.items') as string[]
  const packages = t.raw('partners.packages.items') as Package[]
  const steps = t.raw('partners.process.steps') as string[]

  return (
    <>
      <PageHero eyebrow={t('partners.hero.eyebrow')} title={t('partners.hero.title')} lead={t('partners.hero.lead')} art="day" caption={t('a11y.artworkCaption')} />

      <Section labelledBy="principles">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader eyebrow={t('partners.principles.eyebrow')} title={t('partners.principles.title')} id="principles" />
          </div>
          <ol className="space-y-5 lg:col-span-7">
            {principles.map((item, i) => (
              <li key={item} className="flex gap-5 border-b border-line pb-5">
                <span className="font-display text-xl text-gold-ink" aria-hidden="true">
                  {i + 1}.
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section tone="deep" labelledBy="packages">
        <SectionHeader eyebrow={t('partners.packages.eyebrow')} title={t('partners.packages.title')} lead={t('partners.packages.note')} id="packages" />
        <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {packages.map((pkg) => (
            <li key={pkg.key} className="flex flex-col rounded-xl border border-line bg-ivory p-7" data-testid="sponsor-package">
              <Badge tone="gold">{t('status.proposed')}</Badge>
              <h3 className="mt-4 text-2xl">{pkg.name}</h3>
              <p className="mt-1 text-xs text-muted">{t('partners.packages.contribution')}</p>
              <p className="font-display text-3xl text-navy">{pkg.amount}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{pkg.body}</p>
              <ul className="mt-5 flex-1 space-y-2 border-t border-line pt-5 text-sm">
                {pkg.benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="navy" labelledBy="process">
        <SectionHeader eyebrow={t('partners.process.eyebrow')} title={t('partners.process.title')} id="process" />
        <ol className="grid gap-px overflow-hidden rounded-xl bg-ivory/15 md:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step} className="bg-navy p-6">
              <span className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">0{i + 1}</span>
              <p className="mt-3 text-sm leading-relaxed text-ivory/85">{step}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="partner-form">
        <div className="mx-auto max-w-2xl">
          <SectionHeader title={t('partners.formTitle')} lead={t('partners.formLead')} id="partner-form" />
          <SponsorForm />
        </div>
      </Section>
    </>
  )
}
