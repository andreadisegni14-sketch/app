import { expect, test, type Page } from '@playwright/test'
import { E2E_ADMIN, E2E_VIEWER } from './credentials'

async function login(page: Page, email: string, password: string, expectSuccess = true) {
  await page.goto('/admin/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  if (expectSuccess) await expect(page).toHaveURL(/\/admin$/)
}

test.describe('admin access control', () => {
  test.skip(({ isMobile }) => isMobile, 'admin is covered on desktop')

  test('anonymous visitors are sent to the login page and cannot export', async ({ page, request }) => {
    for (const path of ['/admin', '/admin/inquiries', '/admin/users']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/admin\/login$/)
    }
    const response = await request.get('/admin/exports/contact-inquiries', { maxRedirects: 0 })
    expect([302, 307, 401]).toContain(response.status())
    const media = await request.get('/api/media/clxxxxxxxxxxxxxxxxxxxxxxx')
    expect(media.status()).toBe(404)
  })

  test('wrong credentials are rejected', async ({ page }) => {
    await login(page, E2E_ADMIN.email, 'definitely-not-the-password1', false)
    await expect(page.getByTestId('login-form').getByRole('alert')).toContainText('Incorrect email address or password.')
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test('viewers see the dashboard but no personal data or admin tools', async ({ page }) => {
    await login(page, E2E_VIEWER.email, E2E_VIEWER.password)
    await expect(page.getByTestId('admin-user')).toHaveText('E2E Viewer')
    await expect(page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: 'Enquiries' })).toHaveCount(0)
    for (const path of ['/admin/inquiries', '/admin/users', '/admin/exports', '/admin/donations']) {
      await page.goto(path)
      await expect(page.getByTestId('forbidden')).toBeVisible()
    }
    const exportResponse = await page.request.get('/admin/exports/contact-inquiries')
    expect(exportResponse.status()).toBe(403)
    await page.goto('/admin/projects')
    await expect(page.getByTestId('projects-table')).toBeVisible()
    await expect(page.getByRole('link', { name: 'New project' })).toHaveCount(0)
  })

  test('admins see enquiries even when email failed, and can export', async ({ page }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password)
    await expect(page).toHaveURL(/\/admin$/)
    await page.getByRole('navigation', { name: 'Administration' }).getByRole('link', { name: 'Enquiries' }).click()
    const table = page.getByTestId('inquiries-table')
    await expect(table).toContainText('Seeded Enquirer')
    await expect(table).toContainText('FAILED')
    await table.getByRole('link', { name: 'Seeded Enquirer' }).click()
    await expect(page.getByText('HTTP 503: simulated outage')).toBeVisible()
    await page.getByLabel('Status').selectOption('RESOLVED')
    await page.getByRole('button', { name: 'Update' }).click()
    await expect(page.getByText('Enquiry updated.')).toBeVisible()

    const csv = await page.request.get('/admin/exports/contact-inquiries')
    expect(csv.status()).toBe(200)
    expect(csv.headers()['content-type']).toContain('text/csv')
    expect(await csv.text()).toContain('seeded@example.test')

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test('admins can create a draft project that stays off the public site', async ({ page, request }) => {
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password)
    await page.goto('/admin/projects/new')
    const fields: Record<string, string> = {
      slug: 'e2e-draft-project', titleEn: 'E2E draft', titleIt: 'Bozza E2E', summaryEn: 'Summary', summaryIt: 'Sintesi',
      descriptionEn: 'Description', descriptionIt: 'Descrizione', locationEn: 'TBC', locationIt: 'Da definire',
      budgetLines: 'Works | Lavori | 1000',
    }
    const form = page.getByTestId('project-form')
    for (const [name, value] of Object.entries(fields)) await form.locator(`[name="${name}"]`).fill(value)
    await expect(form.getByLabel(/Published on the public site/)).not.toBeChecked()
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page.getByText('Project created.')).toBeVisible()
    expect((await request.get('/projects/e2e-draft-project')).status()).toBe(404)
  })
})
