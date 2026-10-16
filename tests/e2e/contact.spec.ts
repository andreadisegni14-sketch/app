import { expect, test } from '@playwright/test'

test.describe('contact form', () => {
  test('shows validation errors, then succeeds', async ({ page }) => {
    await page.goto('/contact')
    const form = page.getByTestId('contact-form')
    // The consent sentence must link to the privacy notice.
    await expect(form.getByRole('link', { name: 'privacy notice' })).toHaveAttribute('href', '/privacy')
    await form.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByTestId('form-status')).toContainText('Please correct the highlighted fields.')
    await expect(page.getByLabel(/Full name/)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByText('Please confirm you have read the privacy notice.')).toBeVisible()
    await expect(page.getByLabel(/Full name/)).toBeFocused()

    await page.getByLabel(/Full name/).fill('Playwright Visitor')
    await page.getByLabel(/Email address/).fill('not-an-email')
    await page.getByLabel(/Topic/).selectOption('PRESS')
    await page.getByLabel(/Message/).fill('Hello from the smoke tests.')
    await page.getByLabel(/I have read the/).check()
    await form.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()

    await page.getByLabel(/Email address/).fill('visitor@example.test')
    await form.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByTestId('form-success')).toContainText('your message has been received')
  })

  test('validates on the server when JavaScript is unavailable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/contact')
    await page.getByLabel(/Full name/).fill('No JS')
    await page.getByLabel(/Email address/).fill('nojs@example')
    await page.getByLabel(/Topic/).selectOption('GENERAL')
    await page.getByLabel(/Message/).fill('short')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByTestId('form-status')).toContainText('Please correct the highlighted fields.')
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    await expect(page.getByText('This is too short.')).toBeVisible()
    await context.close()
  })
})
