import { describe, expect, it } from 'vitest'
import { newsletterConsentText, renderConfirmationEmail, renderIssueEmail } from '@/lib/newsletter/templates'

const base = { siteUrl: 'https://example.org', unsubscribeUrl: 'https://example.org/it/newsletter/unsubscribe?token=abc' }

describe('newsletter email templates', () => {
  it('renders an issue in the subscriber language with the required footer', () => {
    const email = renderIssueEmail({ ...base, locale: 'it', subject: 'Notizie', body: 'Ciao **a tutti**', senderAddress: 'Via Roma 1, Genova' })
    expect(email.subject).toBe('Notizie')
    expect(email.html).toContain('<html lang="it">')
    expect(email.html).toContain('<strong>a tutti</strong>')
    expect(email.html).toContain('href="https://example.org/it/newsletter/unsubscribe?token=abc"')
    expect(email.html).toContain('Via Roma 1, Genova')
    expect(email.html).toMatch(/non è ancora costituita/i)
    expect(email.html).toContain('max-width:600px')
    expect(email.html).toContain('#102536')
    expect(email.html).toContain('#B69B65')
    expect(email.text).toContain('https://example.org/it/newsletter/unsubscribe?token=abc')
    expect(email.text).toContain('Via Roma 1, Genova')
  })

  it('has no tracking pixels, images or scripts and escapes the subject', () => {
    const email = renderIssueEmail({ ...base, locale: 'en', subject: '<img src=x>', body: 'Hi' })
    expect(email.html).not.toMatch(/<img|<script/i)
    expect(email.html).toContain('&lt;img src=x&gt;')
  })

  it('uses a neutral sender line when NEWSLETTER_SENDER_ADDRESS is not set', () => {
    const email = renderIssueEmail({ ...base, locale: 'en', subject: 'News', body: 'Hi', senderAddress: '' })
    expect(email.html).toContain('The Blue Legacy Foundation founding team')
    expect(email.html).toMatch(/not yet incorporated/)
  })

  it('marks test sends', () => {
    const email = renderIssueEmail({ ...base, locale: 'en', subject: 'News', body: 'Hi', isTest: true })
    expect(email.subject).toBe('[TEST] News')
    expect(email.html).toContain('Test send')
  })

  it('renders the confirmation email with the link in HTML and text', () => {
    const url = 'https://example.org/newsletter/confirm?token=t0k3n'
    const email = renderConfirmationEmail({ locale: 'en', confirmUrl: url, siteUrl: 'https://example.org' })
    expect(email.subject).toMatch(/confirm/i)
    expect(email.html).toContain(`href="${url}"`)
    expect(email.text).toContain(url)
    expect(email.text).toMatch(/7 days/)
    expect(renderConfirmationEmail({ locale: 'it', confirmUrl: url, siteUrl: 'https://example.org' }).subject).toMatch(/Conferma/)
  })

  it('stores the consent sentence as plain text in each language', () => {
    expect(newsletterConsentText('en')).toMatch(/^Send me the newsletter .*privacy notice.*unsubscribe at any time\.$/)
    expect(newsletterConsentText('it')).toContain('nell’informativa privacy')
    expect(newsletterConsentText('it')).not.toContain('<')
  })
})
