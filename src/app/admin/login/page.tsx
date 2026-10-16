import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Emblem } from '@/components/layout/Logo'
import { getCurrentUser } from '@/lib/auth/session'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/admin')
  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy-deep p-4">
      <div className="w-full max-w-sm rounded-xl bg-ivory p-8 shadow-2xl">
        <Emblem className="h-10 w-10 text-gold-ink" />
        <h1 className="mt-4 text-2xl">Blue Legacy administration</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Authorised staff only. All access is logged.</p>
        <LoginForm />
      </div>
    </main>
  )
}
