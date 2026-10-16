import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Seascape } from '@/components/art/Seascape'
import { ProjectCard } from '@/components/site/ProjectCard'
import { Section, SectionHeader } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'
import { PILLARS } from '@/lib/constants'
import { getFeaturedProject, getSetting, pick } from '@/lib/server/public-data'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'home', '/')
}

type LaunchNote = { en?: string; it?: string }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const [featured, launchNote] = await Promise.all([getFeaturedProject(), getSetting<LaunchNote>('launchStatusNote')])
  const note = launchNote?.[locale === 'it' ? 'it' : 'en']

  const participate = t.raw('home.participate.items') as { title: string; body: string; cta: string; href: string }[]
  const launchItems = t.raw('home.launch.items') as { label: string; value: string }[]
  const pilotItems = t.raw('home.pilot.items') as string[]

  return (
    <>
      {/* Hero */}
      <section className="on-dark relative isolate overflow-hidden bg-navy-deep text-ivory">
        <Seascape variant="dusk" className="absolute inset-0 -z-20 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-deep via-navy-deep/40 to-navy-deep/10" />
        <div className="container-page flex min-h-[calc(100svh-7rem)] flex-col justify-end pt-32 pb-16 md:pb-24">
          <div className="animate-fade-up max-w-4xl">
            <p className="eyebrow mb-6">{t('home.hero.eyebrow')}</p>
            <h1 className="text-5xl leading-[1.02] md:text-7xl lg:text-8xl">{t('home.hero.title')}</h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ivory/90 md:text-xl">{t('home.hero.lead')}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/mission" className={buttonStyles.gold}>
                {t('home.hero.primary')}
              </Link>
              <Link href="/donate" className={buttonStyles.outlineLight}>
                {t('home.hero.secondary')}
              </Link>
            </div>
          </div>
        </div>
        <p className="absolute right-4 bottom-3 max-w-xs text-right text-[0.65rem] leading-snug text-ivory/55 md:right-8">
          {t('a11y.artworkCaption')}
        </p>
      </section>

      {/* Mission statement */}
      <Section labelledBy="home-mission">
        <div className="grid gap-10 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <p className="eyebrow mb-5">{t('home.mission.eyebrow')}</p>
            <h2 id="home-mission" className="text-3xl leading-tight md:text-5xl">
              {t('home.mission.title')}
            </h2>
          </div>
          <div className="md:col-span-7 md:pt-12">
            <p className="font-display text-xl leading-relaxed text-ink/90 md:text-2xl">{t('home.mission.body')}</p>
            <Link href="/mission" className="link-underline mt-8 inline-block text-sm font-semibold text-navy">
              {t('common.readMore')} →
            </Link>
          </div>
        </div>
      </Section>

      {/* Pillars */}
      <Section tone="navy" labelledBy="home-pillars">
        <SectionHeader eyebrow={t('home.pillars.eyebrow')} title={t('home.pillars.title')} id="home-pillars" />
        <ol className="grid gap-px overflow-hidden rounded-xl border border-ivory/15 bg-ivory/15 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <li key={pillar} className="flex flex-col bg-navy p-8">
              <span className="font-display text-4xl text-gold" aria-hidden="true">
                {t(`pillars.${pillar}.numeral`)}
              </span>
              <h3 className="mt-6 text-2xl leading-snug">{t(`pillars.${pillar}.title`)}</h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-ivory/80">{t(`pillars.${pillar}.short`)}</p>
              <Link
                href={{ pathname: '/projects', query: { pillar } }}
                className="mt-6 text-sm font-semibold text-gold-light transition-colors hover:text-ivory"
              >
                {t('common.learnMore')} <span className="sr-only">— {t(`pillars.${pillar}.title`)}</span> →
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      {/* Featured project + pilot */}
      <Section labelledBy="home-featured">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-5">{t('home.pilot.eyebrow')}</p>
            <h2 id="home-featured" className="text-3xl leading-tight md:text-5xl">
              {t('home.pilot.title')}
            </h2>
            <ul className="mt-8 space-y-4">
              {pilotItems.map((item, i) => (
                <li key={item} className="flex gap-4 border-b border-line pb-4">
                  <span className="font-display text-xl text-gold-ink" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <span className="text-base leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted">{t('home.pilot.note')}</p>
          </div>
          <div className="lg:col-span-7">
            <p className="eyebrow mb-5">{t('home.featured.eyebrow')}</p>
            {featured ? (
              <ProjectCard
                locale={locale}
                project={{
                  ...featured,
                  title: pick(featured, 'title', locale),
                  summary: pick(featured, 'summary', locale),
                  location: pick(featured, 'location', locale),
                }}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-line p-10 text-center text-muted">{t('home.featured.empty')}</p>
            )}
            <Link href="/projects" className="link-underline mt-6 inline-block text-sm font-semibold text-navy">
              {t('common.allProjects')} →
            </Link>
          </div>
        </div>
      </Section>

      {/* Participate */}
      <Section tone="deep" labelledBy="home-participate">
        <SectionHeader
          eyebrow={t('home.participate.eyebrow')}
          title={t('home.participate.title')}
          lead={t('home.participate.lead')}
          id="home-participate"
        />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {participate.map((item) => (
            <li key={item.href} className="flex flex-col rounded-xl border border-line bg-ivory p-7">
              <h3 className="text-xl">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{item.body}</p>
              <Link href={item.href} className="link-underline mt-6 text-sm font-semibold text-navy">
                {item.cta} →
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Launch status */}
      <Section labelledBy="home-launch">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-5">{t('home.launch.eyebrow')}</p>
            <h2 id="home-launch" className="text-3xl leading-tight md:text-5xl">
              {t('home.launch.title')}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted">{t('home.launch.lead')}</p>
            {note && <p className="mt-6 border-l-2 border-gold pl-4 text-sm leading-relaxed">{note}</p>}
          </div>
          <div className="lg:col-span-7">
            <dl className="divide-y divide-line rounded-xl border border-line bg-white" data-testid="launch-status">
              {launchItems.map((item) => (
                <div key={item.label} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="text-sm text-muted">{item.label}</dt>
                  <dd className="font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
            <Link href="/transparency" className={`${buttonStyles.outline} mt-6`}>
              {t('home.launch.cta')}
            </Link>
          </div>
        </div>
      </Section>
    </>
  )
}
