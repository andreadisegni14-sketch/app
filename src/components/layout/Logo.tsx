/** The emblem: a sail rising from an open book — "from the regatta course to the classroom". */
export function Emblem({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="18.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="20" cy="20" r="16.4" fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.6" />
      <path d="M20.9 6.8 C24.6 11.2 27.6 17 28.8 23.4 L20.9 23.4 Z" fill="currentColor" />
      <path d="M19.1 9.6 C16.9 14 14.6 18.6 12.4 23.4 L19.1 23.4 Z" fill="currentColor" opacity="0.72" />
      <path d="M8.6 26.4 Q14.3 24.4 19.4 27 L19.4 32.2 Q14.3 29.6 8.6 31.6 Z" fill="currentColor" />
      <path d="M31.4 26.4 Q25.7 24.4 20.6 27 L20.6 32.2 Q25.7 29.6 31.4 31.6 Z" fill="currentColor" />
    </svg>
  )
}

export function Wordmark({ name }: { name: string }) {
  const rest = name.replace(/^The\s+/i, '')
  return (
    <span className="flex items-center gap-3">
      <Emblem className="h-9 w-9 text-gold" />
      <span className="flex flex-col leading-none">
        <span className="text-[0.6rem] font-semibold tracking-[0.3em] text-gold uppercase">The</span>
        <span className="font-display text-lg tracking-tight text-ivory md:text-xl">{rest}</span>
      </span>
    </span>
  )
}
