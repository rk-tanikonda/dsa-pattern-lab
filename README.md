# DSA Pattern Lab

Go is the default teaching language. Write a solution in any language that can
read stdin and write stdout, then run it against the same cases. The runner uses
Python 3's standard library; install your chosen language's toolchain separately.

## Start Two Sum

Read the [problem and learning journal](problems/arrays-hashing/001-two-sum/README.md).
Edit the unsolved `solution.go`, then run one command from the repository root:

```sh
python3 tools/run.py
```

Choose another file by passing its path. An unsolved C starter is included:

```sh
python3 tools/run.py problems/arrays-hashing/001-two-sum/c/solution.c
```

Both starters deliberately fail all seven cases until you implement the function.
The runner compiles once in a temporary directory and runs each case in a fresh
process. It accepts either index order and rejects reused or out-of-range indices.
Exit codes: `0` all pass, `1` answer/runtime failure, `2` setup/build failure.
Go needs Go 1.22+; C needs `cc` with C11 support. No npm project is needed.

## Create a file in another language

For example, create `problems/arrays-hashing/001-two-sum/solution.py` and run:

```sh
python3 tools/run.py problems/arrays-hashing/001-two-sum/solution.py
```

Every solution is a standalone program with this whitespace-separated contract:

```text
stdin:
3 6
3 2 4

stdout:
1 2
```

The first two integers are `n target`, followed by `n` array elements. Output
exactly two zero-based integer indices. Send debugging messages to stderr.
The Go/C starters already contain this input/output plumbing. Other languages
must implement it too; an arbitrary function-only file is not an executable program.

[Language configuration](tools/languages.json) maps file extensions to commands:

| Extensions | Toolchain commands |
|---|---|
| `.go`, `.c`, `.cpp` | `go`, `cc`, `c++` |
| `.py`, `.js`, `.ts` | `python3`, `node`, standalone `tsx` |
| `.java`, `.rs`, `.swift` | `javac` + `java`, `rustc`, `swiftc` |
| `.kt` | `kotlinc` + `java` |
| `.rb`, `.php`, `.lua`, `.pl` | `ruby`, `php`, `lua`, `perl` |
| `.r`, `.dart`, `.hs`, `.sh` | `Rscript`, `dart`, `runghc`, `bash` |

These are command presets, not bundled compilers. Go, C, Python and the generic
command/registry paths are covered by the setup checks. Other presets require
local toolchains and have not been verified here. Java expects a default-package
class matching the filename; Kotlin expects one runnable main entry point.
Compiled presets build one source file. Multi-file projects can use custom commands.

For any other language, supply its executable command without changing runner code:

```sh
python3 tools/run.py path/to/solution.ext --run 'interpreter {source}' --cases path/to/cases.json
python3 tools/run.py path/to/solution.ext --compile 'compiler {source} -o {exe}' --run '{exe}' --cases path/to/cases.json
```

Replace `interpreter` / `compiler` with your installed tool's actual command.
Supported placeholders: `{source}` (absolute source path), `{dir}` (source folder),
`{stem}` (filename without extension), `{build}` (temporary build directory),
`{exe}` (temporary executable path). Commands execute from the source folder.
Commands are split using shell-style quoting but run without a shell; pipes and
shell expansions are not interpreted. Quote placeholders in custom command strings
if paths may contain spaces: `--run 'python3 "{source}"'`.
An explicit `--run` bypasses the default compiler unless `--compile` is also supplied.

To make a language a one-command choice, add its extension to `tools/languages.json`,
or create a JSON override and pass `--registry path/to/languages.json`:

```json
{
  ".custom": {"run": ["your-interpreter", "{source}"]}
}
```

Registry command arrays preserve spaces inside arguments. Use `.custom` and
`your-interpreter` as placeholders for your real extension and executable.
Language support is open-ended through this contract; a compiler/interpreter and
appropriate entry point are still required for each language.

## Cases and setup checks

The runner finds the nearest `cases.json` above the solution or uses `--cases PATH`.
Two Sum uses `two_sum_indices`, checking correctness rather than a fixed index order.
Future problems can use `exact_tokens` with string `stdin` and `stdout` per case;
add a problem-specific checker when multiple valid outputs need special handling.
The default timeout is two seconds per case and 60 seconds to compile; override
with `--timeout` and `--build-timeout` as needed.

```sh
python3 tools/run.py --check-build
python3 tools/run.py problems/arrays-hashing/001-two-sum/c/solution.c --check-build
python3 -m unittest discover -s tools -p 'test_*.py' -v
gofmt -w problems/arrays-hashing/001-two-sum/solution.go
go vet ./...
```

`--check-build` compiles when applicable and checks command availability. It does
not execute cases or verify syntax for interpreted languages. Runner checks use
temporary programs; no solved exercise is included.

## One branch per problem

The first exercise branch is `codex/001-two-sum`.
Check your current location with `pwd` and `git branch --show-current`.

1. Work on only the current problem; keep implementation and journal together.
2. When finished, review `git diff`, run tests, and commit your work on that branch.
3. Integrate the finished branch into `main` from the checkout that owns `main`.
4. Start the next problem from the updated `main` with
   `git switch -c codex/<number>-<problem-slug> main`.

Create branches only when starting a problem. Do not switch away with uncommitted
work. In a linked worktree, `main` may already be checked out elsewhere; use
`git worktree list` to find that checkout. No push is required for local practice.

## Learning records

- [Roadmap](ROADMAP.md): order and checkpoints.
- [Pattern catalog](PATTERN-CATALOG.md): patterns studied so far.
- [Progress](PROGRESS.md): actual implementation status.
- [Mistake log](MISTAKE-LOG.md) and [review queue](REVIEW-QUEUE.md): lessons and retries.
- `templates/`: reusable problem and weekly review prompts.
