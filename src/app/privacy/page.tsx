import Link from "next/link";
import { Logo } from "@/components/logo";
export const metadata = { title: "Privacy & usage data" };
export default function Page() {
  return (
    <main id="main" className="privacy-main">
      <Logo />
      <h1>Your learning data.</h1>
      <p>
        Pattern Lab stores your account details, code drafts, notes, and
        learning progress so you can return to your work across devices.
      </p>
      <h2>Usage and activity</h2>
      <p>
        We record client-reported learning page views, sign-ins, code-run reservations, draft and note saves, and
        authenticated API requests, including the feature accessed, outcome, and
        duration. Your account dashboard shows your usage. Designated platform
        administrators can see per-account usage to operate the service and
        investigate failures. These activity records do not contain your code or
        note text.
      </p>
      <h2>Accounts and payments</h2>
      <p>
        Supabase handles authentication and account storage. Your chosen
        identity provider handles social sign-in. Stripe handles checkout,
        invoices, payment methods, and subscription management. Pattern Lab
        stores billing identifiers and membership status; it does not receive or
        store full card details. Code is sent to an isolated execution
        environment when you run tests.
      </p>
      <h2>Your controls</h2>
      <p>
        You can update or clear saved drafts and notes in your workspace, and
        cancel renewals through Manage billing. Cancellation stops future
        renewals; it does not delete your account or saved work. Activity
        records are retained with your account. Deleting an account through the
        platform operator removes its associated learning, membership, and usage
        records; payment-provider records may be retained separately.
      </p>
      <Link className="button outline" href="/billing">
        Go to your account
      </Link>
      <Link className="text-link" href="/">
        Back to home
      </Link>
    </main>
  );
}
