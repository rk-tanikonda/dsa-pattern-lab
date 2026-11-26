# Verification — 26 November 2026

## Paid access and usage

`npm run test:membership` passes nine tests: payment entitlement policy; signed webhook tampering/staleness; unpaid and anonymous denial; expired/delinquent/trial rejection; per-user SQL isolation; persisted minute/day/month run limits; event ordering and resubscription; serialized checkout locks/admin reporting; and bounded page-view analytics.

SQL tests apply all migrations to a fresh, isolated PGlite Postgres instance with simulated Supabase auth roles. They execute the real functions, RLS policies, and triggers. They do not modify the linked Supabase database. Stripe signature tests use the official SDK and generated test signatures; they do not send real payments.

The Go test suite passes with the race detector, including identity verification, paid access on state/catalog routes, ownership filters, validation, retained solved status, quota errors, executor result evaluation, and all catalog fixtures. `go vet ./...` passes.

## Interface checks

Browser QA against an isolated local HTTP fixture verified:

- Signed-out learning requests redirect to login.
- A simulated paid account reaches the dashboard and problem workspace.
- Draft and note save actions complete, and saved notes appear on the dashboard after navigation.
- A simulated unpaid account redirects to Billing & usage with the workspace locked.
- Supported social-provider discovery and email/phone/SSO method controls render.
- Membership pricing, account usage, light/dark appearance, and pricing at a 390px mobile viewport render correctly.
- Low-contrast dashboard-card text and the billing-page heading layout were corrected and rechecked.

`tests/preview.mjs` is a **test-only HTTP fixture**, not a production backend or payment bypass. Its usage totals and future paid date are illustrative. UI checks do not establish real OAuth callbacks, SMS/SSO delivery, Stripe checkout/portal behavior, or real sandbox execution.

## Build and boundaries

The production Next.js build and TypeScript checks pass. Lesson descriptions were checked against the production client chunks and are absent; content is imported server-side and supplied only after membership verification. Git whitespace checks pass.

## Remaining live release work

Configure Stripe prices, keys, webhook, and customer portal; configure desired OAuth providers, production email, phone/SMS and SSO; apply migrations with the coordinated app/API rollout; and supply the Vercel Sandbox snapshot. No live migration, production deployment, real charge, or provider-account configuration was performed in this change. Follow the two-account and end-to-end release checks in [deployment.md](deployment.md) before accepting paying learners.
