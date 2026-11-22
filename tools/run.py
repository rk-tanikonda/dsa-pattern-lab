#!/usr/bin/env python3
"""Compile/run one solution against shared stdin/stdout cases; stdlib only."""

import argparse
import json
from pathlib import Path
import shlex
import sys

if __package__:
    from .lab_runner import DEFAULT, run_solution
else:
    from lab_runner import DEFAULT, run_solution


def render_text(report):
    build = report["build"]
    if build["stdout"]:
        print(build["stdout"], file=sys.stderr, end="")
    if build["stderr"]:
        print(build["stderr"], file=sys.stderr, end="")
    if report["status"] == "setup_error":
        print(f"SETUP ERROR: {report['error']}", file=sys.stderr)
    elif report["status"] == "setup_ok":
        print("SETUP OK: command available; compiled if applicable. Cases were NOT run.")
    else:
        for case in report["cases"]:
            if case["status"] == "passed":
                print(f"PASS {case['name']}")
            else:
                print(f"FAIL {case['name']}: {case['message']}")
        print(f"{report['passed']}/{report['total']} cases passed")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=DEFAULT)
    parser.add_argument("--cases", type=Path)
    parser.add_argument("--registry", type=Path, help="JSON extension mappings overriding defaults")
    parser.add_argument("--compile", dest="compile_command", type=shlex.split, help="compile command, shell-style quoting")
    parser.add_argument("--run", dest="run_command", type=shlex.split, help="run command, shell-style quoting")
    parser.add_argument("--timeout", type=float, default=2, help="seconds per case (default: 2)")
    parser.add_argument("--build-timeout", type=float, default=60)
    parser.add_argument("--check-build", action="store_true", help="compile/check command availability, skip cases")
    parser.add_argument("--json", action="store_true", help="emit a single structured report on stdout")
    args = parser.parse_args(argv)
    report = run_solution(args.source, cases_path=args.cases, registry_path=args.registry,
                          compile_command=args.compile_command, run_command=args.run_command,
                          timeout=args.timeout, build_timeout=args.build_timeout,
                          check_build=args.check_build)
    if args.json:
        print(json.dumps(report))
    else:
        render_text(report)
    return report["exit_code"]


if __name__ == "__main__":
    sys.exit(main())
