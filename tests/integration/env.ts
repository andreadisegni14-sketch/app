/** Integration tests run against a dedicated database — never the development or production one. */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('Set TEST_DATABASE_URL (see .env.example) to run integration tests.')
  if (!/test/i.test(new URL(url).pathname)) {
    throw new Error('Refusing to run: TEST_DATABASE_URL database name must contain "test".')
  }
  return url
}
