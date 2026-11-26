import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAccount, isAdmin } from "@/lib/access";
import { adminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Platform usage",
  robots: { index: false, follow: false },
};
type Row = {
  id: string;
  email: string | null;
  phone: string | null;
  plan: string | null;
  status: string | null;
  paid_until: string | null;
  page_views: number;
  runs: number;
  requests: number;
  failures: number;
  saves: number;
  notes: number;
  sign_ins: number;
  last_active: string | null;
};
export default async function Page() {
  const { user } = await requireAccount();
  if (!isAdmin(user.id)) notFound();
  const { data, error } = await adminClient().rpc("admin_usage_summary");
  if (error) throw new Error("Platform usage is temporarily unavailable.");
  const rows = data as Row[];
  const paid = rows.filter(
    (r) =>
      r.status === "active" &&
      r.paid_until &&
      Date.parse(r.paid_until) > Date.now(),
  ).length;
  return (
    <main id="main" className="account-main">
      <Logo />
      <div className="page-heading">
        <span className="eyebrow">PLATFORM OPERATIONS</span>
        <h1>Every account. A clear picture.</h1>
        <p>
          Calendar-month usage in UTC. Only designated administrators can view
          this page.
        </p>
      </div>
      <div className="usage-grid">
        <article>
          <span>Accounts</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Paid members</span>
          <strong>{paid}</strong>
        </article>
        <article>
          <span>Code runs</span>
          <strong>{rows.reduce((n, r) => n + r.runs, 0)}</strong>
        </article>
        <article>
          <span>Failed API requests</span>
          <strong>{rows.reduce((n, r) => n + r.failures, 0)}</strong>
        </article>
      </div>
      <div className="admin-table">
        <table>
          <caption>Usage for every registered account this month</caption>
          <thead>
            <tr>
              {[
                "Account",
                "Membership",
                "Runs",
                "Page views",
                "Requests",
                "Errors",
                "Saves",
                "Notes",
                "Sign-ins",
                "Last active (UTC)",
              ].map((v) => (
                <th key={v} scope="col">
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.email || r.phone || r.id}</td>
                <td>
                  {r.plan || "No plan"} · {r.status || "unpaid"}
                </td>
                <td>{r.runs}</td>
                <td>{r.page_views}</td>
                <td>{r.requests}</td>
                <td>{r.failures}</td>
                <td>{r.saves}</td>
                <td>{r.notes}</td>
                <td>{r.sign_ins}</td>
                <td>
                  {r.last_active
                    ? new Date(r.last_active)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 16)
                    : "No activity"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/billing" className="text-link">
        Back to your account
      </Link>
    </main>
  );
}
