# Verification record

## Build and backend checks

Passed on this checkout:

- `npm run build`: production compilation, TypeScript validation, and static page generation.
- `npm run typecheck`: strict TypeScript check.
- `go test -race ./...`: backend tests with race detection.
- `go vet ./...`.
- `git diff --check`.

The Go tests cover missing configuration, authenticated identity verification, rejection before storage access, forwarding of user-scoped tokens, explicit owner filters, malformed/oversized draft and note bodies, preserved solved status, missing problem IDs, Two Sum index-order and bounds checking, JSON result types, sandbox resource parameters, shuffled executor batch results, storage-failure warnings, executor failures, run quotas, and public/backend catalog consistency.

Supabase and Judge0 behavior in these tests is provided by local HTTP test doubles. No real credentials were present; these checks do not establish live authentication, actual database RLS, actual SQL trigger behavior, real execution isolation, or deployment readiness.

## Browser checks

Observed in the local browser:

- Public homepage and learning dashboard render.
- Light and dark themes render on the homepage and editor.
- Theme selection carries from the homepage into the learning workspace.
- The Light/Dark/System options are available, with the current selection indicated.
- Comic Sans renders in the editor, including syntax highlighting.
- Search combined with the hashing filter returns only Two Sum for `two`.
- Selecting Python changes the starter and filename.
- Anonymous test execution shows a sign-in requirement without simulating a result.
- Note reflection prompts populate the note editor.
- Desktop workspace styling inspected at 1440 × 1000; ordinary preview inspected around 850 px wide.

The original native unsaved-work confirmation caused the preview browser to become unresponsive. It was replaced with an accessible in-app HTML dialog for navigation and code reset. The replacement compiles, but its final browser interaction test could not be completed after the preview browser stalled. Final narrow-mobile interaction checks, System mode changes triggered by the OS, and cross-tab theme synchronization remain unverified.

## Live release requirements

Apply the Supabase migration, configure email and GitHub authentication, deploy the Go API, and connect a sandboxed Judge0 service. Follow the real-account, two-user isolation, persistence, and execution checks in [deployment](deployment.md) before inviting users.

The UI is implemented and locally buildable; live signup, cloud storage, remote execution, and public hosting have not been activated or verified.
