# Future web product — build later

The current scope is reusable structure and local practice. These are recorded
requirements for a later product phase, not shipped capabilities.

## Experience

- A polished, aesthetically strong interface designed primarily for laptops.
- Select problems from the reusable catalog, edit code in the browser, run tests,
  and inspect clear per-case results. Go is the default language; additional
  languages depend on configured, installed executor toolchains.
- Keep personal learning logs, ideas, attempts, and review history.
- Individual accounts, with each user's data private to that user.
- Drive problem content and language choices from catalog/configuration data;
  drive user state from persisted records. Avoid hard-coded problem arrays or
  sample account data in product components. The local CLI's default Two Sum path
  is a practice convenience, not the future catalog API.

## Planned technology

- Next.js frontend and a Go backend, using suitable open-source libraries.
- Vercel hosting is a desired deployment target. Validate which frontend and API
  components fit that platform when implementation begins; the execution worker's
  isolation and lifecycle requirements may require separate hosting.
- A laptop-focused layout with an explicitly tested minimum viewport. Choose the
  pixel threshold during design, provide a clear small-window fallback, and test
  keyboard navigation and zoom. Do not rely on physical laptop/device detection.

No framework scaffold, database, authentication system, hosted worker, deployment,
or repository visibility change is included in the current baseline.

## Boundaries to preserve

The future Next.js frontend and Go backend can consume versioned problem metadata
and result JSON described in [architecture.md](architecture.md). Preserve stable
problem IDs across file moves. Reimplement or adapt the execution protocol in the
Go service without coupling the frontend to the Python CLI or local absolute paths.

Shared public definitions and starter files belong in the catalog. User-owned
attempts, source code, logs, and ideas belong in private storage with authenticated
ownership checks for every read/write operation; branch names are not access control.
Separate public example cases from private judge tests. Never send private test
inputs, expected outputs, secrets, or another user's data to the browser or leak
them through execution diagnostics. The existing local fixtures are public practice
cases, not a private judge test system.

Public submissions need isolated workers with strict resource, network, filesystem,
process, output, and time limits. Only trusted server configuration may select
compiler commands and toolchain images. The current local runner's custom commands
must not become user-supplied public API fields. Review execution, privacy, content
rights, and licensing before opening the service or repository to the public.
