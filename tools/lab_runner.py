#!/usr/bin/env python3
"""Local execution engine returning structured reports, without terminal output."""

import json
from pathlib import Path
import re
import shutil
import subprocess
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
        return subprocess.run(command, input=stdin, text=True, encoding="utf-8", errors="replace", capture_output=True,
                              timeout=timeout, cwd=cwd)
    except OSError as error:
        raise SetupError(f"cannot execute {command[0]}: {error}") from error


def run_solution(source=DEFAULT, *, cases_path=None, registry_path=None,
                 compile_command=None, run_command=None, timeout=2,
                 build_timeout=60, check_build=False):
    """Run trusted local code. This is not a sandbox or public execution API.

    Command overrides are argument arrays. Return a JSON-serializable v1 report;
    callers decide how to render it. No output is printed by this engine.
    """
    source = Path(source).resolve()
    report = {"schema_version": 1, "source": str(source), "status": "setup_error",
              "exit_code": 2, "passed": 0, "total": 0, "cases": [], "error": None,
              "build": {"status": "not_required", "stdout": "", "stderr": ""}}
    try:
        if timeout <= 0 or build_timeout <= 0:
            raise SetupError("timeouts must be positive")
        if not source.is_file():
            raise SetupError(f"solution file not found: {source}")
        registry = load_json(ROOT / "tools/languages.json")
        if registry_path:
            overrides = load_json(Path(registry_path))
            if not isinstance(overrides, dict):
                raise SetupError("registry must be an object mapping extensions to commands")
            registry.update(overrides)
        adapter = registry.get(source.suffix.lower(), {})
        if not isinstance(adapter, dict):
            raise SetupError("language entry must be an object")
        # Explicit run commands do not trigger the adapter's default compiler.
        if compile_command is None and run_command is None:
            compile_command = adapter.get("compile")
        if run_command is None:
            run_command = adapter.get("run")
        if not run_command:
            raise SetupError(f"no adapter for {source.suffix}; use --run or --registry")
        fixture_path = Path(cases_path) if cases_path else find_cases(source)
        checker, cases = prepare_cases(load_json(fixture_path))
        report["total"] = len(cases)
        with tempfile.TemporaryDirectory(prefix="dsa-run-") as directory:
            values = {"source": str(source), "dir": str(source.parent), "stem": source.stem,
                      "build": directory, "exe": str(Path(directory) / "solution")}
            if compile_command is not None:
                report["build"]["status"] = "failed"
                try:
                    result = execute(expand(compile_command, values), build_timeout, cwd=source.parent)
                except subprocess.TimeoutExpired as error:
                    report["build"]["status"] = "timeout"
                    raise SetupError("compilation timed out") from error
                report["build"].update(stdout=result.stdout, stderr=result.stderr)
                if result.returncode:
                    raise SetupError(f"compilation failed (exit {result.returncode})")
                report["build"]["status"] = "passed"
            command = expand(run_command, values)
            if shutil.which(command[0]) is None:
                raise SetupError(f"tool not found: {command[0]}; install it or override the command")
            if check_build:
                report.update(status="setup_ok", exit_code=0)
                return report
            for case, stdin in cases:
                outcome = {"name": case["name"], "status": "passed", "message": None,
                           "stdout": "", "stderr": "", "returncode": None}
                try:
                    result = execute(command, timeout, stdin, source.parent)
                    outcome.update(stdout=result.stdout, stderr=result.stderr, returncode=result.returncode)
                    if result.returncode:
                        outcome.update(status="runtime_error", message=f"process exited {result.returncode}: {result.stderr.strip()}")
                    else:
                        error = check_output(checker, case, result.stdout)
                        if error:
                            outcome.update(status="wrong_answer", message=error)
                except subprocess.TimeoutExpired:
                    outcome.update(status="timeout", message=f"timed out after {timeout:g}s")
                if outcome["status"] == "passed":
                    report["passed"] += 1
                report["cases"].append(outcome)
            passed = report["passed"] == report["total"]
            report.update(status="passed" if passed else "failed", exit_code=0 if passed else 1)
    except (SetupError, ValueError) as error:
        report["error"] = str(error)
    return report
