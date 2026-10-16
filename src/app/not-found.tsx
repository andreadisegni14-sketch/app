import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import './globals.css'

import Link from 'next/link'

// Fallback for requests that never reach a locale (e.g. malformed paths).
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-navy-deep p-6 text-ivory">
        <main className="max-w-md text-center">
          <h1 className="text-4xl">Off the chart.</h1>
          <p className="mt-4 text-ivory/80">We could not find the page you were looking for.</p>
          <Link href="/" className="mt-8 inline-block underline underline-offset-4">
            Back to the homepage
          </Link>
        </main>
      </body>
    </html>
  )
}
