export function Emblem({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M21 8 L21 26 L30 26 Z" fill="currentColor" />
      <path d="M19 11 L19 26 L12 26 Z" fill="currentColor" opacity="0.7" />
      <path d="M7 29 Q13.5 26.5 20 29 T33 29" fill="none" stroke="currentColor" strokeWidth="1.2" />
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
