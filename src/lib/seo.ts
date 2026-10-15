import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export type PageKey =
  | 'home'
  | 'mission'
  | 'projects'
  | 'sailing'
  | 'gala'
  | 'partners'
  | 'donate'
  | 'donateSuccess'
  | 'donateCancel'
  | 'transparency'
  | 'contact'
  | 'privacy'
  | 'cookies'
  | 'terms'
  | 'accessibility'

/** Locale-aware public path: English at the root, Italian under /it. */
export function localizedPath(locale: string, path: string): string {
  const clean = path === '/' ? '' : path
  return locale === 'it' ? `/it${clean}` || '/it' : clean || '/'
}

export function alternates(locale: string, path: string): Metadata['alternates'] {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      en: localizedPath('en', path),
      it: localizedPath('it', path),
      'x-default': localizedPath('en', path),
    },
  }
}

export async function pageMetadata(
  locale: string,
  key: PageKey,
  path: string,
  options: { noIndex?: boolean } = {},
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' })
  const title = t(`pages.${key}.title`)
  const description = t(`pages.${key}.description`)
  return {
    title: key === 'home' ? { absolute: `${t('siteName')} — ${title}` } : title,
    description,
    alternates: alternates(locale, path),
    openGraph: {
      title,
      description,
      url: localizedPath(locale, path),
      siteName: t('siteName'),
      locale: locale === 'it' ? 'it_IT' : 'en_GB',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
    ...(options.noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
