import { Sandbox } from "@vercel/sandbox";

type Run = {
  problem_id: string;
  language: "go" | "python" | "javascript";
  code: string;
};
type Output = { stdout: string; stderr: string; exit_code: number };
const commands = {
  go: { file: "main.go", command: "./solution" },
  python: { file: "main.py", command: "python3 main.py" },
  javascript: { file: "main.js", command: "node main.js" },
};

// Only the server calls this module, after Go validates the request and reserves quota.
// No application credentials or expected answers are copied into the microVM.
export async function execute(
  input: Run,
  inputs: unknown[],
): Promise<Output[]> {
  const snapshotId = process.env.SANDBOX_SNAPSHOT_ID;
  if (!snapshotId) throw new Error("Execution runtime is not configured.");
  const sandbox = await Sandbox.create({
    source: { type: "snapshot", snapshotId },
    persistent: false,
    resources: { vcpus: 1 },
    timeout: 60_000,
    networkPolicy: "deny-all",
  });
  const language = commands[input.language];
  const encode = (text: string) => Buffer.from(text).toString("base64");
  try {
    await sandbox.writeFiles([
      { path: language.file, content: Buffer.from(input.code) },
      ...inputs.map((value, i) => ({
        path: `input-${i}.json`,
        content: Buffer.from(JSON.stringify(value) + "\n"),
      })),
    ]);
    if (input.language === "go") {
      const build = await sandbox.runCommand({
        cmd: "bash",
        args: [
          "-c",
          "ulimit -f 20480; timeout -k 1 25 /vercel/go/bin/go build -o solution main.go >build.log 2>&1; status=$?; head -c 8192 build.log; exit $status",
        ],
        env: {
          GOTOOLCHAIN: "local",
          GOPROXY: "off",
          GOSUMDB: "off",
          GOCACHE: "/vercel/go-cache",
          GOMAXPROCS: "1",
        },
        timeoutMs: 28_000,
      });
      if (build.exitCode !== 0) {
        const stderr = encode(await build.stdout());
        return inputs.map(() => ({
          stdout: "",
          stderr,
          exit_code: build.exitCode,
        }));
      }
    }
    const outputs: Output[] = [];
    for (let i = 0; i < inputs.length; i++) {
      // Only allowlisted commands and server-generated integer indices enter the shell.
      const result = await sandbox.runCommand({
        cmd: "bash",
        args: [
          "-c",
          `ulimit -f 64; timeout -k 1 5 ${language.command} <input-${i}.json >output.log 2>error.log; status=$?; head -c 8192 output.log; head -c 8192 error.log >&2; exit $status`,
        ],
        timeoutMs: 7_000,
        env: { GOMAXPROCS: "1" },
      });
      outputs.push({
        stdout: encode(await result.stdout()),
        stderr: encode(await result.stderr()),
        exit_code: result.exitCode,
      });
    }
    return outputs;
  } finally {
    // Ephemeral sessions do not retain learner source or execution logs in snapshots.
    await sandbox.delete({ signal: AbortSignal.timeout(10_000) });
  }
}
