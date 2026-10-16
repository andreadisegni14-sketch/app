/**
 * Accounts created only in the throw-away TEST database by global-setup.ts.
 * Override with E2E_ADMIN_PASSWORD / E2E_VIEWER_PASSWORD; never reuse these anywhere else.
 */
export const E2E_ADMIN = {
  email: 'e2e-admin@example.test',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'E2e-admin-only-test-db-2026',
}
export const E2E_VIEWER = {
  email: 'e2e-viewer@example.test',
  password: process.env.E2E_VIEWER_PASSWORD ?? 'E2e-viewer-only-test-db-2026',
}
