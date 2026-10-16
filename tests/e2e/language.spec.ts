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
  await page.goto('/it/contact')
  await expect(page.getByTestId('contact-form').getByRole('link', { name: 'informativa privacy' })).toHaveAttribute('href', '/it/privacy')
  await page.goto('/it/mission')

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
  await expect(page.getByTestId('project-card')).toContainText('Verso una Regata Blue Legacy')
})

test('language switch works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce' })
  const page = await context.newPage()
  await page.goto('/gala')
  await expect(page.getByTestId('language-switch').first()).toHaveAttribute('href', '/it/gala')
  await context.close()
})

test('sailing page presents the YoungGuns windsurf partnership with its disclosure', async ({ page }) => {
  await page.goto('/it/sailing')
  const section = page.locator('section[aria-labelledby="youngguns"]')
  await expect(page.getByRole('heading', { name: 'Blue Legacy × YoungGuns' })).toBeVisible()
  await expect(section).toContainText('in fase di definizione')
  await expect(section).toContainText('collegata a un fondatore')
  await expect(section.locator('img')).toHaveCount(0)
})

test('home and mission explain that schools are built through partner charities', async ({ page }) => {
  for (const path of ['/it', '/it/mission']) {
    await page.goto(path)
    const section = page.locator('section[aria-labelledby="how-we-build"]')
    await expect(section.getByRole('heading', { level: 2 })).toContainText('Costruiamo scuole')
    await expect(section.getByTestId('how-step')).toHaveCount(4)
    await expect(section).toContainText('Non abbiamo ancora scelto né contattato alcun ente partner')
  }
})
