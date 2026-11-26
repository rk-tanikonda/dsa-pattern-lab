import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { appOrigin, stripeClient } from "@/lib/billing";
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
      { error: "Please sign in first." },
      { status: 401 },
    );
  try {
    const { data, error } = await adminClient()
      .from("billing_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return NextResponse.json(
        { error: "Choose a membership to set up your billing account." },
        { status: 404 },
      );
    const session = await stripeClient().billingPortal.sessions.create({
      customer: data.customer_id,
      return_url: `${appOrigin()}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Billing management is temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }
}
