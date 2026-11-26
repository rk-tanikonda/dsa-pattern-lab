"use client";
import Link from "next/link";
import { CheckCircle2, Circle, Layers3 } from "lucide-react";
import { patterns, problems } from "@/lib/catalog";
import { useLearning } from "./learning-provider";
export function PatternPath() {
  const { state } = useLearning();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">UNDERSTAND THE WHY</span>
          <h1>Patterns, not memorization.</h1>
          <p>Six ways of thinking. A foundation you can keep building on.</p>
        </div>
        <span className="collection-badge">
          <Layers3 size={19} />
          Your foundation path
        </span>
      </div>
      <div className="pattern-path">
        {patterns.map((p, i) => {
          const items = problems.filter((q) => q.pattern === p.id);
          return (
            <section className="pattern-chapter" key={p.id}>
              <div className="chapter-rail">
                <span>{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="chapter-content">
                <div className="chapter-intro">
                  <span className={`pattern-icon ${p.color}`}>
                    <Layers3 size={25} />
                  </span>
                  <div>
                    <span className="eyebrow">
                      {i < 2
                        ? "BUILD YOUR FOUNDATION"
                        : i < 4
                          ? "CONNECT THE IDEAS"
                          : "GO A LITTLE DEEPER"}
                    </span>
                    <h2>{p.title}</h2>
                    <p>{p.description}</p>
                  </div>
                </div>
                <div className="chapter-problems">
                  {items.map((q) => (
                    <Link key={q.id} href={`/learn/problems/${q.id}`}>
                      <span>
                        {state.progress.some(
                          (s) => s.problem_id === q.id && s.status === "solved",
                        ) ? (
                          <CheckCircle2 size={18} className="success-text" />
                        ) : (
                          <Circle size={18} />
                        )}
                        <strong>{q.title}</strong>
                      </span>
                      <span
                        className={`difficulty ${q.difficulty.toLowerCase()}`}
                      >
                        {q.difficulty}
                      </span>
                      <small>{q.minutes} min</small>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <div className="path-finish">
        <span>✳</span>
        <h3>Understanding is a practice, too.</h3>
        <p>
          Revisit a problem without looking at your code. Explain the idea to
          someone. Notice what sticks.
        </p>
      </div>
    </>
  );
}
