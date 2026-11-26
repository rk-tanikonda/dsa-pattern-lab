export default function Loading() {
  return (
    <div
      className="page-skeleton"
      role="status"
      aria-label="Loading your workspace"
    >
      <div />
      <div />
      <div />
      <span className="sr-only">Loading your workspace…</span>
    </div>
  );
}
