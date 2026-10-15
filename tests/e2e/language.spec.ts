import { expect, test } from '@playwright/test'

test('switching language keeps the page and translates content', async ({ page, isMobile }) => {
  await page.goto('/mission')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByTestId('language-switch').filter({ visible: true }).first().click()
  await expect(page).toHaveURL(/\/it\/mission$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'it')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('filantropia paziente')
  await expect(page.getByTestId('status-banner')).toContainText('non ancora costituita')

  if (isMobile) await page.getByRole('button', { name: 'Apri il menu' }).click()
  await page.getByTestId('language-switch').filter({ visible: true }).first().click()
  await expect(page).toHaveURL(/\/mission$/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('language switch preserves project filters', async ({ page, isMobile }) => {
  test.skip(isMobile, 'covered on desktop')
  await page.goto('/projects?pillar=SAILING_FOR_IMPACT')
  await page.getByTestId('language-switch').first().click()
  await expect(page).toHaveURL(/\/it\/projects\?pillar=SAILING_FOR_IMPACT/)
  await expect(page.getByTestId('project-card')).toHaveCount(1)
  await expect(page.getByTestId('project-card')).toContainText('Borse di vela')
})
