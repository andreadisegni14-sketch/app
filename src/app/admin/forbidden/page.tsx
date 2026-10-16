import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Access denied' }

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md text-center" data-testid="forbidden">
        <h1 className="text-3xl">Access denied</h1>
        <p className="mt-3 text-muted">You do not have permission to view this page. Ask an administrator if you need access.</p>
        <Link href="/admin" className="mt-6 inline-block font-semibold text-navy underline">
          Back to the dashboard
        </Link>
      </div>
    </main>
  )
}
