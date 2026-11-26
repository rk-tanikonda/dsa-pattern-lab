// Isolated UI fixture: no live users, payments, database, or executor.
// Run with `node tests/preview.mjs`, then `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 ... npm run dev`.
import http from "node:http";
import { createHmac } from "node:crypto";
const paidId = "00000000-0000-4000-8000-000000000001";
const unpaidId = "00000000-0000-4000-8000-000000000002";
const rows = { progress: [], notes: [], usage_events: [] };
const timestamp = new Date().toISOString();
function user(id) {
  return {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: id === paidId ? "member@example.test" : "unpaid@example.test",
    email_confirmed_at: timestamp,
    is_anonymous: false,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Alex Morgan" },
    created_at: timestamp,
    updated_at: timestamp,
  };
}
function token(id) {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const p = Buffer.from(
    JSON.stringify({
      sub: id,
      aud: "authenticated",
      role: "authenticated",
      is_anonymous: false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url");
  return `${h}.${p}.${createHmac("sha256", "preview-fixture-only").update(`${h}.${p}`).digest("base64url")}`;
}
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3100");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.end();
    return;
  }
  const url = new URL(req.url, "http://localhost");
  let body = "";
  for await (const chunk of req) body += chunk;
  let input;
  try {
    input = body ? JSON.parse(body) : {};
  } catch {
    input = {};
  }
  let id = paidId;
  try {
    id = JSON.parse(
      Buffer.from((req.headers.authorization || "").split(".")[1], "base64url"),
    ).sub;
  } catch {}
  const send = (value, status = 200) => {
    res.statusCode = status;
    res.end(JSON.stringify(value));
  };
  if (url.pathname === "/auth/v1/settings")
    return send({
      external: {
        email: true,
        google: true,
        github: true,
        apple: true,
        azure: true,
        discord: true,
        phone: true,
      },
    });
  if (url.pathname === "/auth/v1/token")
    return send({
      access_token: token(
        input.email?.startsWith("unpaid") ? unpaidId : paidId,
      ),
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "preview-refresh",
      user: user(input.email?.startsWith("unpaid") ? unpaidId : paidId),
    });
  if (url.pathname === "/auth/v1/user") return send(user(id));
  if (url.pathname === "/auth/v1/logout") return send({});
  if (url.pathname === "/rest/v1/rpc/has_paid_access")
    return send(id === paidId);
  if (url.pathname === "/rest/v1/rpc/usage_summary")
    return send({
      runs: 18,
      runs_today: 3,
      saves: 24,
      notes: 7,
      sign_ins: 5,
      requests: 54,
      failures: 1,
      reset_at: "2026-12-01T00:00:00Z",
    });
  if (url.pathname === "/rest/v1/subscriptions")
    return send(
      id === paidId
        ? {
            status: "active",
            plan: "monthly",
            paid_until: "2099-01-01T00:00:00Z",
            cancel_at_period_end: false,
          }
        : null,
    );
  if (url.pathname === "/rest/v1/billing_customers")
    return send(id === paidId ? { customer_id: "cus_preview" } : null);
  if (url.pathname === "/rest/v1/usage_events") {
    if (req.method === "POST") {
      const row = {
        id: crypto.randomUUID(),
        ...input,
        created_at: new Date().toISOString(),
      };
      rows.usage_events.unshift(row);
      return send({ id: row.id });
    }
    if (req.method === "PATCH") return send({});
    return send(rows.usage_events.slice(0, 10));
  }
  if (url.pathname === "/v1/state")
    return send({ progress: rows.progress, notes: rows.notes });
  const match = url.pathname.match(/^\/v1\/(progress|notes)\/([a-z0-9-]+)$/);
  if (match && req.method === "PUT") {
    const row = {
      ...input,
      problem_id: match[2],
      user_id: id,
      updated_at: new Date().toISOString(),
    };
    rows[match[1]] = rows[match[1]].filter(
      (r) => r.problem_id !== row.problem_id,
    );
    rows[match[1]].push(row);
    return send(row);
  }
  return send({ error: "Fixture endpoint not implemented" }, 404);
});
server.listen(54329, "127.0.0.1", () =>
  console.log("Isolated UI fixture listening on 127.0.0.1:54329"),
);
