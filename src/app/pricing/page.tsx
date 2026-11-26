import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { MembershipPlans } from "@/components/membership-plans";
export const metadata = {
  title: "Membership",
  description:
    "All of Pattern Lab, from ₹499/month. Choose monthly or annual membership.",
};
export default function Page() {
  return (
    <div className="membership-page">
      <header className="site-nav">
        <Logo />
        <div>
          <ThemeSwitch />
          <Link href="/login" className="button outline small">
            Log in
          </Link>
        </div>
      </header>
      <main id="main" className="membership-main">
        <div className="membership-intro">
          <span className="eyebrow">A LITTLE CONSISTENCY GOES A LONG WAY</span>
          <h1>
            Invest in your next
            <br />
            <em>“I get it.”</em>
          </h1>
          <p>
            One complete workspace. Two ways to make it yours.
            <br />
            Choose the pace that feels right for you.
          </p>
        </div>
        <MembershipPlans />
        <section className="membership-faq">
          <h2>A few things to know.</h2>
          <details>
            <summary>What do I get access to?</summary>
            <p>
              Both plans unlock the current collection of 12 challenges across 6
              patterns, the editor, test execution, hints, explanations, notes,
              progress tracking, and your usage dashboard.
            </p>
          </details>
          <details>
            <summary>Can I cancel my membership?</summary>
            <p>
              Yes. Use Manage billing to cancel renewal. Your workspace stays
              available through your paid period. Your saved work remains in
              your account if you return.
            </p>
          </details>
          <details>
            <summary>What counts as a code run?</summary>
            <p>
              One submitted solution tested against all test cases counts as one
              run. Compile errors, incorrect solutions, timeouts, and reserved
              runs that encounter an execution error count toward the allowance.
              Saving drafts and notes does not use your code-run allowance.
            </p>
          </details>
          <details>
            <summary>Do I need to install anything?</summary>
            <p>
              No. Write and test Go, Python, or JavaScript in your browser. Your
              drafts and notes are saved to your account when you choose Save.
            </p>
          </details>
        </section>
      </main>
      <footer className="site-footer">
        <Logo />
        <span>A calmer place to get better.</span>
        <Link href="/privacy">Privacy & usage data</Link>
      </footer>
    </div>
  );
}
