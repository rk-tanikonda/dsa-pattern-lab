import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
const allowed = /^(state|progress\/[a-z0-9-]+|notes\/[a-z0-9-]+|run)$/;
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
    const result = await fetch(`${origin.replace(/\/$/, "")}/v1/${path}`, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    });
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
export { handler as GET, handler as PUT, handler as POST };
