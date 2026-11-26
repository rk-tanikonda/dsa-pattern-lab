import Link from "next/link";
import { requireAccount, isAdmin } from "@/lib/access";
import { adminClient } from "@/lib/supabase/admin";
import { billingReady } from "@/lib/billing";
import { plans, isPlan, runLimits } from "@/lib/plans";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { MembershipPlans } from "@/components/membership-plans";
import { AccountControls } from "@/components/account-controls";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Billing & usage",
  robots: { index: false, follow: false },
};
type Usage = {
  page_views: number;
  runs: number;
  runs_today: number;
  saves: number;
  notes: number;
  sign_ins: number;
  requests: number;
  failures: number;
  reset_at: string;
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { user, client } = await requireAccount();
  const { checkout } = await searchParams;
  const [membership, summary, recent] = await Promise.all([
    client
      .from("subscriptions")
      .select("status,plan,paid_until,cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    client.rpc("usage_summary"),
    client
      .from("usage_events")
      .select("id,event,resource,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const unavailable = !!membership.error || !!summary.error || !!recent.error;
  const sub = membership.data;
  const active =
    sub?.status === "active" && Date.parse(sub.paid_until) > Date.now();
  const usage = summary.data as Usage | null;
  let hasCustomer = false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const result = await adminClient()
      .from("billing_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    hasCustomer = !!result.data;
  }
  const activityLabel = (event: string, resource: string | null) =>
    event === "api_request"
      ? resource === "run"
        ? "Code run"
        : resource === "state"
          ? "Workspace opened"
          : resource?.startsWith("notes/")
            ? "Note save"
            : "Draft save"
      : {
          run_reserved: "Code run started",
          note_saved: "Note saved",
          draft_saved: "Draft saved",
          sign_in: "Signed in",
          page_view: "Page viewed",
        }[event] || "Account activity";
  const date = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      dateStyle: "medium",
      timeZone: "UTC",
    });
  return (
    <div className="membership-page">
      <header className="site-nav">
        <Logo />
        <div>
          <ThemeSwitch />
          {active && (
            <Link href="/learn" className="button primary small">
              Open workspace
            </Link>
          )}
        </div>
      </header>
      <main id="main" className="account-main">
        <div className="page-heading">
          <span className="eyebrow">YOUR MEMBERSHIP</span>
          <h1>Your space. Your pace.</h1>
          <p>
            {user.email || user.phone} · Billing, activity, and your next step.
          </p>
        </div>
        {checkout === "success" && !active && (
          <p className="notice" role="status">
            We’re waiting for payment confirmation. This page refreshes for one
            minute; use Refresh status if it takes longer. Access opens only
            after payment is verified.
          </p>
        )}
        {checkout === "canceled" && (
          <p className="notice">
            Checkout was canceled. You can choose a membership whenever you’re
            ready.
          </p>
        )}
        {unavailable && (
          <p className="form-error" role="alert">
            Membership and usage details are temporarily unavailable. Please
            retry shortly.
          </p>
        )}
        <section className="membership-status">
          <div>
            <span className="eyebrow">
              {active ? "MEMBERSHIP ACTIVE" : "WORKSPACE LOCKED"}
            </span>
            <h2>
              {active && isPlan(sub.plan)
                ? `${plans[sub.plan].name} membership`
                : "Make room for your next breakthrough."}
            </h2>
            <p>
              {active
                ? `${sub.cancel_at_period_end ? "Access ends" : "Paid through"} ${date(sub.paid_until)}. ${sub.cancel_at_period_end ? "Renewal is canceled." : "Manage invoices, payment details, or cancellation below."}`
                : "A paid membership unlocks every learning feature. Your account and billing stay available here."}
            </p>
          </div>
          {active && <span className="membership-seal">PRO</span>}
        </section>
        <AccountControls
          hasCustomer={hasCustomer}
          pending={checkout === "success" && !active}
        />
        {!active && (
          <MembershipPlans
            signedIn
            available={billingReady() && !unavailable}
          />
        )}
        <section className="usage-section">
          <div className="block-heading">
            <div>
              <h2>Your practice, at a glance.</h2>
              <p>
                This calendar month · UTC
                {usage ? ` · Resets ${date(usage.reset_at)}` : ""}
              </p>
            </div>
          </div>
          <div className="usage-grid">
            <article>
              <span>Code runs</span>
              <strong>
                {usage?.runs ?? "—"}
                <small> / {runLimits.month}</small>
              </strong>
              <progress
                value={usage?.runs ?? 0}
                max={runLimits.month}
                aria-label="Monthly code runs used"
              />
              <p>
                {usage
                  ? `${usage.runs_today} of ${runLimits.day} daily runs used`
                  : "Usage unavailable"}
              </p>
            </article>
            <article>
              <span>Drafts saved</span>
              <strong>{usage?.saves ?? "—"}</strong>
              <p>Save and run updates</p>
            </article>
            <article>
              <span>Notes saved</span>
              <strong>{usage?.notes ?? "—"}</strong>
              <p>Keep the ideas that click</p>
            </article>
            <article>
              <span>Sign-ins</span>
              <strong>{usage?.sign_ins ?? "—"}</strong>
              <p>Your returns to practice</p>
            </article>
          </div>
          <div className="activity-panel">
            <h3>Recent activity</h3>
            <p className="activity-summary">
              {usage?.page_views ?? 0} learning pages viewed this month.
            </p>
            {recent.data?.length ? (
              <ul>
                {recent.data.map((event) => (
                  <li key={event.id}>
                    <div>
                      <strong>
                        {activityLabel(event.event, event.resource)}
                      </strong>
                      <span>
                        {event.resource?.includes("/")
                          ? event.resource
                              .split("/")
                              .at(-1)
                              ?.replaceAll("-", " ")
                          : "Your workspace"}
                        {event.status
                          ? ` · ${event.status >= 400 ? "Unsuccessful" : event.status >= 200 ? "Completed" : "Started"}`
                          : ""}
                      </span>
                    </div>
                    <time dateTime={event.created_at}>
                      {date(event.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Your saved work and practice activity will appear here.</p>
            )}
          </div>
          <p className="pricing-footnote">
            We record page views, sign-ins, code-run reservations, saves, and
            API outcomes to show usage and operate the service. Activity records
            do not include your source code or note text.{" "}
            <Link href="/privacy">About your data</Link>
          </p>
        </section>
        {isAdmin(user.id) && (
          <Link className="text-link" href="/admin">
            Open platform usage
          </Link>
        )}
      </main>
    </div>
  );
}
