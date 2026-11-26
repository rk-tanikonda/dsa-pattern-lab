"use client";
import Link from "next/link";
import {
  Braces,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Code2,
  Flame,
  Layers3,
  NotebookPen,
  Play,
  Sparkles,
  Target,
} from "lucide-react";
import { patterns, problems, getPattern } from "@/lib/catalog";
import { useLearning } from "./learning-provider";
export function Dashboard() {
  const { state, name, signedIn, loading, error, refresh } = useLearning();
  const solved = state.progress.filter((p) => p.status === "solved");
  const current =
    problems.find((p) =>
      state.progress.some(
        (v) => v.problem_id === p.id && v.status === "in_progress",
      ),
    ) ||
    problems.find((p) => !solved.some((v) => v.problem_id === p.id)) ||
    problems[0];
  const completedPatterns = patterns.filter((p) =>
    problems
      .filter((q) => q.pattern === p.id)
      .every((q) => solved.some((v) => v.problem_id === q.id)),
  ).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR DAILY DOSE OF DISCOVERY</span>
          <h1>
            {signedIn
              ? `Welcome back, ${name.split(" ")[0]}.`
              : "Good things start with curiosity."}{" "}
            <span className="hello-spark">✳</span>
          </h1>
          <p>One pattern. One breakthrough. A little better than yesterday.</p>
        </div>
        <Link href="/learn/patterns" className="button outline small">
          <Layers3 size={16} />
          View learning path
        </Link>
      </div>
      {!signedIn && (
        <div className="preview-banner">
          <Sparkles size={18} />
          <span>
            You’re exploring the lab. Create an account to keep your progress,
            code, and notes.
          </span>
          <Link href="/signup">Make it yours</Link>
        </div>
      )}
      {error && (
        <div className="notice error-notice" role="alert">
          {error}
          <button className="text-button" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      )}
      <section
        className="dashboard-stats"
        aria-label="Your learning statistics"
      >
        {[
          {
            label: "Problems solved",
            value: solved.length,
            total: `/ ${problems.length}`,
            icon: CheckCircle2,
            color: "green",
            caption: "Every solution is a step forward",
          },
          {
            label: "Patterns understood",
            value: completedPatterns,
            total: `/ ${patterns.length}`,
            icon: Layers3,
            color: "purple",
            caption: "Finish a pattern’s two challenges",
          },
          {
            label: "Notes collected",
            value: state.notes.filter((n) => n.body.trim()).length,
            total: "insights",
            icon: NotebookPen,
            color: "orange",
            caption: "Your own words. Your understanding.",
          },
        ].map((s) => (
          <article className="stat-card" key={s.label}>
            <div>
              <span>{s.label}</span>
              <span className={`stat-icon ${s.color}`}>
                <s.icon size={19} />
              </span>
            </div>
            <strong>
              {loading ? "—" : s.value}
              <small>{s.total}</small>
            </strong>
            <p>{s.caption}</p>
          </article>
        ))}
      </section>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="continue-card">
            <div className="continue-copy">
              <span className="eyebrow">
                <span className="live-dot" />
                {state.progress.length
                  ? "KEEP THE MOMENTUM"
                  : "YOUR FIRST BREAKTHROUGH"}
              </span>
              <h2>{current.title}</h2>
              <p>
                {getPattern(current.pattern).tagline}
                <br />A focused challenge. A useful way to think.
              </p>
              <div className="continue-meta">
                <span>{current.difficulty}</span>
                <span>
                  <Clock3 size={14} />
                  {current.minutes} min practice
                </span>
                <span>{getPattern(current.pattern).title}</span>
              </div>
              <Link
                href={`/learn/problems/${current.id}`}
                className="button primary small"
              >
                <Play size={16} />
                {state.progress.length
                  ? "Continue practicing"
                  : "Start practicing"}
              </Link>
            </div>
            <div className="continue-art" aria-hidden="true">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <span className="bracket">{"{"}</span>
              <span className="orbit-core">
                <Braces size={42} />
              </span>
              <span className="bracket">{"}"}</span>
              <span className="orbit-label top">think.</span>
              <span className="orbit-label bottom">connect.</span>
            </div>
          </section>
          <section className="path-section">
            <div className="block-heading">
              <div>
                <h2>Your learning path</h2>
                <p>Build the foundation. Then build on it.</p>
              </div>
              <Link className="text-link" href="/learn/patterns">
                View all patterns
              </Link>
            </div>
            <div className="path-cards">
              {patterns.slice(0, 3).map((p, i) => {
                const count = solved.filter(
                  (s) =>
                    problems.find((q) => q.id === s.problem_id)?.pattern ===
                    p.id,
                ).length;
                return (
                  <Link
                    key={p.id}
                    href={`/learn/problems?pattern=${p.id}`}
                    className="path-card"
                  >
                    <div>
                      <span className={`pattern-icon ${p.color}`}>
                        <Layers3 size={22} />
                      </span>
                      <span className="chapter-label">
                        CHAPTER {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3>{p.title}</h3>
                    <p>{p.tagline}</p>
                    <div className="progress-track">
                      <span style={{ width: `${count * 50}%` }} />
                    </div>
                    <div className="path-card-bottom">
                      <span>{count} / 2 completed</span>
                      <span>
                        {count === 2 ? (
                          <Check size={16} />
                        ) : count ? (
                          "In progress"
                        ) : (
                          "Ready to explore"
                        )}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
          <section>
            <div className="block-heading">
              <div>
                <h2>A little practice goes a long way</h2>
                <p>Small challenges, lasting connections.</p>
              </div>
              <Link className="text-link" href="/learn/problems">
                Browse library
              </Link>
            </div>
            <div className="problem-list compact">
              {problems.slice(0, 4).map((p, i) => (
                <Link
                  className="problem-row"
                  key={p.id}
                  href={`/learn/problems/${p.id}`}
                >
                  <span
                    className={`problem-status ${solved.some((s) => s.problem_id === p.id) ? "done" : ""}`}
                  >
                    {solved.some((s) => s.problem_id === p.id) ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <Circle size={18} />
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
            </div>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="intention-card">
            <span className="card-kicker">
              <Target size={17} /> A LITTLE INTENTION
            </span>
            <h3>
              Make today <br />a thinking day.
            </h3>
            <p>
              A good session isn’t about solving ten problems. It’s about
              understanding one.
            </p>
            <div className="intention-check">
              <CheckCircle2 size={18} />
              <span>Read the problem carefully</span>
            </div>
            <div className="intention-check">
              <Circle size={18} />
              <span>Try the simplest approach</span>
            </div>
            <div className="intention-check">
              <Circle size={18} />
              <span>Write down what clicked</span>
            </div>
            <Link
              href={`/learn/problems/${current.id}`}
              className="button outline full small"
            >
              Start a focused session
            </Link>
          </section>
          <section className="notebook-card">
            <div className="block-heading">
              <span className="pattern-icon purple">
                <NotebookPen size={21} />
              </span>
              <span className="tag">YOUR SECOND BRAIN</span>
            </div>
            <h3>Save the “aha.”</h3>
            <p>
              The edge case you missed. The idea that worked. The question to
              come back to.
            </p>
            <div className="note-preview">
              {state.notes.find((n) => n.body.trim())?.body.slice(0, 150) ||
                "“What changed in the way I thought about this problem?”"}
            </div>
            <Link className="text-link" href="/learn/notes">
              Open my notebook
            </Link>
          </section>
          <div className="quiet-quote">
            <span>“</span>
            <p>
              Give an idea time to become familiar. Understanding grows with
              attention.
            </p>
            <small>A reminder to stay curious.</small>
          </div>
        </aside>
      </div>
    </>
  );
}
