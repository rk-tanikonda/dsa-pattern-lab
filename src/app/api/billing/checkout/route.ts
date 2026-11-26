import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { serverClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import {
  appOrigin,
  billingReady,
  stripeClient,
  validatePrice,
} from "@/lib/billing";
import { isPlan } from "@/lib/plans";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const client = await serverClient();
  const identity = client ? await client.auth.getUser() : null;
  const user = identity?.data.user;
  if (!user || user.is_anonymous)
    return NextResponse.json(
      { error: "Sign in with a permanent account first." },
      { status: 401 },
    );
  if (!billingReady())
    return NextResponse.json(
      {
        error: "Membership payments are not open yet. Please check back soon.",
      },
      { status: 503 },
    );
  let plan: unknown;
  try {
    if (Number(request.headers.get("content-length")) > 1024) throw new Error();
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1024) {
          await reader.cancel();
          throw new Error();
        }
        chunks.push(value);
      }
    const body = Buffer.concat(chunks).toString("utf8");
    plan = JSON.parse(body).plan;
  } catch {
    return NextResponse.json(
      { error: "Choose a valid membership." },
      { status: 400 },
    );
  }
  if (!isPlan(plan))
    return NextResponse.json(
      { error: "Choose a valid membership." },
      { status: 400 },
    );
  const lock = randomUUID();
  let locked = false;
  try {
    const stripe = stripeClient(),
      db = adminClient();
    const price = await validatePrice(stripe, plan);
    const { data: existing, error } = await db
      .from("billing_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    let customer = existing?.customer_id;
    if (!customer) {
      const created = await stripe.customers.create(
        {
          email: user.email,
          phone: user.phone || undefined,
          metadata: { user_id: user.id },
        },
        { idempotencyKey: `customer:${user.id}` },
      );
      const { error: saveError } = await db
        .from("billing_customers")
        .upsert(
          { user_id: user.id, customer_id: created.id },
          { onConflict: "user_id", ignoreDuplicates: true },
        );
      if (saveError) throw saveError;
      // Another request may have installed the mapping first.
      const { data: mapping, error: mappingError } = await db
        .from("billing_customers")
        .select("customer_id")
        .eq("user_id", user.id)
        .single();
      if (mappingError) throw mappingError;
      customer = mapping.customer_id;
    }
    const { data: acquired, error: lockError } = await db.rpc(
      "acquire_billing_lock",
      { p_user: user.id, p_token: lock },
    );
    if (lockError) throw lockError;
    if (!acquired)
      return NextResponse.json(
        {
          error:
            "Another checkout is being prepared. Please try again in a moment.",
        },
        { status: 409 },
      );
    locked = true;
    const subscriptions = await stripe.subscriptions.list({
      customer,
      status: "all",
      limit: 100,
    });
    if (
      subscriptions.data.some(
        (s) => !["canceled", "incomplete_expired"].includes(s.status),
      )
    ) {
      return NextResponse.json(
        {
          error:
            "You already have a subscription. Use Manage billing to update it or resolve a payment.",
        },
        { status: 409 },
      );
    }
    // Reuse an open checkout, or expire it before switching billing intervals.
    const previous = await stripe.checkout.sessions.list({
      customer,
      limit: 100,
    });
    const open = previous.data.filter((session) => session.status === "open");
    const samePlan = open.find((s) => s.metadata?.plan === plan && s.url);
    if (samePlan) return NextResponse.json({ url: samePlan.url });
    for (const session of open)
      await stripe.checkout.sessions.expire(session.id);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer,
        client_reference_id: user.id,
        line_items: [{ price, quantity: 1 }],
        metadata: { plan, user_id: user.id },
        subscription_data: { metadata: { user_id: user.id } },
        success_url: `${appOrigin()}/billing?checkout=success`,
        cancel_url: `${appOrigin()}/billing?checkout=canceled`,
        expires_at: (Math.floor(Date.now() / 1800000) + 2) * 1800,
      },
      {
        idempotencyKey: `checkout:${user.id}:${plan}:${previous.data[0]?.id ?? "first"}:${Math.floor(Date.now() / 1800000)}`,
      },
    );
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Checkout could not be prepared. Please try again shortly." },
      { status: 503 },
    );
  } finally {
    if (locked)
      await adminClient()
        .from("billing_customers")
        .update({ lock_token: null, lock_until: null })
        .eq("user_id", user.id)
        .eq("lock_token", lock);
  }
}
