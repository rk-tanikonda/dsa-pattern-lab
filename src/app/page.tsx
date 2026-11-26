import Link from "next/link";
import {
  Braces,
  Check,
  Code2,
  Fingerprint,
  Github,
  Layers3,
  NotebookPen,
  Play,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import { patterns } from "@/lib/catalog";
export default function Home() {
  return (
    <div className="marketing">
      <header className="site-nav">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#approach">The approach</a>
          <a href="#patterns">Learning path</a>
          <Link href="/learn/problems">Explore problems</Link>
        </nav>
        <div>
          <ThemeSwitch />
          <Link className="nav-login" href="/login">
            Log in
          </Link>
          <Link className="button dark small" href="/signup">
            Start learning
          </Link>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <span className="pill">
              <span className="live-dot" /> A little practice. A different way
              of thinking.
            </span>
            <h1>
              Don’t just solve it.
              <br />
              <span>Make it click.</span>
            </h1>
            <p>
              Go beyond memorizing solutions. Learn the patterns behind data
              structures and algorithms, and turn “where do I start?” into “I’ve
              seen this before.”
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="button primary">
                Find your first breakthrough
              </Link>
              <Link href="/learn" className="button outline">
                <Play size={16} />
                Take a look inside
              </Link>
            </div>
            <div className="hero-meta">
              <span>
                <Check size={15} />
                Go, Python & JavaScript
              </span>
              <span>
                <Check size={15} />
                Learn at your own pace
              </span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustration of finding a complement in the Two Sum problem"
          >
            <div className="art-top">
              <span>
                <Braces size={17} /> THE PATTERN BEHIND THE PROBLEM
              </span>
              <span className="art-tag">01 / HASHING</span>
            </div>
            <div className="art-title">
              A small shift.
              <br />
              <em>A better solution.</em>
            </div>
            <div className="number-flow">
              <div className="number-node">
                2<span>nums[0]</span>
              </div>
              <div className="connection">
                <span>+</span>
              </div>
              <div className="number-node selected">
                7<span>nums[1]</span>
              </div>
              <div className="connection">
                <span>=</span>
              </div>
              <div className="number-node target">
                9<span>target</span>
              </div>
            </div>
            <div className="art-code">
              <span className="code-comment">
                // Instead of checking every pair...
              </span>
              <br />
              <span className="code-purple">complement</span> := target - num
              <br />
              <span className="code-comment">
                // Remember what you’ve already seen.
              </span>
              <br />
              <span className="code-green">seen</span>[num] = index
            </div>
            <div className="insight">
              <span className="insight-icon">
                <Sparkles size={19} />
              </span>
              <div>
                <strong>That’s the pattern.</strong>
                <span>Trade a little memory for a lot less work.</span>
              </div>
              <span className="complexity">
                O(n²) <span>→</span> <b>O(n)</b>
              </span>
            </div>
            <span className="art-caption">
              An illustrated insight. You write the solution.
            </span>
          </div>
        </section>
        <div className="principles-strip">
          <span>
            LESS GRIND.
            <br />
            <strong>MORE UNDERSTANDING.</strong>
          </span>
          <div>
            <Fingerprint size={22} />
            Recognize the pattern
          </div>
          <div>
            <Code2 size={22} />
            Build your intuition
          </div>
          <div>
            <NotebookPen size={22} />
            Keep what clicks
          </div>
        </div>
        <section id="approach" className="approach-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A PRACTICE THAT STICKS</span>
              <h2>
                The answer is only
                <br />
                half the story.
              </h2>
            </div>
            <p>
              Knowing why it works is what stays with you.
              <br />A focused space to think, experiment, and connect the dots.
            </p>
          </div>
          <div className="approach-grid">
            <article>
              <div className="feature-graphic pattern-graphic">
                <span>[ ]</span>
                <span>{}</span>
                <span>( )</span>
              </div>
              <span className="eyebrow">RECOGNIZE</span>
              <h3>
                Learn a pattern.
                <br />
                Unlock a family of problems.
              </h3>
              <p>
                Build from arrays and hashing to dynamic programming. Each step
                gives you a new way to see the next challenge.
              </p>
            </article>
            <article>
              <div className="feature-graphic mini-editor">
                <div>
                  <i />
                  <i />
                  <i />
                </div>
                <code>
                  <span>func</span> solve(input Input) any {"{"}
                  <br />
                  &nbsp; <em>// make room for an idea</em>
                  <br />
                  &nbsp; return yourBreakthrough
                  <br />
                  {"}"}
                </code>
              </div>
              <span className="eyebrow">EXPERIMENT</span>
              <h3>
                Your thinking.
                <br />
                Your language.
              </h3>
              <p>
                Write real code in Go, Python, or JavaScript. Test an idea,
                inspect what happened, and make the next version better.
              </p>
            </article>
            <article>
              <div className="feature-graphic notebook-graphic">
                <span>Today, it clicked.</span>
                <p>
                  “I don’t need to search again.
                  <br />I can remember what I’ve seen.”
                </p>
                <div>
                  hashing <span>·</span> time–space tradeoff
                </div>
              </div>
              <span className="eyebrow">REFLECT</span>
              <h3>
                Keep the insight.
                <br />
                Not just the green check.
              </h3>
              <p>
                Save your approach, the edge case you missed, and the
                explanation in your own words. Your notebook grows with you.
              </p>
            </article>
          </div>
        </section>
        <section id="patterns" className="home-path">
          <div>
            <span className="eyebrow">YOUR FIRST CHAPTER</span>
            <h2>
              A clear path.
              <br />A stronger foundation.
            </h2>
            <p>
              Twelve focused challenges across six essential patterns. Start at
              the beginning or follow your curiosity.
            </p>
            <Link href="/learn/patterns" className="button dark">
              Explore the learning path
            </Link>
            <span className="path-footnote">
              A focused starting collection, with room to grow.
            </span>
          </div>
          <div className="home-pattern-list">
            {patterns.map((p, i) => (
              <Link href={`/learn/problems?pattern=${p.id}`} key={p.id}>
                <span className={`pattern-icon ${p.color}`}>
                  <Layers3 size={21} />
                </span>
                <div>
                  <strong>{p.title}</strong>
                  <span>{p.tagline}</span>
                </div>
                <span className="pattern-count">2 problems</span>
                <span className="path-order">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="final-cta">
          <span className="eyebrow">YOUR NEXT SMALL STEP</span>
          <h2>
            Confidence is built.
            <br />
            <em>One “aha” at a time.</em>
          </h2>
          <Link href="/signup" className="button primary">
            Create your learning space
          </Link>
          <Link href="/learn" className="cta-secondary">
            Or explore first. Curiosity is enough.
          </Link>
        </section>
      </main>
      <footer className="site-footer">
        <Logo />
        <span>Made for understanding. Built for your pace.</span>
        <div>
          <Link href="/learn">Explore the lab</Link>
          <Link href="/login">Log in</Link>
        </div>
      </footer>
    </div>
  );
}
