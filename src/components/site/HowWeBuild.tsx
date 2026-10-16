import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Section, SectionHeader } from '@/components/ui/Section'
import { buttonStyles } from '@/components/ui/styles'

type Step = { title: string; body: string }

/** Line icons for the four steps: sail (raise), magnifier (choose), school (fund), check (verify). */
const ICONS = [
  <path key="sail" d="M24 6v28h14L24 6Zm-3 6L10 34h11V12ZM6 39c4-2.5 8-2.5 12 0s8 2.5 12 0 8-2.5 12 0" />,
  <path key="search" d="M21 34a13 13 0 1 0 0-26 13 13 0 0 0 0 26Zm9.5-3.5L41 41M15 21l4 4 8-8" />,
  <path key="school" d="M6 20 24 9l18 11M10 18v22h28V18M20 40V30h8v10M15 25h3m12 0h3" />,
  <path key="report" d="M12 6h18l8 8v28H12V6Zm18 0v8h8M18 27l4 4 9-10" />,
]

export async function HowWeBuild({ detailed = false, tone = 'white' }: { detailed?: boolean; tone?: 'white' | 'ivory' }) {
  const t = await getTranslations('howWeBuild')
  const steps = t.raw('steps') as Step[]
  const why = t.raw('why') as string[]
  const criteria = t.raw('criteria') as string[]

  return (
    <Section tone={tone} labelledBy="how-we-build">
      <SectionHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} id="how-we-build" />

      <ol className="relative grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        <span className="absolute top-8 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-gold/0 via-gold to-gold/0 lg:block" aria-hidden="true" />
        {steps.map((step, i) => (
          <li key={step.title} className="relative" data-testid="how-step">
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-gold bg-navy text-gold shadow-lg shadow-navy/20">
              <svg
                viewBox="0 0 48 48"
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {ICONS[i % ICONS.length]}
              </svg>
            </span>
            <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-gold-ink uppercase">0{i + 1}</p>
            <h3 className="mt-2 text-xl leading-snug">{step.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <div className={`mt-16 grid gap-10 ${detailed ? 'lg:grid-cols-2 lg:items-start' : ''}`}>
        <div className="rounded-2xl bg-navy p-8 text-ivory md:p-10">
          <h3 className="text-2xl">{t('whyTitle')}</h3>
          <ul className={`mt-6 grid gap-4 ${detailed ? '' : 'md:grid-cols-2'}`}>
            {why.map((item) => (
              <li key={item} className="flex gap-3 leading-relaxed text-ivory/85">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        {detailed && (
          <div className="rounded-2xl border border-line p-8 md:p-10">
            <h3 className="text-2xl">{t('criteriaTitle')}</h3>
            <ul className="mt-6 space-y-4">
              {criteria.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="mt-8 max-w-3xl border-l-2 border-gold pl-5 text-sm leading-relaxed text-muted">{t('note')}</p>
      {!detailed && (
        <Link href="/mission" className={`${buttonStyles.primary} mt-8`}>
          {t('cta')}
        </Link>
      )}
    </Section>
  )
}
