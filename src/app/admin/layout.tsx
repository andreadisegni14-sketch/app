import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import '../globals.css'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Administration', template: '%s · Blue Legacy admin' },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-ivory antialiased">{children}</body>
    </html>
  )
}
