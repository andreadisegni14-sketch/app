'use client'

import { Link, usePathname } from '@/i18n/navigation'

export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

const VARIANTS = {
  desktop: {
    list: 'flex items-center gap-1 xl:gap-2',
    link: (active: boolean) =>
      `relative rounded-full px-3 py-2 text-sm font-medium transition-colors hover:text-gold-light ${
        active ? 'text-gold after:absolute after:inset-x-3 after:-bottom-0.5 after:h-px after:bg-gold' : 'text-ivory/85'
      }`,
  },
  mobile: {
    list: 'flex flex-col',
    link: (active: boolean) =>
      `block border-b border-ivory/10 py-4 font-display text-2xl transition-colors hover:text-gold-light ${
        active ? 'text-gold' : 'text-ivory'
      }`,
  },
} as const

export function NavLinks({
  items,
  variant,
  onNavigate,
}: {
  items: readonly { href: string; label: string }[]
  variant: keyof typeof VARIANTS
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const styles = VARIANTS[variant]
  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href)
        return (
          <li key={item.href}>
            <Link href={item.href} aria-current={active ? 'page' : undefined} className={styles.link(active)} onClick={onNavigate}>
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
