import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll } from './helpers'

test.describe('event pages', () => {
  test('a published event has its own page with an honest interest form', async ({ page }) => {
    const response = await page.goto('/events/blue-legacy-gala-2027')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Blue Legacy Gala (proposed)')
    await expect(page.getByTestId('event-details')).toContainText('Proposed for summer 2027')
    await expect(page.getByTestId('event-not-a-booking')).toContainText('not a booking or a ticket')
    await expect(page.getByTestId('event-not-a-booking')).toContainText('no payment is taken')
    const form = page.getByTestId('event-interest-form')
    await expect(form).toBeVisible()
    await expect(form.getByLabel(/Number of guests/)).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/events\/blue-legacy-gala-2027$/)
    await expectNoHorizontalScroll(page)
  })

  test('the Italian event page is translated', async ({ page }) => {
    const response = await page.goto('/it/events/blue-legacy-gala-2027')
    expect(response?.status()).toBe(200)
    await expect(page.locator('html')).toHaveAttribute('lang', 'it')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Il Gala Blue Legacy (proposto)')
    await expect(page.getByTestId('event-not-a-booking')).toContainText('non è una prenotazione né un biglietto')
    await expect(page.getByTestId('event-interest-form')).toBeVisible()
    await expectNoHorizontalScroll(page)
  })

  test('unknown events return a 404', async ({ request }) => {
    expect((await request.get('/events/does-not-exist')).status()).toBe(404)
    expect((await request.get('/it/events/does-not-exist')).status()).toBe(404)
  })

  test('event cards link to their event page', async ({ page }) => {
    await page.goto('/sailing')
    await page.getByTestId('event-card').getByRole('link', { name: 'Charity regatta partnership (proposed)' }).click()
    await expect(page).toHaveURL(/\/events\/charity-regatta-partnership$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Charity regatta partnership (proposed)')
  })

  test('the home page teases the next evening event', async ({ page }) => {
    await page.goto('/')
    const teaser = page.getByTestId('next-event')
    await expect(teaser).toContainText('Next event')
    await expect(teaser).toContainText('E2E inauguration evening (proposed)')
    await teaser.getByRole('link', { name: /View the event/ }).click()
    await expect(page).toHaveURL(/\/events\/e2e-inauguration-evening$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E inauguration evening (proposed)')
    await expect(page.getByTestId('event-interest-form').getByLabel(/Number of guests/)).toBeVisible()
  })
})
