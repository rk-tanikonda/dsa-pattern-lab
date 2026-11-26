# Application architecture

## Request flow

Browser → Next.js App Router → same-origin `/api/lab/*` proxy → Go `/v1/*` → Supabase Postgres / isolated Judge0.

Next.js renders the public homepage statically and server-renders learning pages. Supabase SSR uses cookies, refreshes sessions in `src/proxy.ts`, verifies claims for API requests, and exchanges confirmation/OAuth codes in `/auth/callback`. Auth redirects are limited to the learning dashboard and password reset page.

The Go API re-verifies the bearer identity with Supabase Auth. No request may choose its user ID. All database reads are explicitly owner-filtered and every request forwards the user's token; database row-level security enforces ownership independently. Notes and code have byte limits. Source, tokens, emails, and note contents are not written to application logs.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /healthz` | Liveness and configuration booleans; no credentials |
| `GET /v1/catalog` | Public, cacheable problem catalog |
| `GET /v1/state` | Signed-in user's progress and notes |
| `PUT /v1/progress/:id` | Save code/language, optionally flag for review |
| `PUT /v1/notes/:id` | Save Markdown/plain-text notes |
| `POST /v1/run` | Execute server-owned cases through Judge0 and save results |

API request bodies are capped at 128 KiB, code at 64,000 bytes, and notes at 32,000 bytes. The proxy allowlists paths and verifies the origin of browser mutations. The Go server has read/write/header/idle timeouts and graceful shutdown.

Each run supports only the configured Go/Python/JavaScript language IDs. It submits base64-encoded code and server-selected JSON fixtures to Judge0's batch API, disables network access, sets CPU/memory/wall/output limits, and polls with a bounded deadline. Results are associated by token, not returned order. The Two Sum checker accepts either valid index order; other problems compare parsed JSON values. Failed execution is distinct from wrong answers and from storage failures.

Per-process limits: 120 authenticated API requests and five test runs per user per minute, plus eight concurrent runs. These limits protect one API process, not a cluster. Enforce ingress limits and shared quotas before scaling horizontally. The executor must also enforce its own global queue, sandbox, retention, and resource policies.

## Storage

Two compact tables: `progress` stores the latest draft and learning state per user/problem; `notes` stores one note per user/problem. Both use composite primary keys, ownership policies, length checks, and cascade deletion with the auth user. `record_run` atomically preserves earlier solved status when a later run fails. No code history or raw executor logs are retained in application storage.

Progress is private, self-reported learning data; RLS prevents cross-account access, but users can modify their own records through the public Supabase API. It is not a trusted leaderboard, grade, or certificate.

Theme preference alone is stored in browser localStorage, shared between the marketing site and learning tool. Code and notes are held in editor memory until explicitly saved to the account. Nothing is submitted to the executor before the learner clicks Run tests.

## Rendering and design

Server components for page structure; client boundaries for search, editor, auth, learning state, and theme selection. The theme boot script sets the saved/system appearance before paint. The public theme tokens and semantic surfaces cover marketing, authentication, dashboard, forms, notes, and editor; media preference changes update System mode live. DM Sans and Manrope are bundled locally. Comic Sans uses the installed system font, with a self-hosted Comic Neue fallback.

The editor and language modules are dynamically imported. Reduced-motion preferences are respected. Navigation has a skip link, buttons have accessible names, fields have labels, and errors and save results announce their status. Catalog modules are build-time content; private state is never publicly cached.
