"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import { plans, type Plan } from "@/lib/plans";
export function MembershipPlans({
  signedIn = false,
  available = true,
}: {
  signedIn?: boolean;
  available?: boolean;
}) {
  const [busy, setBusy] = useState<Plan | null>(null),
    [error, setError] = useState("");
  async function checkout(plan: Plan) {
    setBusy(plan);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (response.status === 401) {
        location.assign("/login");
        return;
      }
      if (!response.ok || !data.url)
        throw new Error(data.error || "Could not open checkout.");
      location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open checkout.");
      setBusy(null);
    }
  }
  return (
    <>
      <div className="plan-grid">
        {(Object.entries(plans) as [Plan, (typeof plans)[Plan]][]).map(
          ([id, plan]) => (
            <article
              className={`plan-card ${id === "annual" ? "featured" : ""}`}
              key={id}
            >
              <div className="plan-heading">
                <span className="eyebrow">{plan.name}</span>
                {id === "annual" && (
                  <span className="plan-badge">
                    <Sparkles size={14} /> Save 33%
                  </span>
                )}
              </div>
              <h2>
                {plan.display}
                <span> / {plan.interval}</span>
              </h2>
              <p>{plan.description}</p>
              <div className="plan-billing">
                {id === "annual"
                  ? "₹333.25/month, billed ₹3,999 yearly"
                  : "₹499 billed monthly"}{" "}
                · INR
              </div>
              <ul>
                {[
                  "All 12 challenges & 6 learning patterns",
                  "Go, Python & JavaScript workspace",
                  "500 code runs per calendar month",
                  "Cloud-saved drafts, progress & notes",
                  "Hints, explanations & test feedback",
                  "Your usage dashboard & billing controls",
                ].map((feature) => (
                  <li key={feature}>
                    <Check size={17} />
                    {feature}
                  </li>
                ))}
              </ul>
              {signedIn ? (
                <button
                  className={`button full ${id === "annual" ? "primary" : "outline"}`}
                  disabled={!!busy || !available}
                  onClick={() => checkout(id)}
                >
                  {busy === id && <LoaderCircle size={17} className="spin" />}
                  {available ? `Choose ${plan.name}` : "Payments opening soon"}
                </button>
              ) : (
                <Link
                  href="/signup"
                  className={`button full ${id === "annual" ? "primary" : "outline"}`}
                >
                  Get started with {plan.name}
                </Link>
              )}
              <small>Auto-renews. Cancel future renewals anytime.</small>
            </article>
          ),
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="pricing-footnote">
        Every feature, on either plan. No free tier or trial. Runs are limited
        to 5 per minute and 50 per day within your monthly allowance; limits
        reset in UTC. Final taxes, if applicable, are shown at checkout.
      </p>
    </>
  );
}
