import Link from 'next/link'
import { Emblem } from '@/components/layout/Logo'
import { can, type Permission } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getDonationsMode } from '@/lib/env'
import { logoutAction } from '../actions'

export const dynamic = 'force-dynamic'

const NAV: { href: string; label: string; permission: Permission }[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard:view' },
  { href: '/admin/inquiries', label: 'Enquiries', permission: 'inquiries:view' },
  { href: '/admin/projects', label: 'Projects', permission: 'projects:view' },
  { href: '/admin/events', label: 'Events', permission: 'events:view' },
  { href: '/admin/media', label: 'Media', permission: 'media:view' },
  { href: '/admin/beneficiaries', label: 'Beneficiaries', permission: 'beneficiaries:view' },
  { href: '/admin/donations', label: 'Donations', permission: 'donations:view' },
  { href: '/admin/exports', label: 'Exports', permission: 'exports:download' },
  { href: '/admin/users', label: 'Users', permission: 'users:manage' },
  { href: '/admin/audit', label: 'Audit log', permission: 'audit:view' },
  { href: '/admin/settings', label: 'Settings', permission: 'settings:edit' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('dashboard:view')
  const donations = getDonationsMode()

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="on-dark bg-navy-deep text-ivory md:w-60 md:shrink-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <Emblem className="h-8 w-8 text-gold" />
          <div className="leading-tight">
            <p className="font-display text-base">Blue Legacy</p>
            <p className="text-[0.65rem] tracking-[0.2em] text-gold uppercase">Administration</p>
          </div>
        </div>
        <nav aria-label="Administration" className="px-3 pb-4">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.filter((item) => can(user.role, item.permission)).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-md px-3 py-2 text-sm whitespace-nowrap text-ivory/85 hover:bg-ivory/10 hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-ivory/10 px-5 py-4 text-xs text-ivory/70">
          <p className="truncate" data-testid="admin-user">
            {user.name}
          </p>
          <p className="mt-0.5">
            Role: <span className="font-semibold text-gold">{user.role}</span>
          </p>
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="font-semibold text-ivory hover:underline">
              Sign out
            </button>
          </form>
          <Link href="/" className="mt-2 block hover:underline">
            View public site ↗
          </Link>
        </div>
      </aside>
      <div className="flex-1">
        <div className="border-b border-gold/40 bg-gold/10 px-6 py-2 text-xs text-gold-ink">
          Pre-incorporation mode · Donations {donations.enabled ? `ENABLED (${donations.provider})` : 'disabled'} · Do not publish personal data about minors.
        </div>
        <main id="main" className="px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
