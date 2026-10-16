import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll, openNavigation, PUBLIC_PATHS } from './helpers'

test.describe('main navigation', () => {
  test('every primary navigation link opens its page', async ({ page, isMobile }) => {
    const targets = [
      ['Mission', '/mission'],
      ['Projects', '/projects'],
      ['Sailing', '/sailing'],
      ['Gala', '/gala'],
      ['Partners', '/partners'],
      ['Transparency', '/transparency'],
      ['Contact', '/contact'],
    ] as const
    for (const [label, path] of targets) {
      await page.goto('/')
      const nav = await openNavigation(page, isMobile)
      await nav.getByRole('link', { name: label, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.getByRole('link', { name: label, exact: true }).first()).toBeAttached()
    }
  })

  test('every public page and footer link responds without errors', async ({ page, request }) => {
    for (const path of PUBLIC_PATHS) {
      for (const prefix of ['', '/it']) {
        const response = await request.get(`${prefix}${path === '/' && prefix ? '' : path}`)
        expect(response.status(), `${prefix}${path}`).toBe(200)
      }
    }
    await page.goto('/')
    const hrefs = await page.locator('footer a[href^="/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(10)
    for (const href of new Set(hrefs)) {
      expect((await request.get(href)).status(), href).toBe(200)
    }
  })

  test('the launch status is always visible and honest', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('status-banner')).toContainText('not yet incorporated')
    await expect(page.getByTestId('launch-status')).toContainText('Not yet incorporated')
    await page.goto('/transparency')
    await expect(page.getByTestId('legal-status')).toContainText('Not registered')
    await expect(page.getByTestId('ledger-totals')).toContainText('€0')
    await expect(page.getByTestId('budget-revenue')).toContainText('€95,000')
  })

  test('projects can be filtered and opened', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByTestId('project-card')).toHaveCount(4)
    await page.getByLabel('Pillar').selectOption('ANNUAL_GALA')
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page).toHaveURL(/pillar=ANNUAL_GALA/)
    await expect(page.getByTestId('project-card')).toHaveCount(1)
    await page.getByTestId('project-card').getByRole('link').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The first Blue Legacy Gala')
    await expect(page.getByText('Demo content').first()).toBeVisible()
    await page.goto('/projects?status=COMPLETED')
    await expect(page.getByText('No projects match these filters.')).toBeVisible()
  })

  test('unknown pages return a 404 with a way home', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { name: 'Off the chart.' })).toBeVisible()
    await page.getByRole('link', { name: 'Back to the homepage' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('SEO files are served', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.status()).toBe(200)
    expect(await sitemap.text()).toContain('/projects/school-renewal-pilot-africa')
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain('Disallow: /admin')
  })

  test('pages do not scroll horizontally', async ({ page }) => {
    for (const path of ['/', '/projects', '/transparency', '/partners']) {
      await page.goto(path)
      await expectNoHorizontalScroll(page)
    }
  })
})
