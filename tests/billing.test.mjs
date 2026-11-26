import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { subscriptionEntitlement } from "../src/lib/billing-policy.ts";
const prices = { monthly: "price_month", annual: "price_year" };
const subscription = {
  status: "active",
  items: {
    data: [{ price: { id: "price_month" }, current_period_end: 4070908800 }],
  },
  latest_invoice: { status: "paid", amount_paid: 49900 },
};
test("only a positive paid invoice on an active configured subscription grants time", () => {
  assert.equal(
    subscriptionEntitlement(subscription, prices).paidUntil,
    "2099-01-01T00:00:00.000Z",
  );
  for (const invoice of [
    null,
    "in_123",
    { status: "open", amount_paid: 49900 },
    { status: "paid", amount_paid: 0 },
  ]) {
    assert.equal(
      subscriptionEntitlement(
        { ...subscription, latest_invoice: invoice },
        prices,
      ).paidUntil,
      "1970-01-01T00:00:00.000Z",
    );
  }
  for (const status of [
    "trialing",
    "past_due",
    "canceled",
    "incomplete",
    "unpaid",
    "paused",
  ]) {
    assert.equal(
      subscriptionEntitlement({ ...subscription, status }, prices).paidUntil,
      "1970-01-01T00:00:00.000Z",
    );
  }
  assert.throws(() =>
    subscriptionEntitlement(subscription, {
      monthly: "other",
      annual: "other",
    }),
  );
  assert.throws(() =>
    subscriptionEntitlement({ ...subscription, items: { data: [] } }, prices),
  );
  assert.throws(() =>
    subscriptionEntitlement(
      {
        ...subscription,
        items: {
          data: [...subscription.items.data, ...subscription.items.data],
        },
      },
      prices,
    ),
  );
});
test("signed webhook payloads reject tampering, wrong secrets and stale signatures", () => {
  const stripe = new Stripe("sk_test_fixture"),
    secret = "whsec_fixture";
  const payload = JSON.stringify({
    id: "evt_test",
    type: "invoice.paid",
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: "in_1" } },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(
    stripe.webhooks.constructEvent(payload, header, secret).id,
    "evt_test",
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload + " ", header, secret),
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload, header, "whsec_wrong"),
  );
  const old = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp: 1,
  });
  assert.throws(() => stripe.webhooks.constructEvent(payload, old, secret));
});
