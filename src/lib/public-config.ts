/** Public (browser-visible) configuration. Only NEXT_PUBLIC_* values belong here. */

export function analyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN)
}

export const publicAnalytics = {
  domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? '',
  src: process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js',
}

export const CONSENT_COOKIE = 'blf_consent'
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180
