"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Code2,
  FileCode2,
  FlaskConical,
  Lightbulb,
  LoaderCircle,
  NotebookPen,
  Play,
  RotateCcw,
  Save,
  XCircle,
} from "lucide-react";
import {
  type Problem,
  type Language,
  getPattern,
  problems,
} from "@/lib/catalog";
import { useLearning } from "./learning-provider";
import { ConfirmDialog } from "./confirm-dialog";
const CodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => <div className="editor-loading">Preparing your editor…</div>,
});
type RunResult = {
  passed: number;
  total: number;
  saved: boolean;
  warning: string;
  summary: string;
  cases: {
    passed: boolean;
    input: unknown;
    expected: unknown;
    actual: string;
    message: string;
  }[];
};
const noteTemplate =
  "## My approach\n\n\n## What clicked\n\n\n## Edge cases & mistakes\n\n\n## Time & space complexity\n\n";
export function PracticeWorkspace({ problem }: { problem: Problem }) {
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null,
  );
  const [pendingReset, setPendingReset] = useState(false);
  const {
    state,
    signedIn,
    loading,
    error: loadError,
    request,
    refresh,
  } = useLearning();
  const [language, setLanguage] = useState<Language>("go"),
    [drafts, setDrafts] = useState<Record<Language, string>>({
      ...problem.starters,
    }),
    [note, setNote] = useState(""),
    [tab, setTab] = useState<"problem" | "notes">("problem"),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState<RunResult | null>(null),
    [dirtyLanguages, setDirtyLanguages] = useState<Language[]>([]),
    [noteDirty, setNoteDirty] = useState(false);
  const dirty = dirtyLanguages.length > 0;
  const markDirty = () =>
    setDirtyLanguages((items) =>
      items.includes(language) ? items : [...items, language],
    );
  const markSaved = () =>
    setDirtyLanguages((items) => items.filter((item) => item !== language));
  const initialized = useRef(false),
    edited = useRef(false),
    noteEdited = useRef(false);
  useEffect(() => {
    if (loading || loadError || initialized.current) return;
    initialized.current = true;
    const saved = state.progress.find((p) => p.problem_id === problem.id);
    if (saved && !edited.current) {
      setLanguage(saved.language);
      setDrafts((d) => ({ ...d, [saved.language]: saved.code }));
    }
    const savedNote = state.notes.find((n) => n.problem_id === problem.id);
    if (savedNote && !noteEdited.current) setNote(savedNote.body);
  }, [loading, loadError, state, problem.id]);
  useEffect(() => {
    function protect(e: BeforeUnloadEvent) {
      if (dirty || noteDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    function navigate(event: MouseEvent) {
      if (!dirty && !noteDirty) return;
      const anchor = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation(
        destination.pathname + destination.search + destination.hash,
      );
    }
    window.addEventListener("beforeunload", protect);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", protect);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, noteDirty]);
  function editCode(value: string) {
    edited.current = true;
    setDrafts((d) => ({ ...d, [language]: value }));
    markDirty();
    setMessage("");
  }
  function editNote(value: string) {
    noteEdited.current = true;
    setNote(value);
    setNoteDirty(true);
    setMessage("");
  }
  async function action(kind: "draft" | "note" | "run" | "review") {
    if (busy || loading) return;
    setError("");
    setMessage("");
    if (!signedIn) {
      setError("Create an account or sign in to save your work and run tests.");
      return;
    }
    setBusy(kind);
    try {
      if (kind === "run") {
        setResult(null);
        const data = await request<RunResult>("run", "POST", {
          problem_id: problem.id,
          language,
          code: drafts[language],
        });
        setResult(data);
        if (data.saved) {
          markSaved();
          setMessage(
            data.passed === data.total
              ? "Nice work. Every test passed, and your progress is saved."
              : "Results are ready. Your code and progress are saved.",
          );
        } else setError(data.warning);
      } else if (kind === "note") {
        await request(`notes/${problem.id}`, "PUT", { body: note });
        setNoteDirty(false);
        setMessage("Your insight is saved to your notebook.");
      } else {
        await request(`progress/${problem.id}`, "PUT", {
          code: drafts[language],
          language,
          status: kind === "review" ? "review" : "in_progress",
        });
        markSaved();
        setMessage(
          kind === "review"
            ? "Added to your review list."
            : "Your code is saved.",
        );
      }
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }
  const next = problems[problems.findIndex((p) => p.id === problem.id) + 1];
  return (
    <div className="practice-workspace">
      <ConfirmDialog
        open={pendingNavigation !== null || pendingReset}
        title={
          pendingReset
            ? "Start with a clean page?"
            : "Keep your next breakthrough."
        }
        description={
          pendingReset
            ? "This replaces the current language’s code with its starter. Your other language drafts and notes stay here."
            : "You have unsaved code or notes. Keep working to save them, or leave and discard these changes."
        }
        confirmLabel={pendingReset ? "Reset code" : "Leave without saving"}
        onCancel={() => {
          setPendingNavigation(null);
          setPendingReset(false);
        }}
        onConfirm={() => {
          if (pendingReset) {
            editCode(problem.starters[language]);
            setPendingReset(false);
          } else if (pendingNavigation) {
            const path = pendingNavigation;
            setPendingNavigation(null);
            setDirtyLanguages([]);
            setNoteDirty(false);
            router.push(path);
          }
        }}
      />
      <div className="practice-topbar">
        <Link href="/learn/problems">
          <ChevronLeft size={17} />
          Problem library
        </Link>
        <span>{getPattern(problem.pattern).title}</span>
        {next && <Link href={`/learn/problems/${next.id}`}>Next problem</Link>}
      </div>
      {loadError && (
        <div className="workspace-message error" role="alert">
          {loadError}{" "}
          <button className="text-button" onClick={() => void refresh()}>
            Retry loading saved work
          </button>
        </div>
      )}
      <div className="practice-grid">
        <section className="problem-pane">
          <div className="pane-tabs">
            <button
              className={tab === "problem" ? "active" : ""}
              onClick={() => setTab("problem")}
            >
              <BookOpen size={16} />
              The challenge
            </button>
            <button
              className={tab === "notes" ? "active" : ""}
              onClick={() => setTab("notes")}
            >
              <NotebookPen size={16} />
              My notes{noteDirty && <span className="unsaved-dot" />}
            </button>
          </div>
          {tab === "problem" ? (
            <div className="problem-description">
              <span className="eyebrow">
                CHALLENGE {String(problem.order).padStart(2, "0")}
              </span>
              <h1>{problem.title}</h1>
              <div className="problem-tags">
                <span
                  className={`difficulty ${problem.difficulty.toLowerCase()}`}
                >
                  {problem.difficulty}
                </span>
                <span>
                  <Clock3 size={14} />
                  {problem.minutes} min
                </span>
                {state.progress.some(
                  (p) => p.problem_id === problem.id && p.status === "solved",
                ) && (
                  <span className="success-text">
                    <CheckCircle2 size={15} />
                    Solved
                  </span>
                )}
              </div>
              <p>{problem.description}</p>
              <h3>An example</h3>
              <div className="example-block">
                <span>INPUT</span>
                <pre>{JSON.stringify(problem.example.input, null, 2)}</pre>
                <span>OUTPUT</span>
                <pre>{JSON.stringify(problem.example.output)}</pre>
              </div>
              <h3>What to return</h3>
              <p>{problem.output}</p>
              <h3>Keep in mind</h3>
              <p>{problem.constraints}</p>
              <div className="input-contract">
                <Code2 size={18} />
                <p>
                  The starter reads one JSON object from standard input and
                  writes your return value as JSON. Focus on the{" "}
                  <code>solve</code> function.
                </p>
              </div>
              <div className="hints">
                <h3>
                  <Lightbulb size={18} />A nudge, if you need one
                </h3>
                {problem.hints.map((hint, i) => (
                  <details key={hint}>
                    <summary>
                      Hint {i + 1}
                      <span>Reveal a little more</span>
                    </summary>
                    <p>{hint}</p>
                  </details>
                ))}
              </div>
              <div className="reflection-prompt">
                <strong>Before you move on…</strong>
                <p>
                  Can you explain why your approach works, without reading the
                  code?
                </p>
                <button className="text-link" onClick={() => setTab("notes")}>
                  Write down what clicked
                </button>
              </div>
            </div>
          ) : (
            <div className="workspace-notes">
              <h2>Your thinking, in your words.</h2>
              <p>
                Capture an approach, a question, or a small breakthrough. Plain
                text and Markdown are welcome.
              </p>
              <button
                className="text-button"
                disabled={Boolean(busy)}
                onClick={() =>
                  editNote(note ? note + "\n" + noteTemplate : noteTemplate)
                }
              >
                Add reflection prompts
              </button>
              <label className="sr-only" htmlFor="problem-note">
                Notes for {problem.title}
              </label>
              <textarea
                readOnly={Boolean(busy)}
                id="problem-note"
                value={note}
                onChange={(e) => editNote(e.target.value)}
                maxLength={32000}
                placeholder="What did you notice? What will you try next?"
              />
              <div className="note-actions">
                <span>{note.length.toLocaleString()} characters</span>
                <button
                  className="button dark small"
                  disabled={Boolean(busy) || loading || Boolean(loadError)}
                  onClick={() => void action("note")}
                >
                  <Save size={15} />
                  Save note
                </button>
              </div>
              <button
                className="text-button"
                disabled={Boolean(busy) || loading || Boolean(loadError)}
                onClick={() => void action("review")}
              >
                Save code and revisit this problem later
              </button>
            </div>
          )}
        </section>
        <section className="editor-pane">
          <div className="editor-toolbar">
            <span>
              <FileCode2 size={17} />
              solution.
              {language === "python"
                ? "py"
                : language === "javascript"
                  ? "js"
                  : "go"}
              {dirty && <span className="unsaved-dot" />}
            </span>
            <div>
              <label>
                <span className="sr-only">Solution language</span>
                <select
                  value={language}
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    setLanguage(e.target.value as Language);
                    setResult(null);
                  }}
                >
                  <option value="go">Go</option>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                </select>
              </label>
              <button
                className="icon-button"
                title="Reset this language’s code"
                aria-label="Reset this language’s code"
                disabled={Boolean(busy)}
                onClick={() => setPendingReset(true)}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
          <div className={busy ? "editor-busy" : ""} aria-busy={Boolean(busy)}>
            <CodeEditor
              value={drafts[language]}
              language={language}
              onChange={editCode}
              readOnly={Boolean(busy)}
            />
          </div>
          <div className="editor-actions">
            <span className="editor-font-label">
              Comic Sans ·{" "}
              {busy === "run"
                ? "Running isolated tests…"
                : dirty
                  ? "Unsaved changes"
                  : "Make space for an idea."}
            </span>
            <div>
              <button
                className="button outline small"
                disabled={Boolean(busy) || loading || Boolean(loadError)}
                onClick={() => void action("draft")}
              >
                <Save size={15} />
                {busy === "draft" ? "Saving…" : "Save code"}
              </button>
              <button
                className="button primary small"
                disabled={Boolean(busy) || loading || Boolean(loadError)}
                onClick={() => void action("run")}
              >
                {busy === "run" ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Play size={16} />
                )}
                Run tests
              </button>
            </div>
          </div>
          {(error || message) && (
            <div
              className={`workspace-message ${error ? "error" : "success"}`}
              role={error ? "alert" : "status"}
            >
              {error || message}
              {error && !signedIn && (
                <Link href="/signup">Create an account</Link>
              )}
            </div>
          )}
          <div className="test-panel">
            <div className="test-heading">
              <span>
                <FlaskConical size={17} />
                Test results
              </span>
              {result && (
                <span
                  className={
                    result.passed === result.total ? "success-text" : "muted"
                  }
                >
                  {result.summary}
                </span>
              )}
            </div>
            {!result ? (
              <div className="test-empty">
                <span className="test-empty-icon">
                  <FlaskConical size={24} />
                </span>
                <strong>
                  {busy === "run"
                    ? "Putting your idea to the test…"
                    : "Every result teaches you something."}
                </strong>
                <p>
                  {busy === "run"
                    ? "Your code is running in an isolated environment."
                    : "Run your code to see how it handles the test cases."}
                </p>
              </div>
            ) : (
              <div className="test-results">
                {result.cases.map((c, i) => (
                  <details
                    key={i}
                    className={`test-case ${c.passed ? "passed" : "failed"}`}
                    open={!c.passed}
                  >
                    <summary>
                      {c.passed ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <XCircle size={17} />
                      )}
                      Test {i + 1}
                      <span>{c.passed ? "Passed" : "Needs another look"}</span>
                    </summary>
                    <div>
                      <p>
                        <strong>Input</strong>
                        <code>{JSON.stringify(c.input)}</code>
                      </p>
                      <p>
                        <strong>Expected</strong>
                        <code>{JSON.stringify(c.expected)}</code>
                      </p>
                      <p>
                        <strong>Your output</strong>
                        <code>{c.actual || "(no output)"}</code>
                      </p>
                      {!c.passed && <pre>{c.message}</pre>}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
