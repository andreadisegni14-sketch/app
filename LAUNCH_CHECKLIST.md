# Launch checklist

Two separate tracks. **Software readiness does not imply legal or financial readiness** — the site
must keep saying "proposed / not yet incorporated / donations not open" until the second track is
complete and signed off by qualified Italian advisers.

Legend: ✅ done in this repository · ☐ to do by the team · 🔒 blocked on an external party

---

## A. Software readiness

### Built and tested in this repository
- ✅ Bilingual public site (EN default, IT at `/it`), all pages and links tested
- ✅ Contact, partnership, event-interest and support-interest forms: client + server validation,
  consent, honeypot, rate limiting, database persistence, email failure handling
- ✅ Admin with real authentication, roles enforced server-side, lockout, audit log
- ✅ Project CRUD, milestones, updates, media library with safeguarding gate, exports
- ✅ Donations disabled by default; hosted Stripe Checkout, webhook verification, idempotency,
  ledger and reconciliation implemented and tested with mocks and signed test payloads
- ✅ SEO metadata, sitemap, robots, OpenGraph image, security headers, consent-gated analytics
- ✅ Lint, typecheck, unit, integration, build and Playwright smoke tests

### Before the first public deployment
- ☐ Create production PostgreSQL (EU region) with automated backups / point-in-time recovery
- ☐ Import the repository into Vercel and connect a Neon database (README → Production deployment)
- ☐ Set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, redeploy, sign in, then remove the password variable
- ☐ Store credentials in a password manager; enable MFA on Vercel, Neon, GitHub, Stripe and email accounts
- ☐ Custom domain in Vercel, then set `NEXT_PUBLIC_SITE_URL`; optionally set your own `RATE_LIMIT_SALT`
- ☐ Review every DEMO project and event; untick "Demo" only after the team adopts the wording
- ☐ Replace the privacy-notice placeholder for the data controller with the promoters' identity
  and address (lawyer to review)
- ☐ Configure Resend (verified sending domain, SPF/DKIM/DMARC) and `NOTIFICATION_EMAIL`;
  submit a test enquiry and confirm `SENT` in the admin
- ☐ Decide on analytics; if used, set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and verify the consent banner
- ☐ Replace illustrations with licensed photography where desired (credit + licence recorded)
- ☐ Accessibility check with a screen reader (NVDA/VoiceOver) and an external audit if possible
- ☐ Uptime monitoring on `/api/health`; error alerting (e.g. Vercel log drains)
- ☐ Verify `NEXT_PUBLIC_SITE_URL` (canonical URLs, sitemap)

### Before enabling donations (software side)
- ☐ Stripe account **in the foundation's name**, verified, payouts to the foundation's bank account
- ☐ Webhook endpoint created; `STRIPE_WEBHOOK_SECRET` set; events subscribed (see README)
- ☐ Full test-mode run: successful card, declined card, async method (e.g. SEPA), cancellation,
  refund; verify ledger statuses and reconciliation workflow
- ☐ Donation terms page and receipt wording approved (see section B) and published
- ☐ Set `FEATURE_DONATIONS_ENABLED=true` and `DONATIONS_COMPLIANCE_CONFIRMED=true` only after
  section B sign-off; switch to live keys; make one small live donation and refund it

---

## B. Legal and financial readiness

Full detail for advisers: [docs/LEGAL_ADVISER_CHECKLIST.md](docs/LEGAL_ADVISER_CHECKLIST.md).

### Requires legal registration 🔒 (lawyer, notary)
- ☐ Choose legal form (Fondazione ETS vs Associazione ETS vs other) with advisers
- ☐ Draft and adopt statute; deed of incorporation by notary (atto pubblico)
- ☐ Endowment / patrimonio minimo where required; legal personality
- ☐ Codice fiscale (and partita IVA if commercial activities are foreseen)
- ☐ RUNTS registration (if eligible and chosen); until then **no ETS/ONLUS wording**
- ☐ Governance: board appointed, internal regulations, conflict-of-interest policy, minutes book
- ☐ Update all site copy that currently says "not yet incorporated" — only with adviser approval

### Requires banking verification 🔒 (bank, Stripe)
- ☐ Bank account in the foundation's name; dual-signature mandate
- ☐ Stripe onboarding and KYC/KYB completed for the foundation (not an individual)
- ☐ Payout account verified; refund and dispute process agreed

### Requires approvals or partnership agreements 🔒
- ☐ Board approval of the first-year plan and budget (replacing illustrative figures)
- ☐ School: agreement with the school and the public body that owns the building; works permits
- ☐ Sailing: written agreements with clubs incl. safeguarding, insurance, qualifications
- ☐ Regatta: written agreement with the organising club before any public mention by name
- ☐ Sponsors: signed sponsorship agreements before any name or logo appears
- ☐ Gala: venue contract, permits (e.g. SIAE, public entertainment, food & beverage), insurance,
  board approval of ticket pricing — only then consider ticket sales
- ☐ Prospective patrons: written consent before any name appears publicly

### Requires production credentials 🔑
- ☐ Production database (set automatically by Vercel's Neon integration)
- ☐ `RATE_LIMIT_SALT` (optional; derived automatically otherwise)
- ☐ `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL` (optional)
- ☐ `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (only when donations are approved)
- ☐ `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (optional)

### Compliance documents (lawyer / DPO / accountant)
- ☐ Privacy notice and cookie policy finalised (currently drafts marked "pending legal review")
- ☐ Records of processing (Art. 30 GDPR), DPAs with Vercel, database host, Resend, Stripe
- ☐ Child-safeguarding policy adopted **before any activity with minors**
- ☐ Donation acceptance policy; donation terms; tax receipt wording (if and when lawful)
- ☐ Fundraising rules compliance (incl. occasional public fundraising rules where relevant)
- ☐ Accounting system, chart of accounts, annual accounts and reporting obligations
- ☐ Insurance: D&O, general liability, event cover
