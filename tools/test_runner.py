"""Runner checks use temporary programs, never a solved exercise."""

import json
import contextlib
import io
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from tools.lab_runner import check_output, prepare_cases, run_solution, SetupError
from tools.catalog import load_catalog

RUNNER = Path(__file__).with_name("run.py")


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="dsa runner test ")
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.cases = self.directory / "cases.json"
        self.cases.write_text(json.dumps({"checker": "two_sum_indices", "cases": [
            {"name": "distinct duplicates", "nums": [3, 3], "target": 6}
        ]}))

    def invoke(self, program, suffix=".py", *args):
        source = self.directory / ("solution" + suffix)
        source.write_text(program)
        return subprocess.run([sys.executable, str(RUNNER), str(source), *args],
                              text=True, capture_output=True, timeout=90)

    def test_python_adapter_and_reverse_indices(self):
        result = self.invoke("import sys\nassert sys.stdin.read() == '2 6\\n3 3\\n'\nprint('1 0')\n")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout)
        self.assertIn("1/1 cases passed", result.stdout)

    def test_invalid_answers(self):
        case = {"nums": [3, 2, 4], "target": 6}
        for output in ("", "0 0", "-1 2", "0 3", "0 1", "1 2 debug", "1.0 2"):
            with self.subTest(output=output):
                self.assertIsNotNone(check_output("two_sum_indices", case, output))
        self.assertIsNone(check_output("two_sum_indices", case, "2 1\n"))

    def test_stub_fails_as_exercise_not_setup(self):
        result = self.invoke("pass\n")
        self.assertEqual(result.returncode, 1)
        self.assertIn("FAIL distinct duplicates", result.stdout)

    def test_custom_run_for_unknown_extension(self):
        result = self.invoke("print('0 1')", ".custom", "--run", f'"{sys.executable}" "{{source}}"')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_custom_registry(self):
        registry = self.directory / "languages.json"
        registry.write_text(json.dumps({".custom": {"run": [sys.executable, "{source}"]}}))
        result = self.invoke("print('0 1')", ".custom", "--registry", str(registry))
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_custom_compile_and_run(self):
        # A generic copy step proves compile/run placeholders without a solution algorithm.
        compile_command = f'"{sys.executable}" -c "import shutil,sys; shutil.copyfile(sys.argv[1],sys.argv[2])" "{{source}}" "{{exe}}"'
        result = self.invoke("print('0 1')", ".custom", "--compile", compile_command,
                             "--run", f'"{sys.executable}" "{{exe}}"')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_tool_is_setup_error(self):
        result = self.invoke("", ".custom", "--run", "dsa-nonexistent-tool-123 {source}")
        self.assertEqual(result.returncode, 2)
        self.assertIn("tool not found", result.stderr)

    def test_compile_failure_is_setup_error(self):
        result = self.invoke("", ".custom", "--compile", f'"{sys.executable}" -c "raise SystemExit(7)"',
                             "--run", f'"{sys.executable}" "{{source}}"')
        self.assertEqual(result.returncode, 2)
        self.assertIn("compilation failed", result.stderr)

    def test_runtime_failure(self):
        result = self.invoke("raise SystemExit(3)")
        self.assertEqual(result.returncode, 1)
        self.assertIn("process exited 3", result.stdout)

    def test_timeout(self):
        result = self.invoke("import time; time.sleep(10)", ".py", "--timeout", "0.05")
        self.assertEqual(result.returncode, 1)
        self.assertIn("timed out", result.stdout)

    def test_bad_fixture_is_setup_error(self):
        with self.assertRaises(SetupError):
            prepare_cases({"checker": "two_sum_indices", "cases": [
                {"name": "no pair", "nums": [1, 2], "target": 9}
            ]})

    def test_json_results_cover_success_and_failures(self):
        scenarios = [
            ("print('0 1')", (), 0, "passed", "passed"),
            ("pass", (), 1, "failed", "wrong_answer"),
            ("raise SystemExit(3)", (), 1, "failed", "runtime_error"),
            ("import time; time.sleep(10)", ("--timeout", "0.05"), 1, "failed", "timeout"),
            ("pass", ("--run", "dsa-nonexistent-tool-123"), 2, "setup_error", None),
            ("pass", ("--check-build",), 0, "setup_ok", None),
        ]
        for program, args, code, status, case_status in scenarios:
            with self.subTest(status=status, case_status=case_status):
                result = self.invoke(program, ".py", "--json", *args)
                report = json.loads(result.stdout)
                self.assertEqual(result.returncode, code)
                self.assertEqual(report["exit_code"], code)
                self.assertEqual(report["schema_version"], 1)
                self.assertEqual(report["status"], status)
                self.assertEqual(result.stderr, "")
                if case_status:
                    self.assertEqual(report["cases"][0]["status"], case_status)
                else:
                    self.assertEqual(report["cases"], [])

    def test_engine_returns_build_diagnostics_without_printing(self):
        source = self.directory / "solution.custom"
        source.write_text("print('0 1')")
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            report = run_solution(source,
                                  compile_command=[sys.executable, "-c", "import sys; print('build output'); print('build warning', file=sys.stderr)"],
                                  run_command=[sys.executable, "{source}"])
        self.assertEqual(report["status"], "passed")
        self.assertEqual(report["build"]["status"], "passed")
        self.assertEqual(report["build"]["stdout"], "build output\n")
        self.assertEqual(report["build"]["stderr"], "build warning\n")
        self.assertEqual(stdout.getvalue(), "")
        self.assertEqual(stderr.getvalue(), "")

    def test_json_compile_error(self):
        result = self.invoke("", ".custom", "--json", "--compile",
                             f'"{sys.executable}" -c "raise SystemExit(7)"',
                             "--run", f'"{sys.executable}" "{{source}}"')
        report = json.loads(result.stdout)
        self.assertEqual(report["status"], "setup_error")
        self.assertEqual(report["build"]["status"], "failed")
        self.assertEqual(result.returncode, 2)

    def test_catalog_validates_references_and_shared_cases(self):
        catalog = load_catalog()
        self.assertEqual(catalog["schema_version"], 1)
        self.assertIn("001-two-sum", [p["id"] for p in catalog["problems"]])
        problem = self.directory / "problems/example"
        problem.mkdir(parents=True)
        metadata = dict(catalog["problems"][0])
        metadata["description"] = "../../outside.md"
        (self.directory / "outside.md").write_text("outside problem folder")
        (problem / "problem.json").write_text(json.dumps(metadata))
        with self.assertRaises(SetupError):
            load_catalog(self.directory)

    def test_go_and_c_input_output(self):
        # Echo the first input integers; this is not a Two Sum implementation.
        self.cases.write_text(json.dumps({"checker": "exact_tokens", "cases": [
            {"name": "read stdin", "stdin": "2 6\n", "stdout": "2 6\n"}
        ]}))
        programs = {
            ".go": ('go', 'package main\nimport "fmt"\nfunc main(){ var n, t int; fmt.Scan(&n, &t); fmt.Println(n,t) }\n'),
            ".c": ('cc', '#include <stdio.h>\nint main(void){int n,t;if(scanf("%d %d",&n,&t)!=2)return 1;printf("%d %d\\n",n,t);return 0;}\n'),
        }
        for suffix, (tool, program) in programs.items():
            with self.subTest(language=suffix):
                if not shutil.which(tool):
                    self.skipTest(f"{tool} is not installed")
                result = self.invoke(program, suffix)
                self.assertEqual(result.returncode, 0, result.stderr + result.stdout)


if __name__ == "__main__":
    unittest.main()
