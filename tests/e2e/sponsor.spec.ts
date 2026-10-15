import { expect, test } from '@playwright/test'

test('partnership enquiry is submitted and packages are presented as proposals', async ({ page }) => {
  await page.goto('/partners')
  const packages = page.getByTestId('sponsor-package')
  await expect(packages).toHaveCount(4)
  for (const card of await packages.all()) await expect(card).toContainText('Proposed')
  await expect(page.locator('main img')).toHaveCount(0) // no sponsor logos

  const form = page.getByTestId('sponsor-form')
  await page.getByLabel(/^Organisation/).fill('Example Marine Srl')
  await page.getByLabel(/Your name/).fill('Marco Test')
  await page.getByLabel(/Email address/).fill('marco@example.test')
  await page.getByLabel(/Website/).fill('example.test')
  await page.getByLabel(/Partnership level/).selectOption('IN_KIND')
  await page.getByLabel(/Message/).fill('We could offer safety equipment for the youth programme.')
  await page.getByLabel(/I have read the/).check()
  await form.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByText(/Enter a full web address/)).toBeVisible()

  await page.getByLabel(/Website/).fill('https://example.test')
  await form.getByRole('button', { name: 'Send' }).click()
  await expect(page.getByTestId('form-success')).toContainText('your enquiry has been received')
})

test('gala interest registration does not sell tickets', async ({ page }) => {
  await page.goto('/gala')
  await expect(page.getByTestId('tickets-disabled')).toContainText('Tickets are not on sale')
  await expect(page.getByTestId('gala-gross-net')).toContainText('€15,000')
  await page.getByLabel(/Full name/).fill('Gala Guest')
  await page.getByLabel(/Email address/).fill(`gala-${Date.now()}@example.test`)
  await page.getByLabel(/Number of guests/).fill('2')
  await page.getByLabel(/I have read the/).check()
  await page.getByTestId('event-interest-form').getByRole('button', { name: 'Send' }).click()
  await expect(page.getByTestId('form-success')).toContainText('This is not a booking or a ticket')
})
