import Link from "next/link";
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="brand" aria-label="Pattern Lab home">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span>
          pattern<span className="brand-light">lab</span>
          <span className="brand-period">.</span>
        </span>
      )}
    </Link>
  );
}
