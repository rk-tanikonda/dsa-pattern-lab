"""Runner checks use temporary programs, never a solved exercise."""

import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from tools.run import check_output, prepare_cases, SetupError

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
