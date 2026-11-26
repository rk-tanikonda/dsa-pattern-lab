import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { execute } from "@/lib/execution";
import { adminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const allowed = /^(state|progress\/[a-z0-9-]+|notes\/[a-z0-9-]+|run)$/;
async function executeRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (!allowed.test(path))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== request.nextUrl.origin
  ) {
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  }
  const client = await serverClient();
  if (!client)
    return NextResponse.json(
      {
        error:
          "Accounts are not configured yet. Connect Supabase to enable saving and code execution.",
      },
      { status: 503 },
    );
  const { data: identity, error } = await client.auth.getClaims();
  if (error || !identity?.claims)
    return NextResponse.json(
      { error: "Sign in to save your work and run tests." },
      { status: 401 },
    );
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session)
    return NextResponse.json(
      { error: "Your session expired. Please sign in again." },
      { status: 401 },
    );
  const origin = process.env.GO_API_URL;
  if (!origin)
    return NextResponse.json(
      { error: "The learning API is not configured yet." },
      { status: 503 },
    );
  // Bound request buffering before forwarding user source to Go.
  let body: string | undefined;
  if (request.method !== "GET") {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 128 * 1024) {
          await reader.cancel();
          return NextResponse.json(
            { error: "Request is too large." },
            { status: 413 },
          );
        }
        chunks.push(value);
      }
    body = Buffer.concat(chunks).toString("utf8");
  }
  try {
    if (path === "run" && request.method !== "POST")
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 },
      );
    if (path === "run" && !process.env.SANDBOX_SNAPSHOT_ID)
      return NextResponse.json(
        {
          error:
            "Code execution is being configured. You can still save your draft.",
        },
        { status: 503 },
      );
    const base = origin.endsWith("/") ? origin : `${origin}/`;
    const headers = {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
    let result = await fetch(
      new URL(`v1/${path === "run" ? "prepare" : path}`, base),
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(45000),
      },
    );
    if (path === "run" && result.ok) {
      const input = JSON.parse(body!);
      const prepared = await result.json();
      const outputs = await execute(input, prepared.inputs);
      result = await fetch(new URL("v1/complete", base), {
        method: "POST",
        headers,
        body: JSON.stringify({ ...input, outputs }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    }
    return new NextResponse(await result.text(), {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The learning service is unavailable. Your editor content is still here; try again shortly.",
      },
      { status: 502 },
    );
  }
}
async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = (await context.params).path.join("/");
  if (!allowed.test(path))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (
    request.method !== "GET" &&
    request.headers.get("origin") !== request.nextUrl.origin
  )
    return NextResponse.json(
      { error: "Invalid request origin" },
      { status: 403 },
    );
  const client = await serverClient();
  const identity = client ? await client.auth.getUser() : null;
  const user = identity?.data.user;
  if (!client || !user || user.is_anonymous)
    return NextResponse.json(
      { error: "Sign in with a permanent account to continue." },
      { status: 401 },
    );
  const started = Date.now();
  let eventId: string;
  try {
    const { data, error } = await adminClient()
      .from("usage_events")
      .insert({ user_id: user.id, event: "api_request", resource: path })
      .select("id")
      .single();
    if (error) throw error;
    eventId = data.id;
  } catch {
    return NextResponse.json(
      { error: "Usage tracking is temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }
  let response: NextResponse;
  try {
    const { data: paid, error } = await client.rpc("has_paid_access");
    if (error)
      response = NextResponse.json(
        { error: "Membership verification is unavailable." },
        { status: 503 },
      );
    else if (paid !== true)
      response = NextResponse.json(
        {
          error:
            "A paid membership is required. Choose a plan in Billing & usage.",
        },
        { status: 402 },
      );
    else response = await executeRequest(request, context);
  } catch {
    response = NextResponse.json(
      { error: "The learning service is temporarily unavailable." },
      { status: 503 },
    );
  }
  const { error: auditError } = await adminClient()
    .from("usage_events")
    .update({ status: response.status, duration_ms: Date.now() - started })
    .eq("id", eventId);
  if (auditError) console.error("Could not finalize usage event", eventId);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export { handler as GET, handler as PUT, handler as POST };
