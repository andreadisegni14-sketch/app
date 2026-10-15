type Tone = 'neutral' | 'gold' | 'navy' | 'success' | 'warning' | 'demo' | 'onDark'

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-ivory-deep text-ink',
  gold: 'border-gold/60 bg-gold/10 text-gold-ink',
  navy: 'border-navy bg-navy text-ivory',
  success: 'border-success/40 bg-success/10 text-success',
  warning: 'border-error/40 bg-error/5 text-error',
  demo: 'border-dashed border-gold-ink/60 bg-ivory text-gold-ink',
  onDark: 'border-gold bg-navy-deep/70 text-gold-light',
}

export function Badge({ children, tone = 'neutral', title }: { children: React.ReactNode; tone?: Tone; title?: string }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
