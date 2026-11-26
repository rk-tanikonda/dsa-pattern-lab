# Pattern Lab

A hosted DSA learning application: learn patterns, write code in the browser, test it, and keep a private notebook. No per-problem Git branches or local code runner.

## The application

- Public homepage and responsive learning dashboard.
- Light, dark, and system appearance across the site, auth screens, and tool, with a persistent theme switch.
- Comic Sans editor typography. Devices without Comic Sans use a self-hosted, open-source Comic Neue fallback; the proprietary font is not redistributed.
- Twelve curated problems across hashing, two pointers, sliding windows, stacks, binary search, and dynamic programming.
- Search, pattern/difficulty/progress filters, gradual hints, and JSON input/output examples.
- Lazy-loaded CodeMirror editor with Go, Python, and JavaScript starters.
- Email/password, email links, enabled social providers, phone codes, SAML SSO, confirmation, and password recovery via Supabase.
- Account-scoped progress, latest saved code/language, notes, review queue, and Markdown export.
- Go API with verified Supabase identity, user-scoped database requests, request limits, and timeouts.
- Paid-only memberships with Stripe Checkout/Customer Portal, usage dashboards, and database-enforced access.
- Isolated execution through ephemeral Vercel Sandbox microVMs. **The application never executes submitted code itself.**

The public homepage and pricing work without external configuration. The learning workspace requires a permanent account and a verified paid membership. Configure Supabase, Stripe, the Go service, and Vercel Sandbox before accepting paying learners. See the deployment checklist for external setup and release verification.

## Stack and boundaries

Next.js App Router + React + TypeScript, Go standard library HTTP service, Supabase Auth/Postgres, Stripe Billing, and Vercel Sandbox. The public homepage is prerendered; account pages are dynamically rendered and never publicly cached. Fonts are self-hosted, and the editor loads only on problem pages.

See [architecture](docs/architecture.md), [deployment](docs/deployment.md), and [verification](docs/verification.md).

## Development of the application

This starts the web application for development, not a local DSA execution runner.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Next.js reads `.env.local`. Put the public Supabase URL/key and Go API URL there. Run the Go service in a separate terminal with the backend environment values from `.env.example` set in the shell or hosting environment:

```sh
go run ./cmd/server
```

Go does not automatically load dotenv files. Only Supabase's public/publishable key is needed by the Go API: every data request carries the signed-in user's token and obeys row-level security. Never use a service-role key in a public environment variable.

For tests and a production build:

```sh
npm run check
go test -race ./...
npm run build
```

`npm run start` serves the production frontend build. Go 1.22+ and a Node version supported by the installed Next.js release are required; Node 22 LTS or newer is recommended.

## Learning content

`src/content/catalog.json` is the server-only lesson catalog, with descriptions, hints, and unsolved starters. `backend/content/catalog.json` is its embedded copy; a test rejects drift. `backend/content/cases.json` contains the server-selected test fixtures. The API owns evaluation; clients cannot supply expected outputs. These are learning checks, not a proof of optimal complexity or an anti-cheating certificate.

Code is saved explicitly. The latest saved language/code is retained per problem; other language drafts stay in the current editor session. Unsaved edits trigger a warning when leaving by a link or closing/reloading the page. Notes are stored as text and are not interpreted as HTML.

Your original Two Sum reasoning is preserved in [the archived learning journal](docs/archive/two-sum-learning-journal.md). It is historical reference, not part of the public application or a workflow to follow.
