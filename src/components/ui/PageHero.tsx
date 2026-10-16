import { Seascape, type SeascapeVariant } from '@/components/art/Seascape'

export function PageHero({
  eyebrow,
  title,
  lead,
  art = 'dusk',
  children,
  caption,
}: {
  eyebrow: string
  title: string
  lead?: string
  art?: SeascapeVariant
  children?: React.ReactNode
  caption?: string
}) {
  const lightArt = art === 'day' || art === 'coast' || art === 'regatta'
  return (
    <section className="on-dark relative isolate overflow-hidden bg-navy-deep text-ivory">
      <Seascape variant={art} className="absolute inset-0 -z-20 h-full w-full" />
      <div
        className={`absolute inset-0 -z-10 ${
          lightArt
            ? 'bg-gradient-to-r from-navy-deep/90 via-navy-deep/65 to-navy-deep/10'
            : 'bg-gradient-to-r from-navy-deep/85 via-navy-deep/45 to-transparent'
        }`}
      />
      <div className="container-page flex min-h-[26rem] flex-col justify-end pt-28 pb-14 md:min-h-[32rem] md:pb-20">
        <div className="animate-fade-up max-w-3xl">
          <p className="eyebrow mb-6">{eyebrow}</p>
          <h1 className="text-4xl leading-[1.08] md:text-6xl">{title}</h1>
          {lead && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ivory/90 md:text-xl">{lead}</p>}
          {children}
        </div>
      </div>
      {caption && (
        <p className="absolute right-4 bottom-3 max-w-xs text-right text-[0.65rem] leading-snug text-ivory/60 md:right-8">
          {caption}
        </p>
      )}
    </section>
  )
}
