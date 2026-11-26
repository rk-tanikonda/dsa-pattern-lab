"use client";
import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Code2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { problems, patterns, getPattern } from "@/lib/catalog";
import { useLearning } from "./learning-provider";
export function ProblemLibrary({
  initialPattern = "all",
}: {
  initialPattern?: string;
}) {
  const [query, setQuery] = useState(""),
    [pattern, setPattern] = useState(initialPattern),
    [difficulty, setDifficulty] = useState("all"),
    [status, setStatus] = useState("all");
  const { state, error } = useLearning();
  const filtered = problems.filter(
    (p) =>
      (pattern === "all" || p.pattern === pattern) &&
      (difficulty === "all" || p.difficulty === difficulty) &&
      p.title.toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" ||
        (status === "solved"
          ? state.progress.some(
              (s) => s.problem_id === p.id && s.status === "solved",
            )
          : !state.progress.some(
              (s) => s.problem_id === p.id && s.status === "solved",
            ))),
  );
  function clear() {
    setQuery("");
    setPattern("all");
    setDifficulty("all");
    setStatus("all");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">A TOOLKIT FOR YOUR THINKING</span>
          <h1>The problem library.</h1>
          <p>Pick a challenge. Explore an idea. Make a connection.</p>
        </div>
        <span className="collection-badge">
          <Code2 size={19} />
          {problems.length} focused challenges
        </span>
      </div>
      {error && (
        <div className="notice" role="alert">
          Progress is unavailable: {error}
        </div>
      )}
      <div className="library-patterns">
        <button
          className={`filter-chip ${pattern === "all" ? "selected" : ""}`}
          onClick={() => setPattern("all")}
        >
          All patterns
        </button>
        {patterns.map((p) => (
          <button
            className={`filter-chip ${pattern === p.id ? "selected" : ""}`}
            key={p.id}
            onClick={() => setPattern(p.id)}
          >
            {p.title}
          </button>
        ))}
      </div>
      <div className="library-panel">
        <div className="library-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find your next challenge…"
              aria-label="Search problems"
            />
            {query && (
              <button
                className="icon-button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </label>
          <div>
            <label>
              <span className="sr-only">Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="all">All difficulties</option>
                <option>Easy</option>
                <option>Medium</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Progress</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All progress</option>
                <option value="solved">Solved</option>
                <option value="unsolved">To explore</option>
              </select>
            </label>
          </div>
        </div>
        <div className="library-table-header">
          <span>PROBLEM</span>
          <span>DIFFICULTY</span>
          <span>PRACTICE TIME</span>
        </div>
        <div className="problem-list">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/learn/problems/${p.id}`}
              className="problem-row"
            >
              <span
                className={`problem-status ${state.progress.some((s) => s.problem_id === p.id && s.status === "solved") ? "done" : ""}`}
              >
                {state.progress.some(
                  (s) => s.problem_id === p.id && s.status === "solved",
                ) ? (
                  <CheckCircle2 size={19} />
                ) : (
                  <Circle size={19} />
                )}
              </span>
              <span className="problem-title">
                <strong>{p.title}</strong>
                <small>{getPattern(p.pattern).title}</small>
              </span>
              <span className={`difficulty ${p.difficulty.toLowerCase()}`}>
                {p.difficulty}
              </span>
              <span className="problem-time">
                <Clock3 size={14} />
                {p.minutes} min
              </span>
              <Code2 size={17} />
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <h3>No problems found.</h3>
              <p>Try a different search or give another pattern a go.</p>
              <button className="button outline small" onClick={clear}>
                Clear filters
              </button>
            </div>
          )}
        </div>
        <div className="library-footer">
          Showing {filtered.length} of {problems.length} problems{" "}
          <span>Practice times are suggestions. Go at your own pace.</span>
        </div>
      </div>
      <div className="library-tip">
        <SlidersHorizontal size={20} />
        <p>
          <strong>Start with understanding.</strong> If a problem feels
          unfamiliar, visit its pattern first. A little context goes a long way.
        </p>
        <Link href="/learn/patterns" className="text-link">
          Explore patterns
        </Link>
      </div>
    </>
  );
}
