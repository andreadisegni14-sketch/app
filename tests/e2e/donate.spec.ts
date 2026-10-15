import { expect, test } from '@playwright/test'
import { ENABLED_URL } from './helpers'

test.describe('donations disabled (default)', () => {
  test('shows the status and a non-financial interest form only', async ({ page }) => {
    await page.goto('/donate')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Donations are not open yet.')
    await expect(page.getByTestId('donations-disabled')).toContainText('We cannot currently offer tax-deductible receipts')
    await expect(page.getByTestId('donation-form')).toHaveCount(0)

    await page.getByLabel(/Full name/).fill('Future Supporter')
    await page.getByLabel(/Email address/).fill('supporter@example.test')
    await page.getByLabel(/How might you like to help/).selectOption('RECURRING')
    await page.getByLabel(/I have read the/).check()
    await page.getByTestId('support-interest-form').getByRole('button', { name: 'Send' }).click()
    await expect(page.getByTestId('form-success')).toContainText('No payment has been taken')
  })
})

test.describe('donations enabled (mock payment provider)', () => {
  test.use({ baseURL: ENABLED_URL })

  test('validates the amount and completes a mock checkout', async ({ page }) => {
    await page.goto('/donate')
    await expect(page.getByTestId('donations-enabled')).toContainText('Test mode: no real payment will be taken.')
    const form = page.getByTestId('donation-form')

    await page.getByLabel(/Amount \(EUR\)/).fill('2')
    await page.getByLabel(/I confirm that I have read the/).check()
    await form.getByRole('button', { name: 'Continue to secure checkout' }).click()
    await expect(page.getByText('The minimum donation is €5.')).toBeVisible()

    await form.getByRole('button', { name: '€50' }).click()
    await expect(page.getByLabel(/Amount \(EUR\)/)).toHaveValue('50')
    await form.getByRole('button', { name: 'Continue to secure checkout' }).click()
    await expect(page).toHaveURL(/\/donate\/success\?session_id=mock_cs_/)
    await expect(page.getByTestId('donation-success')).toContainText('waiting for confirmation')
    await expect(page.getByTestId('donation-success')).toContainText('No money was taken')
    await expect(page.getByTestId('donation-success')).toContainText('not a tax receipt')
  })

  test('cancel page offers a way back', async ({ page }) => {
    await page.goto('/donate/cancel')
    await expect(page.getByTestId('donation-cancel')).toContainText('No payment was taken')
    await page.getByRole('link', { name: 'Return to the donation page' }).click()
    await expect(page).toHaveURL(/\/donate$/)
  })
})
