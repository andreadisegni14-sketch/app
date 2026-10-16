import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'it'],
  defaultLocale: 'en',
  // English lives at the root (/mission), Italian under /it (/it/mission).
  localePrefix: 'as-needed',
  // English is the default; visitors switch language explicitly. No locale cookie is set,
  // which keeps the site free of non-essential cookies.
  localeDetection: false,
  localeCookie: false,
})

export type AppLocale = (typeof routing.locales)[number]
