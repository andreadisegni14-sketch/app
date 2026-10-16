import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Seascape } from '@/components/art/Seascape'
import { Badge } from '@/components/ui/Badge'
import { formatMoney } from '@/lib/finance'
import { pillarArt } from '@/components/site/pillar-art'
import type { Pillar, ProjectStatus } from '@/generated/prisma/enums'

export type ProjectCardData = {
  slug: string
  pillar: Pillar
  status: ProjectStatus
  isDemo: boolean
  title: string
  summary: string
  location: string
  budgetCents: number
  currency: string
}

export async function ProjectCard({ project, locale, headingLevel = 'h3' }: { project: ProjectCardData; locale: string; headingLevel?: 'h2' | 'h3' }) {
  const t = await getTranslations()
  const Heading = headingLevel
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg" data-testid="project-card">
      <div className="relative aspect-[16/9] overflow-hidden bg-navy">
        <Seascape variant={pillarArt(project.pillar)} animated={false} className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <Badge tone="navy">{t(`projectStatus.${project.status}`)}</Badge>
          {project.isDemo && <Badge tone="demo">{t('status.demo')}</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-gold-ink uppercase">{t(`pillars.${project.pillar}.title`)}</p>
        <Heading className="mt-2 text-2xl leading-snug">
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {project.title}
          </Link>
        </Heading>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{project.summary}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
          <div>
            <dt className="text-xs text-muted">{t('common.location')}</dt>
            <dd className="font-medium">{project.location}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">
              {t('common.budget')} <span className="lowercase">({t('status.illustrative')})</span>
            </dt>
            <dd className="font-medium">{project.budgetCents > 0 ? formatMoney(project.budgetCents, locale, project.currency) : t('common.tbc')}</dd>
          </div>
        </dl>
      </div>
    </article>
  )
}
