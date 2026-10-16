import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { PageHero } from '@/components/ui/PageHero'
import { Section, SectionHeader } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'
import { PILLARS } from '@/lib/constants'
import { pageMetadata } from '@/lib/seo'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'mission', '/mission')
}

export default async function MissionPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('mission')
  const tp = await getTranslations('pillars')
  const tc = await getTranslations()

  const values = t.raw('values.items') as { title: string; body: string }[]
  const steps = t.raw('theory.steps') as { title: string; body: string }[]
  const methodology = t.raw('methodology.items') as string[]
  const governance = t.raw('governance.items') as string[]

  return (
    <>
      <PageHero eyebrow={t('hero.eyebrow')} title={t('hero.title')} lead={t('hero.lead')} art="day" caption={tc('a11y.artworkCaption')} />

      <Section>
        <blockquote className="mx-auto max-w-4xl text-center">
          <p className="font-display text-2xl leading-relaxed text-navy md:text-3xl">“{t('statement')}”</p>
        </blockquote>
        <div className="hairline mx-auto mt-16 max-w-xl" />
        <ol className="mt-16 grid gap-10 md:grid-cols-2">
          {PILLARS.map((pillar) => (
            <li key={pillar} className="flex gap-6">
              <span className="font-display text-3xl text-gold-ink" aria-hidden="true">
                {tp(`${pillar}.numeral`)}
              </span>
              <div>
                <h2 className="text-2xl">{tp(`${pillar}.title`)}</h2>
                <p className="mt-3 leading-relaxed text-muted">{tp(`${pillar}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="deep" labelledBy="values">
        <SectionHeader eyebrow={t('values.eyebrow')} title={t('values.title')} id="values" />
        <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => (
            <li key={value.title} className="border-t border-gold pt-6">
              <h3 className="text-2xl">{value.title}</h3>
              <p className="mt-3 leading-relaxed text-muted">{value.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="navy" labelledBy="theory">
        <SectionHeader eyebrow={t('theory.eyebrow')} title={t('theory.title')} lead={t('theory.lead')} id="theory" />
        <ol className="grid gap-px overflow-hidden rounded-xl bg-ivory/15 md:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.title} className="bg-navy p-6">
              <span className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">0{i + 1}</span>
              <h3 className="mt-3 text-xl">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ivory/80">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-3xl border-l-2 border-gold pl-5 text-sm leading-relaxed text-ivory/80">{t('theory.assumptions')}</p>
      </Section>

      <Section labelledBy="methodology">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow={t('methodology.eyebrow')} title={t('methodology.title')} id="methodology" />
            <ul className="space-y-4">
              {methodology.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeader eyebrow={t('governance.eyebrow')} title={t('governance.title')} lead={t('governance.lead')} />
            <ul className="space-y-4">
              {governance.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-wrap gap-4">
          <Link href="/projects" className={buttonStyles.primary}>
            {tc('common.allProjects')}
          </Link>
          <Link href="/transparency" className={buttonStyles.outline}>
            {tc('nav.transparency')}
          </Link>
        </div>
      </Section>
    </>
  )
}
