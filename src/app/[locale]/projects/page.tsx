import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { ProjectCard } from '@/components/site/ProjectCard'
import { PageHero } from '@/components/ui/PageHero'
import { buttonStyles, inputStyles, labelStyles } from '@/components/ui/styles'
import { PILLARS, PROJECT_STATUSES } from '@/lib/constants'
import { listPublishedProjects, pick } from '@/lib/server/public-data'
import { localizedPath, pageMetadata } from '@/lib/seo'
import type { Pillar, ProjectStatus } from '@/generated/prisma/enums'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return pageMetadata(locale, 'projects', '/projects')
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function ProjectsPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const query = await searchParams

  const statusParam = one(query.status)
  const pillarParam = one(query.pillar)
  const status = (PROJECT_STATUSES as string[]).includes(statusParam ?? '') ? (statusParam as ProjectStatus) : undefined
  const pillar = (PILLARS as string[]).includes(pillarParam ?? '') ? (pillarParam as Pillar) : undefined

  const projects = await listPublishedProjects({ status, pillar })
  const filtered = Boolean(status || pillar)

  return (
    <>
      <PageHero eyebrow={t('projects.hero.eyebrow')} title={t('projects.hero.title')} lead={t('projects.hero.lead')} art="coast" caption={t('a11y.artworkCaption')} />
      <section className="py-16 md:py-24" aria-labelledby="project-results">
        <div className="container-page">
          <form
            method="get"
            action={localizedPath(locale, '/projects')}
            className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            aria-label={t('projects.filters.title')}
          >
            <div className="space-y-1.5">
              <label htmlFor="filter-status" className={labelStyles}>
                {t('projects.filters.status')}
              </label>
              <select id="filter-status" name="status" defaultValue={status ?? ''} className={inputStyles}>
                <option value="">{t('projects.filters.all')}</option>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`projectStatus.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="filter-pillar" className={labelStyles}>
                {t('projects.filters.pillar')}
              </label>
              <select id="filter-pillar" name="pillar" defaultValue={pillar ?? ''} className={inputStyles}>
                <option value="">{t('projects.filters.all')}</option>
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {t(`pillars.${p}.title`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={buttonStyles.primary}>
                {t('projects.filters.apply')}
              </button>
              {filtered && (
                <Link href="/projects" className={buttonStyles.ghost}>
                  {t('projects.filters.reset')}
                </Link>
              )}
            </div>
          </form>

          <div className="mt-10 flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="project-results" className="text-2xl" aria-live="polite">
              {t('projects.filters.results', { count: projects.length })}
            </h2>
            <details className="text-sm text-muted">
              <summary className="cursor-pointer font-medium text-navy">{t('common.status')}</summary>
              <dl className="mt-3 grid max-w-xl gap-2">
                {PROJECT_STATUSES.map((s) => (
                  <div key={s} className="grid grid-cols-[8rem_1fr] gap-3">
                    <dt className="font-semibold text-ink">{t(`projectStatus.${s}`)}</dt>
                    <dd>{t(`projectStatusHelp.${s}`)}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </div>

          {projects.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-line p-12 text-center">
              <p className="text-muted">{t('projects.empty')}</p>
              {filtered && (
                <Link href="/projects" className={`${buttonStyles.outline} mt-6`}>
                  {t('projects.emptyCta')}
                </Link>
              )}
            </div>
          ) : (
            <ul className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard
                    locale={locale}
                    project={{
                      ...project,
                      title: pick(project, 'title', locale),
                      summary: pick(project, 'summary', locale),
                      location: pick(project, 'location', locale),
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
