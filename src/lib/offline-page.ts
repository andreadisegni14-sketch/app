/**
 * Paths that keep working while SITE_OFFLINE is on: people must always be able to confirm or,
 * above all, leave the newsletter. Matched exactly (no prefixes), in both languages.
 */
export const OFFLINE_EXEMPT_PATHS: ReadonlySet<string> = new Set([
  '/newsletter/confirm',
  '/newsletter/unsubscribe',
  '/en/newsletter/confirm',
  '/en/newsletter/unsubscribe',
  '/it/newsletter/confirm',
  '/it/newsletter/unsubscribe',
  '/api/newsletter/unsubscribe',
])

export function isOfflineExempt(pathname: string): boolean {
  return OFFLINE_EXEMPT_PATHS.has(pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname)
}

/** Self-contained holding page served by the proxy while SITE_OFFLINE is on. */
export const OFFLINE_PAGE = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>The Blue Legacy Foundation</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1f3a; color: #f7f3ea;
    font-family: Georgia, 'Times New Roman', serif; text-align: center; padding: 24px; box-sizing: border-box; }
  main { max-width: 34rem; }
  h1 { font-weight: 400; font-size: clamp(2rem, 6vw, 3rem); margin: 0 0 1rem; }
  p { font-family: system-ui, sans-serif; line-height: 1.6; color: rgba(247, 243, 234, 0.8); margin: 0.5rem 0; }
  hr { border: 0; border-top: 1px solid #c9a24a; width: 4rem; margin: 2rem auto; }
</style>
</head>
<body>
<main>
  <h1>The Blue Legacy Foundation</h1>
  <p>Il sito è in preparazione. Torneremo presto.</p>
  <hr>
  <p lang="en">Our website is being prepared. We will be back soon.</p>
</main>
</body>
</html>`
