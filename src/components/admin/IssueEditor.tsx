'use client'

import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import type { AdminFormState } from '@/app/admin/actions'
import { saveIssueAction } from '@/app/admin/newsletter-actions'
import { renderIssueEmail, type EmailLocale } from '@/lib/newsletter/templates'
import { adminInput, adminLabel } from './ui'

type IssueContent = { subjectEn: string; subjectIt: string; bodyEn: string; bodyIt: string }

const LANGS: { key: EmailLocale; label: string }[] = [
  { key: 'en', label: 'English' },
  { key: 'it', label: 'Italian' },
]

/** Renders the real email template in a sandboxed iframe (no scripts, isolated styles). */
export function IssuePreview({ content, siteUrl, senderAddress }: { content: IssueContent; siteUrl: string; senderAddress: string | null }) {
  const [lang, setLang] = useState<EmailLocale>('en')
  const html = useMemo(
    () =>
      renderIssueEmail({
        locale: lang,
        subject: (lang === 'it' ? content.subjectIt : content.subjectEn) || '(no subject)',
        body: lang === 'it' ? content.bodyIt : content.bodyEn,
        siteUrl,
        unsubscribeUrl: `${siteUrl}${lang === 'it' ? '/it' : ''}/newsletter/unsubscribe`,
        senderAddress,
      }).html,
    [lang, content, siteUrl, senderAddress],
  )
  return (
    <div data-testid="issue-preview">
      <div role="tablist" aria-label="Preview language" className="mb-3 flex gap-2">
        {LANGS.map((l) => (
          <button
            key={l.key}
            type="button"
            role="tab"
            aria-selected={lang === l.key}
            onClick={() => setLang(l.key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${lang === l.key ? 'border-navy bg-navy text-ivory' : 'border-line bg-white text-navy hover:border-navy'}`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <iframe title={`Email preview (${lang === 'it' ? 'Italian' : 'English'})`} sandbox="" srcDoc={html} className="h-[42rem] w-full rounded-md border border-line bg-white" />
      <p className="mt-2 text-xs text-muted">Each subscriber receives the version in their own language. Links in the preview are disabled.</p>
    </div>
  )
}

export function IssueEditor({ issue, siteUrl, senderAddress }: { issue?: IssueContent & { id: string }; siteUrl: string; senderAddress: string | null }) {
  const [content, setContent] = useState<IssueContent>({
    subjectEn: issue?.subjectEn ?? '',
    subjectIt: issue?.subjectIt ?? '',
    bodyEn: issue?.bodyEn ?? '',
    bodyIt: issue?.bodyIt ?? '',
  })
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(saveIssueAction, { ok: false, errors: [] })
  const statusRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (state.ok || state.errors.length) statusRef.current?.focus()
  }, [state])

  const field = (key: keyof IssueContent) => ({
    id: `issue-${key}`,
    name: key,
    value: content[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setContent((c) => ({ ...c, [key]: event.target.value })),
  })

  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <form action={formAction} className="space-y-5" data-testid="issue-form">
        <div ref={statusRef} tabIndex={-1} className="focus:outline-none">
          {state.errors.length > 0 && (
            <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
              {state.errors.join(' ')}
            </p>
          )}
          {state.ok && state.message && (
            <p role="status" className="rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
              {state.message}
            </p>
          )}
        </div>
        {issue && <input type="hidden" name="id" value={issue.id} />}
        <fieldset className="space-y-4 rounded-lg border border-line bg-white p-4">
          <legend className="px-1 text-sm font-semibold">English</legend>
          <div>
            <label htmlFor="issue-subjectEn" className={adminLabel}>
              Subject (English)<span className="ml-1 text-error">*</span>
            </label>
            <input {...field('subjectEn')} required maxLength={150} className={adminInput} />
          </div>
          <div>
            <label htmlFor="issue-bodyEn" className={adminLabel}>
              Text (English)<span className="ml-1 text-error">*</span>
            </label>
            <textarea {...field('bodyEn')} required rows={12} className={`${adminInput} font-mono`} />
          </div>
        </fieldset>
        <fieldset className="space-y-4 rounded-lg border border-line bg-white p-4">
          <legend className="px-1 text-sm font-semibold">Italian</legend>
          <div>
            <label htmlFor="issue-subjectIt" className={adminLabel}>
              Subject (Italian)<span className="ml-1 text-error">*</span>
            </label>
            <input {...field('subjectIt')} required maxLength={150} className={adminInput} />
          </div>
          <div>
            <label htmlFor="issue-bodyIt" className={adminLabel}>
              Text (Italian)<span className="ml-1 text-error">*</span>
            </label>
            <textarea {...field('bodyIt')} required rows={12} className={`${adminInput} font-mono`} />
          </div>
        </fieldset>
        <p className="text-xs leading-relaxed text-muted">
          Formatting: leave a blank line between paragraphs; start a line with “- ” for a bullet; <code>**bold**</code>; links as{' '}
          <code>[label](https://example.org)</code>. HTML is shown as plain text. The footer (why they receive it, one-click unsubscribe, sender details and
          status of the foundation) is added automatically.
        </p>
        <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-md bg-navy px-5 text-sm font-semibold text-ivory hover:bg-navy-soft disabled:opacity-60">
          {pending ? 'Saving…' : issue ? 'Save draft' : 'Create draft'}
        </button>
      </form>
      <IssuePreview content={content} siteUrl={siteUrl} senderAddress={senderAddress} />
    </div>
  )
}
