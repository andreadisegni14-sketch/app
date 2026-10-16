import { expect, type Page } from '@playwright/test'

export const ENABLED_URL = 'http://localhost:3101'

export const PUBLIC_PATHS = [
  '/',
  '/mission',
  '/projects',
  '/projects/school-renewal-pilot-africa',
  '/sailing',
  '/gala',
  '/partners',
  '/donate',
  '/transparency',
  '/contact',
  '/privacy',
  '/cookies',
  '/terms',
  '/accessibility',
] as const

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

export async function openNavigation(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: /open menu|apri il menu/i }).click()
    return page.getByRole('dialog')
  }
  return page.getByRole('navigation', { name: /^(main|principale)$/i })
}
