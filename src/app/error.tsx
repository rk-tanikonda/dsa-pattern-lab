"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div id="main" className="standalone-state">
      <h1>A little interruption.</h1>
      <p>This page couldn’t load. Give it another try.</p>
      <button className="button dark" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
