import 'dotenv/config'
import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke tests run against the production build (`npm run build` first) using the TEST database.
 * Two servers are started from the same build:
 *  - :3100 with the default, safe configuration (donations disabled)
 *  - :3101 with donations enabled through the MOCK payment provider (no Stripe calls)
 */
const testDb = process.env.TEST_DATABASE_URL ?? ''
const shared = {
  DATABASE_URL: testDb,
  RATE_LIMIT_SALT: 'e2e-salt',
  RESEND_API_KEY: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
}

const DISABLED_URL = 'http://localhost:3100'
const ENABLED_URL = 'http://localhost:3101'

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 30_000,
  use: {
    baseURL: DISABLED_URL,
    // Also exercises the reduced-motion styles (no smooth scrolling or animations).
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'npx next start -p 3100',
      url: `${DISABLED_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: { ...shared, FEATURE_DONATIONS_ENABLED: 'false' },
    },
    {
      command: 'npx next start -p 3101',
      url: `${ENABLED_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...shared,
        FEATURE_DONATIONS_ENABLED: 'true',
        DONATIONS_COMPLIANCE_CONFIRMED: 'true',
        PAYMENTS_MODE: 'mock',
        ALLOW_MOCK_PAYMENTS: 'true',
      },
    },
  ],
})
