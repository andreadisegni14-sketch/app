'use client'

import { useRef } from 'react'
import { NavLinks } from './NavLinks'

export function MobileNav({
  items,
  openLabel,
  closeLabel,
  navLabel,
  footer,
}: {
  items: readonly { href: string; label: string }[]
  openLabel: string
  closeLabel: string
  navLabel: string
  footer?: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        aria-controls="mobile-menu"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ivory/25 text-ivory lg:hidden"
      >
        <span className="sr-only">{openLabel}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path d="M3 7h18M3 12h18M3 17h12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label={navLabel}
        className="on-dark m-0 ml-auto h-dvh max-h-none w-full max-w-sm bg-navy-deep p-0 text-ivory"
        onClick={(event) => {
          // Clicking the backdrop (the dialog element itself) closes the menu.
          if (event.target === dialogRef.current) close()
        }}
      >
        <div className="flex h-full flex-col px-6 pt-5 pb-8">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ivory/25"
            >
              <span className="sr-only">{closeLabel}</span>
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <nav aria-label={navLabel} className="mt-6 flex-1 overflow-y-auto">
            <NavLinks items={items} variant="mobile" onNavigate={close} />
          </nav>
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </dialog>
    </>
  )
}
