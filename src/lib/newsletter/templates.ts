import { createTranslator } from 'next-intl'
import en from '../../../messages/en.json'
import it from '../../../messages/it.json'
import { escapeHtml, renderMarkdownToHtml, renderMarkdownToText } from './markdown'

/**
 * Branded email templates (HTML + plain-text alternative). Pure functions: used by the sender,
 * the admin live preview (in the browser) and tests. No images, tracking pixels or tracked links.
 */

export type EmailLocale = 'en' | 'it'
export type RenderedEmail = { subject: string; html: string; text: string }

export const EMAIL_COLORS = {
  navy: '#102536',
  gold: '#B69B65',
  ivory: '#f7f3eb',
  page: '#ede6d8',
  ink: '#16222d',
  muted: '#55606b',
  line: '#d9cfbd',
} as const

const MESSAGES = { en, it } as const

export function emailLocale(value: string | null | undefined): EmailLocale {
  return value === 'it' ? 'it' : 'en'
}

/** The exact consent sentence shown next to the sign-up checkbox, as plain text, for the consent record. */
export function newsletterConsentText(locale: EmailLocale): string {
  return MESSAGES[locale].forms.newsletter.consent.replace(/<\/?privacy>/g, '')
}

function translator(locale: EmailLocale) {
  return createTranslator({ locale, messages: MESSAGES[locale] })
}

const SANS = 'Arial,Helvetica,sans-serif'
const SERIF = "Georgia,'Times New Roman',serif"

type LayoutInput = {
  locale: EmailLocale
  title: string
  preheader: string
  siteUrl: string
  contentHtml: string
  footerHtml: string
  banner?: string
}

/** Shared table-based layout: inline styles only, max 600px wide, readable 16px text. */
export function renderLayout({ locale, title, preheader, siteUrl, contentHtml, footerHtml, banner }: LayoutInput): string {
  const t = translator(locale)
  const c = EMAIL_COLORS
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${c.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-collapse:collapse;">
${banner ? `<tr><td style="background-color:${c.gold};padding:10px 28px;font-family:${SANS};font-size:14px;line-height:1.4;font-weight:bold;color:${c.navy};">${escapeHtml(banner)}</td></tr>\n` : ''}<tr><td style="background-color:${c.navy};padding:28px 28px 26px 28px;">
<a href="${escapeHtml(siteUrl)}" style="font-family:${SERIF};font-size:24px;line-height:1.25;color:${c.gold};text-decoration:none;">${escapeHtml(t('meta.siteName'))}</a>
</td></tr>
<tr><td style="background-color:${c.ivory};padding:32px 28px 16px 28px;font-family:${SANS};font-size:16px;line-height:1.6;color:${c.ink};">
${contentHtml}
</td></tr>
<tr><td style="background-color:${c.ivory};border-top:1px solid ${c.line};padding:20px 28px 28px 28px;font-family:${SANS};font-size:13px;line-height:1.6;color:${c.muted};">
${footerHtml}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 20px 0;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:normal;color:${EMAIL_COLORS.navy};">${escapeHtml(text)}</h1>`
}

function footerParagraph(html: string): string {
  return `<p style="margin:0 0 10px 0;">${html}</p>`
}

function link(url: string, label: string, color: string = EMAIL_COLORS.navy): string {
  return `<a href="${escapeHtml(url)}" style="color:${color};text-decoration:underline;">${escapeHtml(label)}</a>`
}

export function renderConfirmationEmail(input: { locale: EmailLocale; confirmUrl: string; siteUrl: string }): RenderedEmail {
  const t = translator(input.locale)
  const e = (key: Parameters<typeof t>[0]) => t(key)
  const subject = e('newsletter.email.confirmSubject')
  const c = EMAIL_COLORS
  const contentHtml = [
    heading(e('newsletter.email.confirmTitle')),
    `<p style="margin:0 0 24px 0;">${escapeHtml(e('newsletter.email.confirmBody'))}</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;"><tr><td style="background-color:${c.navy};border-radius:999px;">` +
      `<a href="${escapeHtml(input.confirmUrl)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:16px;font-weight:bold;line-height:1.2;color:${c.ivory};text-decoration:none;border-radius:999px;">${escapeHtml(e('newsletter.email.confirmButton'))}</a>` +
      `</td></tr></table>`,
    `<p style="margin:0 0 6px 0;font-size:14px;color:${c.muted};">${escapeHtml(e('newsletter.email.confirmLinkHelp'))}</p>`,
    `<p style="margin:0 0 20px 0;font-size:14px;word-break:break-all;">${link(input.confirmUrl, input.confirmUrl)}</p>`,
    `<p style="margin:0 0 16px 0;">${escapeHtml(e('newsletter.email.confirmExpiry'))} ${escapeHtml(e('newsletter.email.confirmIgnore'))}</p>`,
  ].join('\n')
  const footerHtml = [footerParagraph(escapeHtml(e('newsletter.email.confirmWhy'))), footerParagraph(escapeHtml(e('footer.about')))].join('\n')
  const html = renderLayout({ locale: input.locale, title: subject, preheader: e('newsletter.email.confirmPreheader'), siteUrl: input.siteUrl, contentHtml, footerHtml })
  const text = [
    e('meta.siteName'),
    '',
    e('newsletter.email.confirmTitle'),
    '',
    e('newsletter.email.confirmBody'),
    '',
    `${e('newsletter.email.confirmButton')}: ${input.confirmUrl}`,
    '',
    `${e('newsletter.email.confirmExpiry')} ${e('newsletter.email.confirmIgnore')}`,
    '',
    '--',
    e('newsletter.email.confirmWhy'),
    e('footer.about'),
  ].join('\n')
  return { subject, html, text }
}

export type IssueEmailInput = {
  locale: EmailLocale
  subject: string
  body: string
  siteUrl: string
  unsubscribeUrl: string
  /** Postal/contact line from NEWSLETTER_SENDER_ADDRESS; a neutral fallback is used when empty. */
  senderAddress?: string | null
  isTest?: boolean
}

export function renderIssueEmail(input: IssueEmailInput): RenderedEmail {
  const t = translator(input.locale)
  const e = (key: Parameters<typeof t>[0]) => t(key)
  const sender = input.senderAddress?.trim() || e('newsletter.email.senderFallback')
  const banner = input.isTest ? e('newsletter.email.testBanner') : undefined
  const subject = `${input.isTest ? '[TEST] ' : ''}${input.subject}`
  const contentHtml = [heading(input.subject), renderMarkdownToHtml(input.body)].join('\n')
  const footerHtml = [
    footerParagraph(escapeHtml(e('newsletter.email.issueWhy'))),
    footerParagraph(`${link(input.unsubscribeUrl, e('newsletter.email.unsubscribe'))} · ${link(input.siteUrl, e('newsletter.email.visitSite'))}`),
    footerParagraph(escapeHtml(sender)),
    footerParagraph(escapeHtml(e('footer.about'))),
  ].join('\n')
  const html = renderLayout({
    locale: input.locale,
    title: subject,
    preheader: renderMarkdownToText(input.body).replace(/\s+/g, ' ').slice(0, 140),
    siteUrl: input.siteUrl,
    contentHtml,
    footerHtml,
    banner,
  })
  const text = [
    ...(banner ? [banner, ''] : []),
    e('meta.siteName'),
    '',
    input.subject,
    '',
    renderMarkdownToText(input.body),
    '',
    '--',
    e('newsletter.email.issueWhy'),
    t('newsletter.email.unsubscribeText', { url: input.unsubscribeUrl }),
    sender,
    e('footer.about'),
  ].join('\n')
  return { subject, html, text }
}
