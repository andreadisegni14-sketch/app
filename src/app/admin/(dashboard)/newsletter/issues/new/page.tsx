import Link from 'next/link'
import type { Metadata } from 'next'
import { IssueEditor } from '@/components/admin/IssueEditor'
import { PageTitle } from '@/components/admin/ui'
import { requireUser } from '@/lib/auth/session'
import { getNewsletterSenderAddress, getSiteUrl } from '@/lib/env'

export const metadata: Metadata = { title: 'New newsletter issue' }

export default async function NewIssuePage() {
  await requireUser('newsletter:manage')
  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/newsletter/issues" className="text-navy hover:underline">← Issues</Link>
      </p>
      <PageTitle title="New issue" description="Drafts are never sent automatically. Preview both languages, send yourself a test, then send." />
      <IssueEditor siteUrl={getSiteUrl()} senderAddress={getNewsletterSenderAddress() ?? null} />
    </>
  )
}
