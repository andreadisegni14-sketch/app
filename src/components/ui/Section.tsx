export function Section({
  children,
  tone = 'ivory',
  className = '',
  id,
  labelledBy,
}: {
  children: React.ReactNode
  tone?: 'ivory' | 'deep' | 'navy' | 'white'
  className?: string
  id?: string
  labelledBy?: string
}) {
  const tones = {
    ivory: 'bg-ivory text-ink',
    deep: 'bg-ivory-deep text-ink',
    white: 'bg-white text-ink',
    navy: 'on-dark bg-navy text-ivory',
  }
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${tones[tone]} py-20 md:py-28 ${className}`}>
      <div className="container-page">{children}</div>
    </section>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  lead,
  id,
  align = 'left',
}: {
  eyebrow?: string
  title: string
  lead?: string
  id?: string
  align?: 'left' | 'center'
}) {
  return (
    <header className={`mb-12 max-w-3xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <p className="eyebrow mb-5">{eyebrow}</p>}
      <h2 id={id} className="text-3xl leading-tight md:text-5xl">
        {title}
      </h2>
      {lead && <p className="mt-5 text-lg leading-relaxed opacity-85">{lead}</p>}
    </header>
  )
}
