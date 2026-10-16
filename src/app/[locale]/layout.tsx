import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import '../globals.css'

import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { ConsentBanner } from '@/components/layout/ConsentBanner'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { StatusBanner } from '@/components/layout/StatusBanner'
import { analyticsConfigured } from '@/lib/public-config'
import { siteUrl } from '@/lib/runtime-config'
import { alternates } from '@/lib/seo'

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  themeColor: '#102536',
  colorScheme: 'light',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t('siteName'), template: `%s · ${t('siteName')}` },
    description: t('description'),
    applicationName: t('siteName'),
    alternates: alternates(locale, '/'),
    openGraph: {
      siteName: t('siteName'),
      locale: locale === 'it' ? 'it_IT' : 'en_GB',
      type: 'website',
    },
    formatDetection: { telephone: false, email: false, address: false },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const t = await getTranslations()
  const messages = await getMessages()

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only z-[60] rounded-md bg-gold px-4 py-3 font-semibold text-navy-deep focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t('a11y.skipToContent')}
        </a>
        <NextIntlClientProvider messages={{ forms: messages.forms, error: messages.error }}>
          <StatusBanner />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <SiteFooter />
          {analyticsConfigured() && (
            <ConsentBanner
              labels={{
                title: t('consent.title'),
                body: t('consent.body'),
                accept: t('consent.accept'),
                reject: t('consent.reject'),
                learnMore: t('consent.learnMore'),
              }}
            />
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
