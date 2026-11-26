import "server-only";
import Stripe from "stripe";
import { plans, type Plan } from "./plans";
import { adminClient } from "./supabase/admin";
import { subscriptionEntitlement } from "./billing-policy";

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("Payments are not configured yet.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 1,
    timeout: 15_000,
  });
}
export function priceId(plan: Plan) {
  return plan === "monthly"
    ? process.env.STRIPE_MONTHLY_PRICE_ID
    : process.env.STRIPE_ANNUAL_PRICE_ID;
}
export function billingReady() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_MONTHLY_PRICE_ID &&
    process.env.STRIPE_ANNUAL_PRICE_ID &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.APP_URL,
  );
}
export function appOrigin() {
  if (!process.env.APP_URL)
    throw new Error("The application URL is not configured.");
  return new URL(process.env.APP_URL).origin;
}
export async function validatePrice(stripe: Stripe, plan: Plan) {
  const id = priceId(plan);
  if (!id)
    throw new Error("This membership is not available for checkout yet.");
  const price = await stripe.prices.retrieve(id);
  if (
    !price.active ||
    price.currency !== "inr" ||
    price.unit_amount !== plans[plan].amount ||
    price.recurring?.interval !== plans[plan].interval ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed"
  ) {
    throw new Error(
      "The payment price does not match the displayed membership. Please contact support.",
    );
  }
  return id;
}

export async function syncSubscription(
  stripe: Stripe,
  subscriptionId: string,
  eventCreated: number,
) {
  // Read current state instead of trusting an old webhook snapshot.
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice"],
  });
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const db = adminClient();
  const { data: customer, error } = await db
    .from("billing_customers")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!customer) throw new Error("Unknown subscription customer.");
  const { plan, paidUntil } = subscriptionEntitlement(sub, {
    monthly: priceId("monthly"),
    annual: priceId("annual"),
  });
  const { error: syncError } = await db.rpc("sync_subscription", {
    p_user: customer.user_id,
    p_subscription: sub.id,
    p_status: sub.status,
    p_plan: plan,
    p_paid_until: paidUntil,
    p_cancel: sub.cancel_at_period_end,
    p_created: eventCreated,
  });
  if (syncError) throw syncError;
}
