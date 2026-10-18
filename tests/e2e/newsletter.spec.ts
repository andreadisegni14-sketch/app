import { expect, test } from '@playwright/test'
import { E2E_ADMIN, E2E_UNSUBSCRIBE_TOKENS, E2E_VIEWER } from './credentials'
import { expectNoHorizontalScroll } from './helpers'

test.describe('newsletter (public)', () => {
  test('footer signup on /it shows the neutral “check your inbox” message', async ({ page }, testInfo) => {
    await page.goto('/it')
    const form = page.getByTestId('footer-newsletter-form')
    await form.scrollIntoViewIfNeeded()
    // Consent is required.
    await form.getByLabel('La tua email per la newsletter').fill(`footer-${testInfo.project.name}@example.test`)
    await form.getByRole('button', { name: 'Iscriviti' }).click()
    await expect(form.getByText('Conferma di aver letto l’informativa privacy.').or(form.getByText("Conferma di aver letto l'informativa privacy."))).toBeVisible()
    await form.getByLabel(/Desidero ricevere la newsletter/).check()
    await form.getByRole('button', { name: 'Iscriviti' }).click()
    await expect(page.getByTestId('footer-newsletter-success')).toContainText('controlla la tua casella di posta')
  })

  test('the newsletter page renders in English and Italian', async ({ page }) => {
    await page.goto('/newsletter')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('News from the foundation, a few times a year')
    await expect(page.getByText('About 4–6 emails a year', { exact: false }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Double opt-in' })).toBeVisible()
    await expect(page.getByTestId('newsletter-form').getByRole('link', { name: 'privacy notice' })).toHaveAttribute('href', '/privacy')
    await expectNoHorizontalScroll(page)

    await page.goto('/it/newsletter')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Notizie dalla fondazione, qualche volta l’anno')
    await expect(page.getByTestId('newsletter-form').getByRole('button', { name: 'Iscriviti' })).toBeVisible()
    await expectNoHorizontalScroll(page)
  })

  test('the newsletter page form validates and succeeds', async ({ page }, testInfo) => {
    await page.goto('/newsletter')
    const form = page.getByTestId('newsletter-form')
    await form.getByLabel(/Email address/).fill(`page-${testInfo.project.name}@example.test`)
    await form.getByLabel(/Send me the newsletter/).check()
    await form.getByRole('button', { name: 'Subscribe' }).click()
    await expect(page.getByTestId('form-success')).toContainText('please check your inbox')
  })

  test('an invalid confirmation link explains what to do', async ({ page }) => {
    await page.goto('/newsletter/confirm?token=ThisTokenDoesNotExistAnywhere00000000000000')
    await expect(page.getByTestId('newsletter-confirm')).toHaveAttribute('data-state', 'invalid')
    await expect(page.getByRole('heading', { name: 'This link is not valid' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Subscribe again' })).toHaveAttribute('href', '/newsletter')
  })

  test('unsubscribe page: viewing changes nothing, the button unsubscribes', async ({ page, request }, testInfo) => {
    const token = E2E_UNSUBSCRIBE_TOKENS[testInfo.project.name as keyof typeof E2E_UNSUBSCRIBE_TOKENS]
    const path = testInfo.project.name === 'mobile' ? '/it/newsletter/unsubscribe' : '/newsletter/unsubscribe'
    // A link scanner fetching the page twice does not unsubscribe anyone.
    await request.get(`${path}?token=${token}`)
    await page.goto(`${path}?token=${token}`)
    const panel = page.getByTestId('newsletter-unsubscribe')
    await expect(panel).toHaveAttribute('data-state', 'subscribed')
    await expect(panel).toContainText('e•••@example.test')
    await panel.getByRole('button', { name: /^(Unsubscribe|Disiscriviti)$/ }).click()
    await expect(panel).toHaveAttribute('data-state', 'unsubscribed')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/You have been unsubscribed|Disiscrizione completata/)

    // RFC 8058 one-click endpoint: POST only, idempotent.
    expect((await request.get(`/api/newsletter/unsubscribe?token=${token}`)).status()).toBe(405)
    const oneClick = await request.post(`/api/newsletter/unsubscribe?token=${token}`, { form: { 'List-Unsubscribe': 'One-Click' } })
    expect(oneClick.status()).toBe(200)
    expect((await request.post('/api/newsletter/unsubscribe?token=UnknownTokenUnknownTokenUnknownToken0000000')).status()).toBe(404)
  })
})

test.describe('newsletter (admin)', () => {
  test.skip(({ isMobile }) => isMobile, 'admin is covered on desktop')

  async function login(page: import('@playwright/test').Page, email: string, password: string) {
    await page.goto('/admin/login')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin$/)
  }

  test('admins see subscribers, the email warning, and can draft an issue with a live preview', async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password)
    await page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: 'Newsletter' }).click()
    await expect(page).toHaveURL(/\/admin\/newsletter$/)
    await expect(page.getByTestId('newsletter-counts')).toBeVisible()
    await expect(page.getByTestId('subscribers-table')).toContainText('e2e-subscriber-mobile@example.test')
    await expect(page.getByTestId('email-not-configured')).toBeVisible()
    const csv = await page.request.get('/admin/exports/newsletter-subscribers')
    expect(csv.status()).toBe(200)
    expect(await csv.text()).toContain('consentText')

    await page.getByRole('link', { name: 'Issues' }).click()
    await page.getByRole('link', { name: 'New issue' }).click()
    await page.getByLabel(/Subject \(English\)/).fill('E2E autumn update')
    await page.getByLabel(/Text \(English\)/).fill('Hello **friends**\n\n- First point\n\n<script>alert(1)</script>')
    await page.getByLabel(/Subject \(Italian\)/).fill('Aggiornamento E2E')
    await page.getByLabel(/Text \(Italian\)/).fill('Ciao **amici**')
    const preview = page.frameLocator('[data-testid="issue-preview"] iframe')
    await expect(preview.locator('strong')).toHaveText('friends')
    await expect(preview.locator('body')).toContainText('<script>alert(1)</script>')
    await page.getByRole('tab', { name: 'Italian' }).click()
    await expect(preview.locator('strong')).toHaveText('amici')
    await page.getByRole('button', { name: 'Create draft' }).click()
    await expect(page).toHaveURL(/\/admin\/newsletter\/issues\/[^/?]+\?created=1$/)
    await expect(page.getByText('Draft created.')).toBeVisible()
    // Sending is refused while email is not configured.
    await expect(page.getByTestId('email-not-configured')).toBeVisible()
    await expect(page.getByRole('link', { name: /Send to \d+ confirmed/ })).toHaveCount(0)
  })

  test('viewers see figures with masked addresses and no management tools', async ({ page }) => {
    await login(page, E2E_VIEWER.email, E2E_VIEWER.password)
    await page.goto('/admin/newsletter')
    await expect(page.getByTestId('subscribers-table')).toContainText('e•••@example.test')
    await expect(page.getByTestId('subscribers-table')).not.toContainText('e2e-subscriber-mobile@example.test')
    await expect(page.getByRole('button', { name: 'Erase' })).toHaveCount(0)
    await page.goto('/admin/newsletter/issues/new')
    await expect(page.getByTestId('forbidden')).toBeVisible()
  })
})
