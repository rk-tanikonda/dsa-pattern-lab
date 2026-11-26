import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="standalone-state">
      <span className="eyebrow">A SMALL DETOUR</span>
      <h1>This page isn’t in the pattern.</h1>
      <p>Let’s get you back to something worth exploring.</p>
      <Link className="button dark" href="/learn">
        Back to the lab
      </Link>
    </main>
  );
}
