import { Logo } from "./logo";
import { ThemeSwitch } from "./theme-switch";
import { AuthForm } from "./auth-form";
import { Braces, Sparkles } from "lucide-react";
export function AuthPage({
  mode,
  invalidLink = false,
}: {
  mode: "login" | "signup" | "reset";
  invalidLink?: boolean;
}) {
  return (
    <main id="main" className="auth-page">
      <div className="auth-story">
        <Logo />
        <div>
          <span className="eyebrow">
            <Sparkles size={16} /> A little practice. A lot of progress.
          </span>
          <h1>
            Your next
            <br />
            “I get it”
            <br />
            <em>starts here.</em>
          </h1>
          <p>
            Learn the patterns behind the problems.
            <br />
            Build confidence, one small breakthrough at a time.
          </p>
        </div>
        <span className="auth-foot">
          <Braces size={20} /> Made for curious minds.
        </span>
      </div>
      <section className="auth-panel">
        <div className="auth-theme">
          <ThemeSwitch />
        </div>
        <div className="auth-box">
          <span className="eyebrow">YOUR LEARNING SPACE</span>
          <h2>
            {mode === "signup"
              ? "Make room for progress."
              : mode === "reset"
                ? "A fresh start."
                : "Good to see you again."}
          </h2>
          <p>
            {mode === "signup"
              ? "Create an account to keep your code, notes, and progress together."
              : mode === "reset"
                ? "Choose a new password for your account."
                : "Pick up your code, your notes, and your next challenge."}
          </p>
          {invalidLink && (
            <p role="alert" className="form-error">
              This sign-in link could not be verified. Request a new link or
              sign in below.
            </p>
          )}
          <AuthForm mode={mode} />
        </div>
      </section>
    </main>
  );
}
