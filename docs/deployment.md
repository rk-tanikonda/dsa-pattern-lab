# Deployment: Next.js + Go + Supabase

The source is implemented; no hosting account, database project, or executor has been created or deployed. Connect the services below to make accounts, persistence, and execution live.

## 1. Supabase

1. Create or select a Supabase project. Apply `supabase/migrations/001_learning.sql` in its SQL editor or using the Supabase CLI.
2. Copy the project URL and publishable/anon key. The Go service uses the public key plus each user's bearer token; no service-role key is needed.
3. Set Authentication → URL configuration: Site URL to the deployed frontend, and allowed redirects to `https://YOUR_APP/auth/callback` and `https://YOUR_APP/auth/callback?next=/reset-password`. Add equivalent localhost URLs only for development.
4. Enable email/password login and email confirmation. Configure production SMTP and appropriate authentication rate limits before opening public registration.
5. For GitHub login, enable the GitHub provider, create its OAuth application, and use the callback URL shown by Supabase. Supply the provider secret only in Supabase's settings.
6. Verify that both tables have RLS enabled and two different accounts cannot read or write one another's records. Test confirmation and reset links in the same browser that initiated them (the SSR flow uses PKCE).

## 2. Go API

Deploy the root Dockerfile to a container service, or build `go build -o server ./cmd/server`. It has no external Go dependencies and runs as a non-root user in the container.

Required environment: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `PORT` (default `8080`). Add executor settings in step 4. Provide a public HTTPS origin reachable from the Next.js server and a health check at `/healthz`. Browser requests are proxied through Next.js, so browser CORS access to Go is not required.

Use a single instance initially; the built-in quotas are per process. Configure an ingress request limit, then use a shared rate limiter/queue when increasing replicas. Do not log bearer tokens, source code, or note payloads.

## 3. Next.js on Vercel

Import this repository as a Next.js project. The repository root is the frontend root; install with `npm ci`, build with `npm run build`.

Set before building:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GO_API_URL` — the HTTPS Go service origin, without `/v1`

The Go API is deployed separately; this project does not assume that Vercel executes the long-lived Go server. Allow the `/api/lab/run` request at least 45 seconds on the hosting plan. No filesystem writes, local toolchains, local DSA runner, or per-problem branches are required for learners.

## 4. Isolated execution

Use a maintained, dedicated Judge0 CE deployment or a compatible managed provider that supports its batch API. Set `JUDGE0_URL` and optionally `JUDGE0_AUTH_TOKEN` (sent as `X-Auth-Token`) on the Go service. This integration does not assume RapidAPI authentication headers.

Fetch `/languages` from that deployment and set `JUDGE0_GO_ID`, `JUDGE0_PYTHON_ID`, and `JUDGE0_JAVASCRIPT_ID` to its actual IDs. The defaults match common Judge0 CE IDs and must be verified against your executor's versions.

Harden the executor independently: isolate containers from your application and database, disable outbound network access at the infrastructure layer, enforce resource and global queue limits, restrict executor API access to the backend, keep images updated, and configure submission retention. The API passes per-run limits, but cannot validate the remote executor's isolation from application code.

## Release checks

- Signup, confirmation, login, logout, GitHub callback, password reset.
- Save code and a note; reload; verify persistence. Verify with two real accounts that rows are private.
- Run correct, incorrect, compile-error, and nonterminating solutions against the configured executor. Confirm results, deadlines, and saved progress.
- Confirm a failed run does not remove an earlier success, and a storage failure remains visible.
- Verify Light / Dark / System across navigation and refresh on desktop and mobile.
- Run `npm run check`, `go test -race ./...`, and `npm run build` in CI.

Official references: [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side), and [Judge0 CE API](https://ce.judge0.com/).
