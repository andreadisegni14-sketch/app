# The Blue Legacy Foundation — website & operations platform

Bilingual (English default, Italian at `/it`) website and administration platform for **The Blue
Legacy Foundation**, a *proposed* Italian philanthropic initiative to renovate and equip existing
schools in Africa (starting with countries such as Morocco and Kenya) and to support their students,
funded by a community of sailors and supporters through charity regattas and a small annual gala —
with the long-term ambition of a regatta carrying the foundation's name.

> **Status: the foundation is NOT yet incorporated.** The site says so on every page. It does not
> claim ETS/ONLUS status, tax deductibility, registration, beneficiaries, sponsors or partnerships.
> Donations are disabled by default and can only be enabled through explicit, documented
> confirmations (see [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)). Nothing here is legal advice.

## Contents

- [What is included](#what-is-included)
- [Technology](#technology)
- [Local setup](#local-setup)
- [Database: migrations and seed](#database-migrations-and-seed)
- [Creating admin users](#creating-admin-users)
- [Tests](#tests)
- [Feature flags](#feature-flags)
- [Donations and Stripe](#donations-and-stripe)
- [Production deployment (Vercel)](#production-deployment-vercel)
- [Project structure](#project-structure)
- [Security and privacy notes](#security-and-privacy-notes)
- Related documents: [OPERATIONS.md](OPERATIONS.md) · [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) ·
  [docs/LEGAL_ADVISER_CHECKLIST.md](docs/LEGAL_ADVISER_CHECKLIST.md)

## What is included

**Public site (EN/IT):** home, mission, projects (filterable index + detail pages with status,
location, goals, budgets, milestones, updates, documentary evidence and beneficiary-privacy
statement), sailing, gala, partners (sponsorship prospectus presented as proposals), support/donate,
transparency (legal status, actual vs pledged vs spent, illustrative budget), contact, privacy,
cookies, terms and accessibility.

**Forms:** contact, partnership enquiry, event interest (gala/regatta) and "register interest in
supporting us". All validate in the browser and again on the server (shared Zod schemas), require
consent, use a honeypot, are rate-limited per hashed client IP, are stored in PostgreSQL first and
then (optionally) notify staff by email, recording the delivery outcome on each record.

**Admin (`/admin`):** database-backed sessions, bcrypt passwords, account lockout, login rate
limiting, three roles (ADMIN / EDITOR / VIEWER) enforced on the server for every page, action and
route. Project CRUD with milestones and updates, enquiries dashboard (with email status), events,
media library (content-sniffed uploads, safeguarding gate for images of minors), beneficiary
due-diligence register, donation ledger with reconciliation, CSV exports, users, audit log and
settings.

**Payments (off by default):** hosted Stripe Checkout, server-side validation, idempotency keys,
signature-verified and idempotent webhooks, success/cancel pages, durable ledger with currency and
reconciliation status. No card data is ever handled. No tax receipts are issued.

## Technology

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions), React 19, TypeScript 5.9 strict |
| Styling | Tailwind CSS 4, self-hosted Fraunces + Inter (no runtime font requests) |
| i18n | next-intl 4 (`/` English, `/it` Italian) |
| Data | PostgreSQL 16 + Prisma 7 (`@prisma/adapter-pg`) |
| Validation | Zod 4 |
| Email | Resend HTTP API (optional) |
| Payments | Stripe Checkout (optional, disabled by default) |
| Tests | Vitest 5 (unit + integration), Playwright 1.56 (smoke) |
| Hosting | Vercel |

Versions are pinned exactly in `package.json`. Node.js **22.12+** is required.

## Local setup

Prerequisites: Node.js 22.12+, npm 10+, PostgreSQL 14+ (16 recommended).

```bash
# 1. Install dependencies (also generates the Prisma client)
npm install

# 2. Create two databases (development and test). Example with a local Postgres superuser:
createuser --createdb blf --pwprompt
createdb -O blf blue_legacy
createdb -O blf blue_legacy_test

# 3. Configure environment variables
cp .env.example .env
#    then edit DATABASE_URL, TEST_DATABASE_URL and RATE_LIMIT_SALT

# 4. Apply migrations and seed DEMO content
npm run db:deploy
npm run db:seed

# 5. Create your first administrator (prompts for a password)
npm run admin:create -- --email you@example.org --name "Your Name"

# 6. Start the development server
npm run dev
# → http://localhost:3000 (English), http://localhost:3000/it (Italian), http://localhost:3000/admin
```

## Database: migrations and seed

| Command | What it does |
|---|---|
| `npm run db:migrate` | Development only: create a new migration after editing `prisma/schema.prisma` and apply it |
| `npm run db:deploy` | Apply pending migrations (safe for production; never drops data) |
| `npm run db:seed` | Idempotent seed: roles; DEMO projects/events and launch-status note created once per database (never overwrites edits) |
| `npm run db:generate` | Regenerate the Prisma client (runs automatically on `npm install`) |

Migrations live in `prisma/migrations/` and are committed. Prisma CLI configuration is in
`prisma.config.ts` (it uses `DIRECT_URL` when set, else `DATABASE_URL`).

**Seed content is clearly labelled.** Every seeded project and event has `isDemo = true` and shows
a "Demo content" badge publicly. They describe the *proposed* first-year pilot. No beneficiaries,
donations, enquiries or users are seeded (a user is created only if `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` are provided). When the founding team has reviewed the wording, untick
"Demo" for each record in the admin.

The demo wording lives in `prisma/demo-content.ts`. After changing it, existing databases are
updated with `npx tsx scripts/demo-content-sql.ts`, which prints the SQL statements (UPDATE/INSERT
only, and only for rows still flagged as demo) to run against the database.

## Creating admin users

```bash
npm run admin:create -- --email someone@example.org --name "Name" --role EDITOR
# or non-interactively:
ADMIN_PASSWORD='a-long-password-with-1-number' npm run admin:create -- --email someone@example.org
```

Running it again for an existing email resets that user's password and unlocks the account.
Further users can be created in **Admin → Users**. Roles:

- **ADMIN** – everything, including personal-data exports, donations, users and settings
- **EDITOR** – projects, events, media, beneficiaries and enquiry handling
- **VIEWER** – read-only programme content and aggregate figures; no personal data

## Tests

```bash
npm run lint             # ESLint (Next.js core-web-vitals + TypeScript rules)
npm run typecheck        # tsc --noEmit (strict)
npm run test:unit        # validation, finance, CSV, permissions, flags, content checks
npm run test:integration # inquiries, auth/sessions, donations & Stripe webhooks (needs TEST_DATABASE_URL)
npm run build            # production build
npm run test:e2e         # Playwright smoke tests against the build (needs TEST_DATABASE_URL)
npm run test:e2e:full    # build + Playwright
```

- Integration and end-to-end tests **empty and re-seed** `TEST_DATABASE_URL`; the tooling refuses
  to run unless the database name contains `test`.
- Playwright starts two production servers from the same build: `:3100` with default (safe)
  settings and `:3101` with donations enabled via the **mock** payment provider, so donation
  flows are tested without contacting Stripe. Stripe itself is mocked in integration tests, and
  webhooks are tested with genuinely signed payloads (`stripe.webhooks.generateTestHeaderString`).
- The e2e suite creates two throw-away accounts in the test database only
  (`tests/e2e/credentials.ts`; override with `E2E_ADMIN_PASSWORD` / `E2E_VIEWER_PASSWORD`).
- If Playwright cannot find a browser, run `npx playwright install chromium`, or point
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE` at an existing Chromium binary.
- CI: `.github/workflows/ci.yml` runs all of the above against a PostgreSQL service container.

## Feature flags

All flags are environment variables and default to the safe state. See `.env.example` for the full
list with explanations.

| Flag | Default | Effect |
|---|---|---|
| `FEATURE_DONATIONS_ENABLED` | `false` | First of three conditions to show the donation form |
| `DONATIONS_COMPLIANCE_CONFIRMED` | `false` | Operator confirmation that legal, banking and payment-provider prerequisites are met |
| `PAYMENTS_MODE` | `stripe` | `mock` only for tests/demos (also needs `ALLOW_MOCK_PAYMENTS=true`; refused in production) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL` | empty | Staff email notifications |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | empty | Enables the consent banner and consent-gated analytics |

Gala ticket sales are intentionally **not implemented**: the gala page offers interest registration
only. Sales should be added only after incorporation, approval, permits and insurance.

## Donations and Stripe

1. Complete the legal, banking and approval items in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).
2. In Stripe (account in the foundation's name, fully verified), create a webhook endpoint
   `https://YOUR_DOMAIN/api/stripe/webhook` subscribed to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
   `checkout.session.expired` and `charge.refunded`.
3. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FEATURE_DONATIONS_ENABLED=true` and
   `DONATIONS_COMPLIANCE_CONFIRMED=true`. Test end-to-end with **test-mode keys** first:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
4. Donation status changes **only** through verified webhooks; the success page is informational.
   Reconcile each donation against payouts in **Admin → Donations** (see OPERATIONS.md).
5. Update the privacy notice, terms and donation wording with your advisers before going live.
   The transparency ledger counts only live-mode donations and non-demo projects.

## Production deployment (Vercel)

Deployment is automated: once the project is connected, **every push to `main` deploys itself**.
Each deploy runs `vercel-build`, which applies database migrations, adds the starting DEMO content
once (never overwriting admin edits), creates the first admin if requested, and builds the site.

**One-time setup (about 10 minutes, no settings to type except the admin login):**

1. Merge this work into `main` on GitHub.
2. Sign in at [vercel.com](https://vercel.com) with GitHub → **Add New… → Project** → import
   `andreadisegni14-sketch/app` → **Deploy** (framework is detected automatically). The first deploy
   fails because no database is connected yet; that is expected.
3. In the Vercel project: **Storage → Create Database → Neon (Postgres)** → choose an EU region →
   connect it to the project. Vercel injects the connection variables automatically.
4. **Settings → Environment Variables** → add `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`
   (at least 12 characters, letters and a number) for the Production environment.
5. **Deployments → ⋯ → Redeploy.** When it finishes, open the site and sign in at `/admin`.
   You can then delete `SEED_ADMIN_PASSWORD` from Vercel; the account stays.

What configures itself:

| Setting | Automatic value |
|---|---|
| Database connection | `DATABASE_URL` / `DATABASE_URL_UNPOOLED` injected by the Neon integration (`POSTGRES_*` names also work) |
| Site address (canonical links, sitemap, emails) | the Vercel production domain, until you set `NEXT_PUBLIC_SITE_URL` (do this when you add your own domain) |
| Rate-limit secret | derived from the database credentials, until you set `RATE_LIMIT_SALT` |
| Migrations, demo content, first admin | run on every deploy by `vercel-build`; all are idempotent |

Optional later: email notifications (`RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL`),
analytics (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`), your own domain (Vercel → Settings → Domains), and —
only after the legal checklist — Stripe donations. See `.env.example`.

After deploying, check `https://YOUR_DOMAIN/api/health`, `/sitemap.xml` and `/robots.txt`.

**Alternative: Render.** `render.yaml` describes the service, and `npm run render-build` does the
same preparation as on Vercel. Provide `DATABASE_URL` (e.g. from Neon) plus `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`; the site address comes from Render's `RENDER_EXTERNAL_URL` automatically.

Self-hosting elsewhere works too: `npm ci && npm run build && npm run db:deploy && npm run db:seed && npm start`
(set `PRODUCTION_DEPLOYMENT=true`).

## Project structure

```
messages/                 English and Italian content (identical key structure, tested)
prisma/                   schema, migrations, seed
scripts/create-admin.ts   CLI to create/reset admin users
src/app/[locale]/         public pages (EN at /, IT at /it)
src/app/admin/            admin area: actions.ts (server actions), (dashboard)/ pages, login, exports
src/app/api/              Stripe webhook, media delivery, health check
src/components/           art (original SVG seascapes), layout, forms, site, ui, admin
src/i18n/                 next-intl routing and request config
src/lib/                  env & flags, finance, validation, auth, CSV
src/lib/server/           inquiries, donations, rate limiting, email, audit, exports (server-only)
src/proxy.ts              locale routing + optimistic admin redirect (Next 16 "proxy")
tests/unit|integration|e2e
legacy/                   an unrelated earlier Streamlit prototype, preserved untouched
```

## Security and privacy notes

- **Authorisation is enforced on the server** (`requireUser(permission)`) in every admin page,
  server action and export route; the proxy check is only an optimisation.
- Sessions: random 256-bit tokens, only their SHA-256 hash is stored; `HttpOnly`, `SameSite=Lax`,
  `Secure` in production; 12-hour lifetime; revoked on deactivation and password reset.
- Passwords: bcrypt (cost 12), minimum 12 characters; accounts lock for 15 minutes after 5 failures;
  login is rate-limited per IP and per account; timing is equalised for unknown accounts.
- Rate limits use a keyed hash of the IP (`RATE_LIMIT_SALT`); raw IPs are never stored.
- Uploaded files are type-checked by their content, capped at 4 MB, private by default, and images
  marked as depicting minors cannot be made public without confirmed guardian consent.
- CSV exports neutralise spreadsheet formulas and are audit-logged.
- Security headers: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer and permissions
  policies; admin responses are `no-store` and `noindex`.
- Only technical cookies are used unless analytics is configured *and* the visitor consents.
- Illustrations are original SVG artwork. To add photography, upload licensed images in
  **Admin → Media** with credit and licence, then set them as project covers.

## Known limitations

- The admin UI is in English only (the public site is fully bilingual).
- Media is stored in PostgreSQL (fine for a small library); move to object storage if it grows.
- Static content pages are rendered on demand rather than prerendered.
- `npm audit` reports advisories in development-only tooling (`prisma` CLI's optional MySQL driver
  and `eslint-config-next`'s glob dependency); they are not part of the runtime bundle.
