# Reusable catalog and execution boundary

The lab is local-first today. These interfaces let a future website reuse problem
content and results without making the terminal UI part of the execution engine.

## Current pieces

- `problems/**/problem.json`: versioned metadata with stable problem ID, title,
  difficulty, category, tags, default language, starter paths, description and cases.
  File references are relative to the manifest directory.
- `PROBLEM.md`: standalone problem statement suitable for a future problem picker.
- `cases.json`: shared input data and checker choice, independent of language.
- `README.md` inside a problem: preserved personal reasoning and learning journal;
  separate from the reusable statement. A public UI should render `PROBLEM.md`.
- `tools/languages.json`: local compile/run command presets, independent of problems.
- `tools/catalog.py`: validates manifest references and cases and exports a JSON catalog.
- `tools/lab_runner.py`: local execution engine returning structured results.
- `tools/run.py`: command-line parsing and human-readable or JSON presentation.

No web framework, hosted executor, account system, or deployment is included yet.

## Machine interfaces

```sh
python3 tools/catalog.py
python3 tools/run.py --json
python3 tools/run.py --check-build --json
```

`run_solution(...)` can also be imported from `tools.lab_runner`. It accepts source,
fixture and registry paths plus optional compile/run argument arrays, and returns
a dictionary without printing. `--json` emits that dictionary as one JSON document.

Result schema version 1 contains:

| Field | Meaning |
|---|---|
| `schema_version` | Contract version, currently `1` |
| `source` | Absolute local source path; not intended as a public API identifier |
| `status` | `passed`, `failed`, `setup_ok`, or `setup_error` |
| `exit_code` | `0` success, `1` exercise/runtime failure, `2` setup failure |
| `passed`, `total` | Passed cases and available cases |
| `cases` | Executed cases; empty for setup-only runs |
| `error` | Setup error text or `null` |
| `build` | Build status (`not_required`, `passed`, `failed`, `timeout`) and captured output |

Each case contains `name`, `status`, `message`, `stdout`, `stderr`, and `returncode`.
Case statuses are `passed`, `wrong_answer`, `runtime_error`, and `timeout`.
Malformed CLI arguments use normal argparse errors; the JSON report contract begins
after valid CLI argument parsing. A setup-only success does not mean cases passed.

## Catalog changes versus practice branches

Reusable problem definitions, unsolved starter files, cases, and infrastructure
belong on `main`. Add a new problem's metadata/statement/cases/starters there through
a normal reviewed commit or infrastructure branch, then create
`codex/<number>-<slug>` from that updated baseline for personal practice.

Implementations and personal exercise notes stay on the problem branch by default.
Do not merge a completed solution over the public unsolved starter on `main`.
When practice reveals a useful shared fix, selectively apply the fixture, statement,
or infrastructure change to `main` and keep the answer on its exercise branch.
The current learning journal is preserved for continuity; review personal notes and
content rights before making the repository public. Select an open-source license
as a separate deliberate decision. No visibility or licensing change is made here.

## Future public execution service

The local runner executes code and custom commands with the current user's access.
Its temporary build folder and process timeout are conveniences, not an isolation
boundary. Do not expose `run_solution`, filesystem paths, `--run`, `--compile`, or
registry overrides directly to public HTTP requests.

A future UI can load the catalog and submit a problem ID, allowlisted language ID,
and source text to a separate job service. That service must validate input, select
server-owned compiler commands, and execute each job in a disposable isolated worker
with no host credentials or workspace access. Constrain network, filesystem access,
CPU, memory, process count, execution duration, and output volume; terminate the
whole job process tree and clean up after every job. Use maintained toolchain images,
queue/concurrency limits, and rate limits before accepting public submissions.

Reuse fixture/checker semantics and the result shape across that boundary, with
public-safe IDs and sanitized diagnostics. Do not reuse unrestricted local execution
as the hosting boundary. The current local runner does not enforce these public
service controls and must remain a trusted local development tool.
