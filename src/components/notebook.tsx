"use client";
import Link from "next/link";
import { useState } from "react";
import { Download, NotebookPen, Search, BookOpen } from "lucide-react";
import { getProblem, getPattern } from "@/lib/catalog";
import { useLearning } from "./learning-provider";
export function Notebook() {
  const { state, signedIn, loading, error } = useLearning();
  const [query, setQuery] = useState("");
  const notes = state.notes
    .filter(
      (n) =>
        n.body.trim() &&
        `${getProblem(n.problem_id)?.title} ${n.body}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const reviews = state.progress.filter((p) => p.status === "review");
  function download() {
    const content = state.notes
      .filter((n) => n.body.trim())
      .map(
        (n) =>
          `# ${getProblem(n.problem_id)?.title || n.problem_id}\n\n${n.body}\n`,
      )
      .join("\n---\n\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "pattern-lab-notebook.md";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">KEEP WHAT CLICKS</span>
          <h1>Your second brain.</h1>
          <p>
            The ideas, mistakes, and little discoveries that make the learning
            yours.
          </p>
        </div>
        <button
          className="button outline small"
          onClick={download}
          disabled={!state.notes.some((n) => n.body.trim())}
        >
          <Download size={16} />
          Export Markdown
        </button>
      </div>
      {error && (
        <div className="notice" role="alert">
          {error}
        </div>
      )}
      {!signedIn && (
        <div className="preview-banner">
          <NotebookPen size={18} />
          <span>
            Your notebook is private to your account. Start a problem to explore
            the note editor.
          </span>
          <Link href="/signup">Create account</Link>
        </div>
      )}
      {reviews.length > 0 && (
        <section className="review-strip">
          <BookOpen size={20} />
          <strong>Worth another look</strong>
          {reviews.map((p) => (
            <Link href={`/learn/problems/${p.problem_id}`} key={p.problem_id}>
              {getProblem(p.problem_id)?.title}
            </Link>
          ))}
        </section>
      )}
      <div className="notebook-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search notes"
            placeholder="Find an idea, a problem, a breakthrough…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span>
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </div>
      {loading ? (
        <div className="empty-state">Opening your notebook…</div>
      ) : notes.length ? (
        <div className="note-grid">
          {notes.map((n) => {
            const p = getProblem(n.problem_id);
            return (
              <Link
                className="note-card"
                href={`/learn/problems/${n.problem_id}`}
                key={n.problem_id}
              >
                <span className="eyebrow">
                  {p ? getPattern(p.pattern).title : "YOUR NOTES"}
                </span>
                <h2>{p?.title || n.problem_id}</h2>
                <p>{n.body}</p>
                <footer>
                  <span>
                    Edited{" "}
                    {new Date(n.updated_at).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                  <NotebookPen size={17} />
                </footer>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="notebook-empty">
          <div className="empty-notebook-art">
            <NotebookPen size={54} strokeWidth={1.2} />
            <span>aha!</span>
          </div>
          <span className="eyebrow">
            {query ? "NOTHING HERE YET" : "A BLANK PAGE IS A GOOD START"}
          </span>
          <h2>
            {query ? "No matching notes." : "Your next insight belongs here."}
          </h2>
          <p>
            {query
              ? "Try a different word or clear the search."
              : "Open a challenge and use My notes to capture your approach, the edge case you missed, or the moment it all made sense."}
          </p>
          {query ? (
            <button className="button outline" onClick={() => setQuery("")}>
              Clear search
            </button>
          ) : (
            <Link href="/learn/problems/two-sum" className="button dark">
              Start with Two Sum
            </Link>
          )}
        </div>
      )}
    </>
  );
}
