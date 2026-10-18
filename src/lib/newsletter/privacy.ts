/** "giulia@example.it" → "g•••@example.it": enough to recognise one's own address, not to harvest it. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at <= 0) return '•••'
  return `${email[0]}•••${email.slice(at)}`
}

/** Locale-aware public path (English at the root, Italian under /it), safe to use outside React. */
export function newsletterPath(locale: string, path: '/newsletter' | '/newsletter/confirm' | '/newsletter/unsubscribe'): string {
  return locale === 'it' ? `/it${path}` : path
}
