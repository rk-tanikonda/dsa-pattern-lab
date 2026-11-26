import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeClient, syncSubscription } from "@/lib/billing";
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY)
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 },
    );
  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1024 * 1024) {
          await reader.cancel();
          return new NextResponse(null, { status: 413 });
        }
        chunks.push(value);
      }
    event = stripe.webhooks.constructEvent(
      Buffer.concat(chunks),
      request.headers.get("stripe-signature") ?? "",
      secret,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature or payload." },
      { status: 400 },
    );
  }
  try {
    if (event.type.startsWith("customer.subscription.")) {
      await syncSubscription(
        stripe,
        (event.data.object as Stripe.Subscription).id,
        event.created,
      );
    } else if (
      [
        "invoice.paid",
        "invoice.payment_failed",
        "invoice.payment_action_required",
        "invoice.voided",
        "invoice.marked_uncollectible",
      ].includes(event.type)
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      if (subscription)
        await syncSubscription(
          stripe,
          typeof subscription === "string" ? subscription : subscription.id,
          event.created,
        );
    }
    return NextResponse.json({ received: true });
  } catch {
    // Non-2xx makes Stripe retry; never acknowledge an unpersisted entitlement.
    return NextResponse.json(
      { error: "Subscription update failed. Please retry delivery." },
      { status: 500 },
    );
  }
}
