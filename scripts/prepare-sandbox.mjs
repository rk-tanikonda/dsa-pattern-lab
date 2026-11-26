import { Sandbox } from "@vercel/sandbox";
import { writeFile } from "node:fs/promises";

// Trusted runtime preparation only. Learner code never runs with network access.
const releases = await fetch("https://go.dev/dl/?mode=json").then(r => r.json());
const release = releases.find(r => r.stable);
const archive = release.files.find(f => f.os === "linux" && f.arch === "amd64" && f.kind === "archive");
if (!/^go[\d.]+\.linux-amd64\.tar\.gz$/.test(archive.filename) || !/^[a-f0-9]{64}$/.test(archive.sha256)) throw new Error("Unexpected Go archive metadata");
const sandbox = await Sandbox.create({ timeout: 300_000, resources: { vcpus: 1 }, persistent: false });
try {
  const setup = await sandbox.runCommand({
    cmd: "bash", args: ["-ec", `curl -fsSL https://go.dev/dl/${archive.filename} -o /tmp/go.tar.gz
echo '${archive.sha256}  /tmp/go.tar.gz' | sha256sum -c -
tar -xzf /tmp/go.tar.gz -C /vercel
rm /tmp/go.tar.gz
mkdir -p /vercel/go-cache
printf 'package main\nimport ("encoding/json"; "os")\nfunc main(){json.NewEncoder(os.Stdout).Encode(true)}\n' > /tmp/warm.go
GOCACHE=/vercel/go-cache GOMAXPROCS=1 /vercel/go/bin/go build -o /tmp/warm /tmp/warm.go
rm /tmp/warm /tmp/warm.go
/vercel/go/bin/go version
python3 --version
node --version`], timeoutMs: 240_000,
  });
  if (setup.exitCode !== 0) throw new Error(await setup.output());
  console.log(await setup.stdout());
  const snapshot = await sandbox.snapshot({ expiration: 0 });
  await writeFile(".vercel/sandbox-snapshot-id", snapshot.snapshotId, { mode: 0o600 });
  console.log("Runtime snapshot prepared:", snapshot.snapshotId);
} finally {
  await sandbox.delete();
}
