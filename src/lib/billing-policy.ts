import type Stripe from "stripe";
// Pure policy shared by the webhook and its boundary tests.
export function subscriptionEntitlement(
  sub: Stripe.Subscription,
  prices: { monthly?: string; annual?: string },
): { plan: "monthly" | "annual"; paidUntil: string } {
  const item = sub.items.data[0];
  const plan =
    item && prices.monthly && item.price.id === prices.monthly
      ? "monthly"
      : item && prices.annual && item.price.id === prices.annual
        ? "annual"
        : null;
  if (!plan || sub.items.data.length !== 1)
    throw new Error("Unknown subscription price.");
  const invoice =
    sub.latest_invoice && typeof sub.latest_invoice !== "string"
      ? sub.latest_invoice
      : null;
  const paid =
    sub.status === "active" &&
    invoice?.status === "paid" &&
    invoice.amount_paid > 0;
  return {
    plan,
    paidUntil: new Date(
      paid ? item.current_period_end * 1000 : 0,
    ).toISOString(),
  };
}
