import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Seascape } from '@/components/art/Seascape'
import { pillarArt } from '@/components/site/pillar-art'
import { Badge } from '@/components/ui/Badge'
import { buttonStyles } from '@/components/ui/styles'
import { formatMoney, sumCents } from '@/lib/finance'
import { budgetLinesSchema } from '@/lib/admin-validation'
import { getPublishedProject, isPublishableMedia, pick, pickList } from '@/lib/server/public-data'
import { alternates } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const project = await getPublishedProject(slug)
  if (!project) return { title: 'Not found', robots: { index: false } }
  const title = pick(project, 'title', locale)
  const description = pick(project, 'summary', locale)
  return {
    title,
    description,
    alternates: alternates(locale, `/projects/${slug}`),
    openGraph: { title, description, type: 'article' },
  }
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const project = await getPublishedProject(slug)
  if (!project) notFound()

  const t = await getTranslations()
  const format = await getFormatter()
  const lines = budgetLinesSchema.safeParse(project.budgetLines)
  const budgetLines = lines.success ? lines.data : []
  const budgetTotal = budgetLines.length ? sumCents(budgetLines) : project.budgetCents
  const goals = pickList(project, locale)
  const privacyNote = (locale === 'it' ? project.privacyNoteIt : project.privacyNoteEn) || t('projects.detail.privacyDefault')
  const cover = isPublishableMedia(project.coverMedia) && project.coverMedia?.kind === 'IMAGE' ? project.coverMedia : null
  const documents = project.media.filter((m) => m.kind === 'DOCUMENT')
  const money = (cents: number) => formatMoney(cents, locale, project.currency)

  return (
    <article>
      <header className="on-dark relative isolate overflow-hidden bg-navy-deep text-ivory">
        {cover ? (
          <Image
            src={`/api/media/${cover.id}`}
            alt={(locale === 'it' ? cover.altIt : cover.altEn) || ''}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover"
          />
        ) : (
          <Seascape variant={pillarArt(project.pillar)} className="absolute inset-0 -z-20 h-full w-full" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy-deep/90 via-navy-deep/60 to-navy-deep/10" />
        <div className="container-page pt-10 pb-16 md:pb-20">
          <nav aria-label={t('a11y.breadcrumb')} className="text-sm">
            <Link href="/projects" className="text-ivory/80 hover:text-gold-light">
              ← {t('common.backToProjects')}
            </Link>
          </nav>
          <div className="mt-20 max-w-3xl md:mt-28">
            <div className="flex flex-wrap gap-2">
              <Badge tone="onDark">{t(`projectStatus.${project.status}`)}</Badge>
              {project.isDemo && (
                <Badge tone="demo" title={t('status.demoHelp')}>
                  {t('status.demo')}
                </Badge>
              )}
            </div>
            <p className="eyebrow mt-6">{t(`pillars.${project.pillar}.title`)}</p>
            <h1 className="mt-4 text-4xl leading-tight md:text-6xl">{pick(project, 'title', locale)}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ivory/90">{pick(project, 'summary', locale)}</p>
          </div>
        </div>
        {cover?.credit && (
          <p className="absolute right-4 bottom-3 text-[0.65rem] text-ivory/60">
            {cover.credit}
            {cover.license ? ` · ${cover.license}` : ''}
          </p>
        )}
      </header>

      {project.isDemo && (
        <div className="border-b border-gold/40 bg-gold/10">
          <p className="container-page py-3 text-sm text-gold-ink">{t('status.demoHelp')}</p>
        </div>
      )}

      <div className="container-page grid gap-14 py-16 md:py-24 lg:grid-cols-12">
        <div className="space-y-16 lg:col-span-8">
          <section aria-labelledby="overview">
            <h2 id="overview" className="text-3xl">
              {t('projects.detail.overview')}
            </h2>
            <div className="prose-blf mt-5 space-y-4 text-lg leading-relaxed text-ink/90">
              {pick(project, 'description', locale)
                .split(/\n{2,}/)
                .map((para) => (
                  <p key={para.slice(0, 40)}>{para}</p>
                ))}
            </div>
            <p className="mt-6 text-sm text-muted">{t(`projectStatusHelp.${project.status}`)}</p>
          </section>

          {goals.length > 0 && (
            <section aria-labelledby="goals">
              <h2 id="goals" className="text-3xl">
                {t('projects.detail.goals')}
              </h2>
              <ul className="mt-6 space-y-3">
                {goals.map((goal) => (
                  <li key={goal} className="flex gap-3 leading-relaxed">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                    {goal}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="milestones">
            <h2 id="milestones" className="text-3xl">
              {t('projects.detail.milestones')}
            </h2>
            {project.milestones.length === 0 ? (
              <p className="mt-4 text-muted">{t('projects.detail.milestonesEmpty')}</p>
            ) : (
              <ol className="mt-6 border-l border-line">
                {project.milestones.map((m) => (
                  <li key={m.id} className="relative pb-8 pl-8 last:pb-0">
                    <span
                      className={`absolute top-1.5 -left-[7px] h-3.5 w-3.5 rounded-full border-2 ${m.completedAt ? 'border-success bg-success' : 'border-gold bg-ivory'}`}
                      aria-hidden="true"
                    />
                    <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
                      {m.completedAt ? t('projects.detail.milestoneDone') : t('projects.detail.milestonePlanned')}
                      {(locale === 'it' ? m.targetLabelIt : m.targetLabelEn) && ` · ${locale === 'it' ? m.targetLabelIt : m.targetLabelEn}`}
                    </p>
                    <h3 className="mt-1 text-xl">{locale === 'it' ? m.titleIt : m.titleEn}</h3>
                    {(locale === 'it' ? m.descriptionIt : m.descriptionEn) && (
                      <p className="mt-2 leading-relaxed text-muted">{locale === 'it' ? m.descriptionIt : m.descriptionEn}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="updates">
            <h2 id="updates" className="text-3xl">
              {t('projects.detail.updates')}
            </h2>
            {project.updates.length === 0 ? (
              <p className="mt-4 text-muted">{t('projects.detail.updatesEmpty')}</p>
            ) : (
              <ul className="mt-6 space-y-8">
                {project.updates.map((u) => (
                  <li key={u.id} className="border-t border-line pt-6">
                    {u.publishedAt && (
                      <time dateTime={u.publishedAt.toISOString()} className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
                        {format.dateTime(u.publishedAt, { dateStyle: 'long' })}
                      </time>
                    )}
                    <h3 className="mt-2 text-xl">{locale === 'it' ? u.titleIt : u.titleEn}</h3>
                    <p className="mt-2 leading-relaxed whitespace-pre-line text-ink/90">{locale === 'it' ? u.bodyIt : u.bodyEn}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="evidence">
            <h2 id="evidence" className="text-3xl">
              {t('projects.detail.evidence')}
            </h2>
            {documents.length === 0 ? (
              <p className="mt-4 text-muted">{t('projects.detail.evidenceEmpty')}</p>
            ) : (
              <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-white">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <a href={`/api/media/${d.id}`} className="link-underline font-medium text-navy" target="_blank" rel="noopener">
                      {(locale === 'it' ? d.altIt : d.altEn) || d.fileName}
                    </a>
                    <span className="text-xs text-muted">PDF · {Math.ceil(d.sizeBytes / 1024)} KB</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="privacy" className="rounded-xl border border-line bg-ivory-deep p-6 md:p-8">
            <h2 id="privacy" className="text-2xl">
              {t('projects.detail.privacy')}
            </h2>
            <p className="mt-3 leading-relaxed text-ink/85">{privacyNote}</p>
          </section>
        </div>

        <aside className="space-y-8 lg:col-span-4">
          <dl className="space-y-4 rounded-xl border border-line bg-white p-6">
            <div>
              <dt className="text-xs text-muted">{t('common.status')}</dt>
              <dd className="font-medium">{t(`projectStatus.${project.status}`)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('common.location')}</dt>
              <dd className="font-medium">{pick(project, 'location', locale)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">{t('common.pillar')}</dt>
              <dd className="font-medium">{t(`pillars.${project.pillar}.title`)}</dd>
            </div>
          </dl>

          <section aria-labelledby="budget" className="rounded-xl border border-line bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="budget" className="text-2xl">
                {t('projects.detail.budget')}
              </h2>
              {project.budgetIsIllustrative && <Badge tone="gold">{t('status.illustrative')}</Badge>}
            </div>
            {budgetTotal === 0 ? (
              <p className="mt-3 text-sm text-muted">{t('projects.detail.budgetEmpty')}</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">{t('projects.detail.budget')}</caption>
                <tbody>
                  {budgetLines.map((line) => (
                    <tr key={line.labelEn} className="border-b border-line">
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        {locale === 'it' ? line.labelIt : line.labelEn}
                      </th>
                      <td className="py-2 text-right tabular-nums">{money(line.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" className="pt-3 text-left">
                      {t('common.total')}
                    </th>
                    <td className="pt-3 text-right font-semibold tabular-nums">{money(budgetTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
            {project.budgetIsIllustrative && <p className="mt-4 text-xs leading-relaxed text-muted">{t('projects.detail.budgetIllustrative')}</p>}
          </section>

          <section aria-labelledby="funding" className="rounded-xl border border-line bg-white p-6">
            <h2 id="funding" className="text-2xl">
              {t('projects.detail.funding')}
            </h2>
            {project.isDemo ? (
              <p className="mt-3 text-sm text-muted">{t('projects.detail.fundingDemo')}</p>
            ) : (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>{t('projects.detail.pledged')}</dt>
                  <dd className="tabular-nums">{money(project.pledgedCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t('projects.detail.spent')}</dt>
                  <dd className="tabular-nums">{money(project.spentCents)}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="on-dark rounded-xl bg-navy p-6 text-ivory">
            <h2 className="text-2xl">{t('projects.detail.share')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ivory/80">{t('projects.detail.shareBody')}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/donate" className={buttonStyles.gold}>
                {t('common.registerInterest')}
              </Link>
              <Link href="/contact" className={buttonStyles.outlineLight}>
                {t('common.contactUs')}
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </article>
  )
}
