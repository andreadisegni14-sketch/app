import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll } from './helpers'

test.describe('mobile layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile only')

  test('menu opens as a modal dialog, closes with Escape and navigates', async ({ page }) => {
    await page.goto('/')
    await expectNoHorizontalScroll(page)
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden()
    await page.getByRole('button', { name: 'Open menu' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()

    await page.getByRole('button', { name: 'Open menu' }).click()
    await dialog.getByRole('link', { name: 'Transparency' }).click()
    await expect(page).toHaveURL(/\/transparency$/)
    await expect(page.getByRole('dialog')).toBeHidden()
    await expectNoHorizontalScroll(page)
  })

  test('forms are usable on small screens', async ({ page }) => {
    await page.goto('/donate')
    await expectNoHorizontalScroll(page)
    await expect(page.getByTestId('support-interest-form')).toBeVisible()
  })
})
