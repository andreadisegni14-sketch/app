import { getFormatter, getTranslations } from 'next-intl/server'

export const LEGAL_LAST_UPDATED = new Date('2026-10-15T00:00:00Z')

export async function LegalShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  const t = await getTranslations('legal')
  const format = await getFormatter()
  return (
    <article className="bg-ivory py-16 md:py-24">
      <div className="container-page max-w-3xl">
        <p className="eyebrow mb-5">{t('reviewNotice').split('.')[0]}</p>
        <h1 className="text-4xl md:text-6xl">{title}</h1>
        <p className="mt-4 text-sm text-muted">{t('lastUpdated', { date: format.dateTime(LEGAL_LAST_UPDATED, { dateStyle: 'long' }) })}</p>
        <div role="note" className="mt-8 rounded-lg border border-gold/50 bg-gold/10 px-5 py-4 text-sm leading-relaxed text-gold-ink" data-testid="legal-review-notice">
          {t('reviewNotice')}
        </div>
        <p className="mt-10 text-lg leading-relaxed">{intro}</p>
        <div className="mt-10 space-y-10">{children}</div>
      </div>
    </article>
  )
}

export function LegalSections({ sections, replacements = {} }: { sections: { heading: string; body: string[] }[]; replacements?: Record<string, string> }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-2xl md:text-3xl">{section.heading}</h2>
          <div className="mt-4 space-y-3 leading-relaxed text-ink/90">
            {section.body.map((para) => (
              <p key={para.slice(0, 60)}>{para.replace(/\{(\w+)\}/g, (match, key: string) => replacements[key] ?? match)}</p>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
