/** Shared class recipes (kept as plain strings so they work in server and client components). */

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold tracking-wide transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 min-h-11'

export const buttonStyles = {
  primary: `${buttonBase} bg-navy text-ivory hover:bg-navy-soft`,
  gold: `${buttonBase} bg-gold text-navy-deep hover:bg-gold-light`,
  outline: `${buttonBase} border border-navy/30 text-navy hover:border-navy hover:bg-navy/5`,
  outlineLight: `${buttonBase} border border-ivory/40 text-ivory hover:border-ivory hover:bg-ivory/10`,
  ghost: `${buttonBase} px-3 text-navy hover:bg-navy/5`,
} as const

export type ButtonVariant = keyof typeof buttonStyles

export const inputStyles =
  'block w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-base text-ink shadow-sm placeholder:text-muted/70 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-gold-ink aria-[invalid=true]:border-error'

export const labelStyles = 'block text-sm font-semibold text-ink'
