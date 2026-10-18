import Link from 'next/link'

export function NewsletterTabs({ active }: { active: 'subscribers' | 'issues' }) {
  const tabs = [
    { key: 'subscribers', href: '/admin/newsletter', label: 'Subscribers' },
    { key: 'issues', href: '/admin/newsletter/issues', label: 'Issues' },
  ] as const
  return (
    <nav aria-label="Newsletter sections" className="mb-6 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className={`rounded-full border px-4 py-1.5 text-sm ${tab.key === active ? 'border-navy bg-navy text-ivory' : 'border-line bg-white hover:border-navy'}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}

export function EmailNotConfiguredNotice({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="mb-6 rounded-lg border border-gold/60 bg-gold/10 px-5 py-4 text-sm leading-relaxed text-gold-ink" data-testid="email-not-configured">
      <p className="font-semibold">Email is not configured.</p>
      <div className="mt-1">{children}</div>
    </div>
  )
}
