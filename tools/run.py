#!/usr/bin/env python3
"""Compile/run one solution against shared stdin/stdout cases; stdlib only."""

import argparse
import json
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "problems/arrays-hashing/001-two-sum/solution.go"


class SetupError(Exception):
    pass


def load_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError) as error:
        raise SetupError(f"cannot read {path}: {error}") from error


def find_cases(source):
    for directory in source.parents:
        candidate = directory / "cases.json"
        if candidate.is_file():
            return candidate
    raise SetupError("no cases.json above solution; pass --cases PATH")


def prepare_cases(document):
    if not isinstance(document, dict):
        raise SetupError("cases file must contain an object")
    checker = document.get("checker")
    cases = document.get("cases")
    if checker not in ("two_sum_indices", "exact_tokens"):
        raise SetupError("checker must be two_sum_indices or exact_tokens")
    if not isinstance(cases, list) or not cases:
        raise SetupError("cases must be a nonempty list")
    prepared = []
    for case in cases:
        if not isinstance(case, dict) or not isinstance(case.get("name"), str):
            raise SetupError("each case needs a name")
        if checker == "two_sum_indices":
            nums, target = case.get("nums"), case.get("target")
            if (not isinstance(nums, list) or len(nums) < 2
                    or any(type(n) is not int for n in nums) or type(target) is not int):
                raise SetupError(f"{case['name']}: expected integer nums and target")
            pairs = sum(nums[i] + nums[j] == target
                        for i in range(len(nums)) for j in range(i + 1, len(nums)))
            if pairs != 1:
                raise SetupError(f"{case['name']}: expected exactly one valid pair")
            stdin = f"{len(nums)} {target}\n" + " ".join(map(str, nums)) + "\n"
        else:
            if not all(isinstance(case.get(key), str) for key in ("stdin", "stdout")):
                raise SetupError(f"{case['name']}: expected stdin and stdout strings")
            stdin = case["stdin"]
        prepared.append((case, stdin))
    return checker, prepared


def check_output(checker, case, output):
    tokens = output.split()
    if checker == "exact_tokens":
        return None if tokens == case["stdout"].split() else "output tokens differ"
    if len(tokens) != 2 or any(re.fullmatch(r"[+-]?[0-9]+", t) is None for t in tokens):
        return "expected exactly two integer indices on stdout"
    try:
        i, j = map(int, tokens)
    except ValueError:
        return "indices are too large"
    nums = case["nums"]
    if not (0 <= i < len(nums) and 0 <= j < len(nums)):
        return "index out of range"
    if i == j:
        return "cannot reuse the same index"
    if nums[i] + nums[j] != case["target"]:
        return "selected values do not sum to target"
    return None


def expand(command, values):
    if not isinstance(command, list) or not command or not all(isinstance(t, str) for t in command):
        raise SetupError("commands must be nonempty arrays of strings")
    # Replace only documented placeholders; preserve braces used by other languages.
    return [re.sub(r"\{(source|dir|stem|build|exe)\}",
                   lambda match: values[match[1]], token) for token in command]


def execute(command, timeout, stdin=None, cwd=None):
    if shutil.which(command[0]) is None:
        raise SetupError(f"tool not found: {command[0]}; install it or override the command")
    try:
        return subprocess.run(command, input=stdin, text=True, capture_output=True,
                              timeout=timeout, cwd=cwd)
    except OSError as error:
        raise SetupError(f"cannot execute {command[0]}: {error}") from error


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT)
    parser.add_argument("--cases", type=Path)
    parser.add_argument("--registry", type=Path, help="JSON extension mappings overriding defaults")
    parser.add_argument("--compile", dest="compile_command", help="optional compile command, shell-style quoting")
    parser.add_argument("--run", dest="run_command", help="run command, shell-style quoting")
    parser.add_argument("--timeout", type=float, default=2, help="seconds per case (default: 2)")
    parser.add_argument("--build-timeout", type=float, default=60)
    parser.add_argument("--check-build", action="store_true", help="compile/check command availability, skip cases")
    args = parser.parse_args(argv)
    try:
        if args.timeout <= 0 or args.build_timeout <= 0:
            raise SetupError("timeouts must be positive")
        source = args.source.resolve()
        if not source.is_file():
            raise SetupError(f"solution file not found: {source}")
        registry = load_json(ROOT / "tools/languages.json")
        if args.registry:
            overrides = load_json(args.registry)
            if not isinstance(overrides, dict):
                raise SetupError("registry must be an object mapping extensions to commands")
            registry.update(overrides)
        adapter = registry.get(source.suffix.lower(), {})
        if not isinstance(adapter, dict):
            raise SetupError("language entry must be an object")
        # Explicit --run takes full control, so it does not trigger a default compiler.
        compile_command = adapter.get("compile") if args.run_command is None else None
        run_command = adapter.get("run")
        if args.compile_command is not None:
            compile_command = shlex.split(args.compile_command)
        if args.run_command is not None:
            run_command = shlex.split(args.run_command)
        if not run_command:
            raise SetupError(f"no adapter for {source.suffix}; use --run or --registry")
        checker, cases = prepare_cases(load_json(args.cases or find_cases(source)))
        with tempfile.TemporaryDirectory(prefix="dsa-run-") as directory:
            values = {"source": str(source), "dir": str(source.parent), "stem": source.stem,
                      "build": directory, "exe": str(Path(directory) / "solution")}
            if compile_command is not None:
                try:
                    result = execute(expand(compile_command, values), args.build_timeout, cwd=source.parent)
                except subprocess.TimeoutExpired as error:
                    raise SetupError("compilation timed out") from error
                if result.returncode:
                    raise SetupError(f"compilation failed:\n{result.stdout}{result.stderr}")
                if result.stderr:
                    print(result.stderr, file=sys.stderr, end="")
            command = expand(run_command, values)
            if shutil.which(command[0]) is None:
                raise SetupError(f"tool not found: {command[0]}; install it or override the command")
            if args.check_build:
                print("SETUP OK: command available; compiled if applicable. Cases were NOT run.")
                return 0
            passed = 0
            for case, stdin in cases:
                try:
                    result = execute(command, args.timeout, stdin, source.parent)
                    error = (f"process exited {result.returncode}: {result.stderr.strip()}"
                             if result.returncode else check_output(checker, case, result.stdout))
                except subprocess.TimeoutExpired:
                    error = f"timed out after {args.timeout:g}s"
                if error:
                    print(f"FAIL {case['name']}: {error}")
                else:
                    passed += 1
                    print(f"PASS {case['name']}")
            print(f"{passed}/{len(cases)} cases passed")
            return 0 if passed == len(cases) else 1
    except (SetupError, ValueError) as error:
        print(f"SETUP ERROR: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
