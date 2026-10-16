'use client'

import Script from 'next/script'
import { useCallback, useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { CONSENT_COOKIE, CONSENT_MAX_AGE_SECONDS, publicAnalytics } from '@/lib/public-config'
import { buttonStyles } from '@/components/ui/styles'

type Consent = 'analytics' | 'necessary' | null

const OPEN_EVENT = 'blf:open-consent'

function readConsent(): Consent {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`))
  const value = match?.[1]
  return value === 'analytics' || value === 'necessary' ? value : null
}

function writeConsent(value: Exclude<Consent, null>) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
}

/**
 * Rendered only when analytics is configured. Without analytics the site uses technical cookies
 * only, which do not require consent, so no banner is shown at all.
 */
export function ConsentBanner({
  labels,
}: {
  labels: { title: string; body: string; accept: string; reject: string; learnMore: string }
}) {
  const [consent, setConsent] = useState<Consent>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const current = readConsent()
    // Reading a cookie is only possible after mount; syncing it into state here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(current)
    setOpen(current === null)
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [])

  const choose = useCallback((value: Exclude<Consent, null>) => {
    writeConsent(value)
    setConsent(value)
    setOpen(false)
  }, [])

  return (
    <>
      {consent === 'analytics' && publicAnalytics.domain && (
        <Script defer data-domain={publicAnalytics.domain} src={publicAnalytics.src} strategy="afterInteractive" />
      )}
      {open && (
        <section
          aria-labelledby="consent-title"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-xl border border-line bg-white p-5 shadow-2xl md:p-6"
        >
          <h2 id="consent-title" className="text-xl">
            {labels.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {labels.body}{' '}
            <Link href="/cookies" className="link-underline text-navy">
              {labels.learnMore}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={buttonStyles.primary} onClick={() => choose('analytics')}>
              {labels.accept}
            </button>
            <button type="button" className={buttonStyles.outline} onClick={() => choose('necessary')}>
              {labels.reject}
            </button>
          </div>
        </section>
      )}
    </>
  )
}

export function ConsentReopenButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="text-ivory/80 transition-colors hover:text-gold-light"
    >
      {label}
    </button>
  )
}
