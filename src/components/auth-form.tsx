"use client";
import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Github, CheckCircle2 } from "lucide-react";
import { browserClient, authConfigured } from "@/lib/supabase/client";
export function AuthForm({ mode }: { mode: "login" | "signup" | "reset" }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = browserClient();
    if (!client) return;
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget),
      email = String(form.get("email") || ""),
      password = String(form.get("password"));
    try {
      if (mode === "reset") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        window.location.assign("/learn");
        return;
      }
      if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(form.get("name")) },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) window.location.assign("/learn");
        else
          setMessage(
            "Check your email to confirm your account, then come back to start learning.",
          );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        window.location.assign("/learn");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function github() {
    const client = browserClient();
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: `${location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not connect to GitHub.",
      );
      setBusy(false);
    }
  }
  async function reset(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    const email = (form?.elements.namedItem("email") as HTMLInputElement)
      ?.value;
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    const client = browserClient();
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setMessage(
        "If an account exists for this email, a password reset link is on its way.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send reset email.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-form">
      {!authConfigured && (
        <div className="notice">
          Account setup is coming next. You can explore every lesson and try the
          editor in the meantime. <Link href="/learn">Explore the lab</Link>
        </div>
      )}
      {mode !== "reset" && (
        <>
          <button
            className="button outline full"
            disabled={busy || !authConfigured}
            onClick={github}
          >
            <Github size={18} />
            Continue with GitHub
          </button>
          <div className="divider">
            <span>or use your email</span>
          </div>
        </>
      )}
      <form onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Your name
            <input
              name="name"
              autoComplete="name"
              placeholder="What should we call you?"
              maxLength={80}
              required
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              maxLength={254}
            />
          </label>
        )}
        <label>
          {mode === "reset" ? "New password" : "Password"}
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder="At least 8 characters"
            minLength={8}
            maxLength={128}
            required
          />
        </label>
        {mode === "login" && (
          <button
            type="button"
            className="text-button forgot"
            disabled={busy || !authConfigured}
            onClick={reset}
          >
            Forgot your password?
          </button>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="form-success">
            <CheckCircle2 size={18} />
            {message}
          </p>
        )}
        <button
          className="button primary full"
          disabled={busy || !authConfigured}
        >
          {busy && <LoaderCircle className="spin" size={18} />}{" "}
          {mode === "signup"
            ? "Create your account"
            : mode === "reset"
              ? "Update password"
              : "Welcome back"}
        </button>
      </form>
      {mode !== "reset" && (
        <p className="auth-switch">
          {mode === "signup"
            ? "Already have an account?"
            : "New to Pattern Lab?"}{" "}
          <Link href={mode === "signup" ? "/login" : "/signup"}>
            {mode === "signup" ? "Log in" : "Create an account"}
          </Link>
        </p>
      )}
    </div>
  );
}
