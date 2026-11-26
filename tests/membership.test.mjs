import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
async function identity(id = a, anonymous = false) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub: id, is_anonymous: anonymous }),
  ]);
  await db.exec("set role authenticated");
}
async function owner() {
  await db.exec("reset role");
}
async function paid(
  id = a,
  status = "active",
  end = "2099-01-01",
  subscription = "sub_a",
  event = 1,
) {
  await owner();
  await db.query("select public.sync_subscription($1,$2,$3,$4,$5,false,$6)", [
    id,
    subscription,
    status,
    "monthly",
    end,
    event,
  ]);
  await identity(id);
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text, phone text, last_sign_in_at timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    grant usage on schema auth to authenticated, service_role;
    grant execute on all functions in schema auth to authenticated, service_role;
    insert into auth.users(id,email) values('${a}','a@example.test'),('${b}','b@example.test');`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
});
after(async () => {
  await db.close();
});
test("unpaid and anonymous accounts cannot use the lab or grant themselves access", async () => {
  await identity();
  assert.equal(
    (await db.query("select has_paid_access() as allowed")).rows[0].allowed,
    false,
  );
  assert.equal(
    (await db.query("select consume_run_slot() as allowed")).rows[0].allowed,
    false,
  );
  await assert.rejects(
    db.exec(
      `insert into notes(user_id,problem_id,body) values('${a}','two-sum','unpaid')`,
    ),
    /row-level security/,
  );
  await assert.rejects(
    db.exec(
      `insert into subscriptions(user_id,subscription_id,status,plan,paid_until) values('${a}','fake','active','monthly','2099-01-01')`,
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select sync_subscription($1,$2,$3,$4,$5,false,9)", [
      a,
      "fake",
      "active",
      "monthly",
      "2099-01-01",
    ]),
    /permission denied/,
  );
  await assert.rejects(
    db.exec("select admin_usage_summary()"),
    /permission denied/,
  );
  await paid();
  await identity(a, true);
  assert.equal(
    (await db.query("select has_paid_access() as allowed")).rows[0].allowed,
    false,
  );
});
test("only active unexpired paid memberships unlock features", async () => {
  for (const [status, until] of [
    ["trialing", "2099-01-01"],
    ["past_due", "2099-01-01"],
    ["canceled", "2099-01-01"],
    ["unpaid", "2099-01-01"],
    ["active", "2000-01-01"],
  ]) {
    await paid(a, status, until);
    assert.equal(
      (await db.query("select has_paid_access() as allowed")).rows[0].allowed,
      false,
      status,
    );
  }
  await paid();
  assert.equal(
    (await db.query("select has_paid_access() as allowed")).rows[0].allowed,
    true,
  );
});
test("paid writes are tracked and private between accounts", async () => {
  await paid();
  await db.exec(
    `insert into notes(user_id,problem_id,body) values('${a}','two-sum','my private insight')`,
  );
  await db.exec(
    `insert into progress(user_id,problem_id,code) values('${a}','two-sum','private code')`,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from usage_events where event in ('note_saved','draft_saved')",
      )
    ).rows[0].n,
    2,
  );
  await paid(b, "active", "2099-01-01", "sub_b");
  assert.equal((await db.query("select * from notes")).rows.length, 0);
  assert.equal((await db.query("select * from progress")).rows.length, 0);
  assert.equal((await db.query("select * from usage_events")).rows.length, 0);
  await assert.rejects(
    db.exec(
      `insert into notes(user_id,problem_id,body) values('${a}','other','attack')`,
    ),
    /row-level security/,
  );
  await assert.rejects(
    db.exec(
      `insert into usage_events(user_id,event) values('${b}','run_reserved')`,
    ),
    /permission denied/,
  );
});
test("quotas enforce minute, daily and monthly limits independently and record reservations", async () => {
  await identity(a);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      db.query("select consume_run_slot() as allowed"),
    ),
  );
  assert.equal(results.filter((r) => r.rows[0].allowed).length, 5);
  assert.equal(
    (await db.query("select usage_summary() as usage")).rows[0].usage.runs,
    5,
  );
  await owner();
  await db.query("delete from execution_quota where scope=$1", [`${a}:minute`]);
  await db.query("update execution_quota set runs=50 where scope=$1", [
    `${a}:day`,
  ]);
  await identity(a);
  assert.equal(
    (await db.query("select consume_run_slot() as allowed")).rows[0].allowed,
    false,
  );
  await owner();
  await db.query("update execution_quota set runs=0 where scope=$1", [
    `${a}:day`,
  ]);
  await db.query("update execution_quota set runs=500 where scope=$1", [
    `${a}:month`,
  ]);
  await identity(a);
  assert.equal(
    (await db.query("select consume_run_slot() as allowed")).rows[0].allowed,
    false,
  );
  await identity(b);
  assert.equal(
    (await db.query("select consume_run_slot() as allowed")).rows[0].allowed,
    true,
  );
  await owner();
  await db.query(
    "update execution_quota set expires_at=now()-interval '1 second' where scope like $1",
    [`${a}:%`],
  );
  await identity(a);
  assert.equal(
    (await db.query("select consume_run_slot() as allowed")).rows[0].allowed,
    true,
  );
});
test("billing events are idempotent, ordered and do not revoke a newer subscription", async () => {
  await paid(a, "active", "2099-01-01", "sub_a", 10);
  await paid(a, "canceled", "2099-01-01", "sub_a", 9);
  assert.equal(
    (await db.query("select has_paid_access() as allowed")).rows[0].allowed,
    true,
  );
  await paid(a, "active", "2099-01-01", "sub_a", 10);
  assert.equal((await db.query("select * from subscriptions")).rows.length, 1);
  await paid(a, "active", "2099-01-01", "sub_new", 11);
  await paid(a, "canceled", "2099-01-01", "sub_a", 12);
  assert.equal(
    (await db.query("select subscription_id from subscriptions")).rows[0]
      .subscription_id,
    "sub_new",
  );
  await paid(a, "canceled", "2099-01-01", "sub_new", 13);
  assert.equal(
    (await db.query("select has_paid_access() as allowed")).rows[0].allowed,
    false,
  );
  assert.equal((await db.query("select * from notes")).rows.length, 0);
});
test("billing lock serializes checkout and admin reporting includes all users", async () => {
  await owner();
  await db.query(
    "insert into billing_customers(user_id,customer_id) values($1,$2)",
    [a, "cus_a"],
  );
  await db.exec("set role service_role");
  assert.equal(
    (await db.query("select acquire_billing_lock($1,$2) as acquired", [a, a]))
      .rows[0].acquired,
    true,
  );
  assert.equal(
    (await db.query("select acquire_billing_lock($1,$2) as acquired", [a, b]))
      .rows[0].acquired,
    false,
  );
  const rows = (await db.query("select admin_usage_summary() as report"))
    .rows[0].report;
  assert.equal(rows.length, 2);
  assert.equal(rows.find((r) => r.id === a).notes, 1);
});

test("navigation analytics rejects unpaid accounts, arbitrary paths and excessive events", async () => {
  await identity(a);
  assert.equal(
    (await db.query("select record_page_view('/learn') as ok")).rows[0].ok,
    false,
  );
  await identity(b);
  assert.equal(
    (await db.query("select record_page_view('/admin?private=1') as ok"))
      .rows[0].ok,
    false,
  );
  assert.equal(
    (await db.query("select record_page_view('/learn/problems/two-sum') as ok"))
      .rows[0].ok,
    true,
  );
  for (let i = 0; i < 29; i++)
    await db.query("select record_page_view('/learn/notes')");
  assert.equal(
    (await db.query("select record_page_view('/learn') as ok")).rows[0].ok,
    false,
  );
});
