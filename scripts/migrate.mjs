import postgres from "postgres";
import { readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

if (!process.env.POSTGRES_URL) throw new Error("Pull the Vercel database environment before migrating.");
const sql = postgres(process.env.POSTGRES_URL, { max: 1, prepare: false, ssl: "require", onnotice: () => {} });
try {
  await sql.begin(async tx => {
    await tx`select pg_advisory_xact_lock(802632)`;
    await tx`create schema if not exists pattern_lab_internal`;
    await tx`revoke all on schema pattern_lab_internal from public, anon, authenticated`;
    await tx`create table if not exists pattern_lab_internal.migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())`;
    for (const name of (await readdir("supabase/migrations")).filter(n => n.endsWith(".sql")).sort()) {
      const source = await readFile(`supabase/migrations/${name}`, "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      const [previous] = await tx`select checksum from pattern_lab_internal.migrations where name=${name}`;
      if (previous) {
        if (previous.checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await tx.unsafe(source);
      await tx`insert into pattern_lab_internal.migrations(name,checksum) values(${name},${checksum})`;
      console.log(`Applied ${name}`);
    }
  });
} finally {
  await sql.end();
}
