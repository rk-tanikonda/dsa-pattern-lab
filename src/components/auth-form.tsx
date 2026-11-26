"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LoaderCircle,
  Github,
  CheckCircle2,
  Mail,
  Smartphone,
  Building2,
  Apple,
} from "lucide-react";
import type { SocialProvider } from "@/lib/auth-providers";
import { browserClient, authConfigured } from "@/lib/supabase/client";

type Options = {
  providers: { id: SocialProvider; name: string }[];
  email?: boolean;
  phone?: boolean;
  sso?: boolean;
};
export function AuthForm({ mode }: { mode: "login" | "signup" | "reset" }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [options, setOptions] = useState<Options>({ providers: [] });
  const [loading, setLoading] = useState(true),
    [optionsError, setOptionsError] = useState(false);
  const [method, setMethod] = useState<"password" | "link" | "phone" | "sso">(
    "password",
  );
  const [phone, setPhone] = useState(""),
    [codeSent, setCodeSent] = useState(false),
    [more, setMore] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/options", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setOptions(data);
        if (!data.email && data.phone) setMethod("phone");
        else if (!data.email && data.sso) setMethod("sso");
      })
      .catch(() => {
        if (!controller.signal.aborted) setOptionsError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const client = browserClient();
    if (!client) return;
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget),
      email = String(form.get("email") || "").trim(),
      password = String(form.get("password") || "");
    try {
      if (mode === "reset") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
      } else if (method === "sso") {
        const { data, error } = await client.auth.signInWithSSO({
          domain: String(form.get("domain")).trim(),
          options: { redirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data?.url) window.location.assign(data.url);
        return;
      } else if (method === "phone") {
        if (codeSent) {
          const { error } = await client.auth.verifyOtp({
            phone,
            token: String(form.get("code")),
            type: "sms",
          });
          if (error) throw error;
        } else {
          const value = String(form.get("phone")).replace(/[\s()-]/g, "");
          if (!/^\+[1-9]\d{7,14}$/.test(value))
            throw new Error(
              "Enter your phone number with its country code, such as +919876543210.",
            );
          const { error } = await client.auth.signInWithOtp({
            phone: value,
            options: { shouldCreateUser: mode === "signup" },
          });
          if (error) throw error;
          setPhone(value);
          setCodeSent(true);
          setMessage("Check your phone for a verification code.");
          return;
        }
      } else if (method === "link") {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: mode === "signup",
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage(
          "If this email is eligible, a sign-in link is on its way. Open it in this browser.",
        );
        return;
      } else if (mode === "signup") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(form.get("name") || "") },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setMessage(
            "Check your email to confirm your account, then choose your membership.",
          );
          return;
        }
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      window.location.assign("/learn");
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
  async function oauth(provider: SocialProvider) {
    const client = browserClient();
    if (!client) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          ...(provider === "azure" ? { scopes: "email" } : {}),
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to this provider.",
      );
      setBusy(false);
    }
  }
  async function reset(e: React.MouseEvent<HTMLButtonElement>) {
    const email = (
      e.currentTarget.form?.elements.namedItem("email") as HTMLInputElement
    )?.value;
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    const client = browserClient();
    if (!client) return;
    setBusy(true);
    setError("");
    setMessage("");
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
  const canUseForm =
    mode === "reset" ||
    (method === "phone"
      ? options.phone
      : method === "sso"
        ? options.sso
        : options.email);
  return (
    <div className="auth-form">
      {!authConfigured && (
        <div className="notice">
          Sign-in is not available yet. Please check back soon.
        </div>
      )}
      {loading && mode !== "reset" && (
        <p role="status" className="muted">
          Loading secure sign-in options…
        </p>
      )}
      {optionsError && mode !== "reset" && (
        <p role="alert" className="form-error">
          Sign-in options could not be loaded.{" "}
          <button className="text-button" onClick={() => location.reload()}>
            Try again
          </button>
        </p>
      )}
      {mode !== "reset" && options.providers.length > 0 && (
        <>
          <div className="social-grid">
            {(more ? options.providers : options.providers.slice(0, 4)).map(
              (p) => (
                <button
                  key={p.id}
                  className="button outline"
                  disabled={busy}
                  onClick={() => oauth(p.id)}
                >
                  {p.id === "github" ? (
                    <Github size={18} />
                  ) : p.id === "apple" ? (
                    <Apple size={18} />
                  ) : (
                    <span
                      className={`provider-symbol provider-${p.id}`}
                      aria-hidden="true"
                    >
                      {p.name[0]}
                    </span>
                  )}
                  {p.name}
                </button>
              ),
            )}
          </div>
          {options.providers.length > 4 && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => setMore(!more)}
            >
              {more ? "Show fewer options" : "More sign-in options"}
            </button>
          )}
          {canUseForm && (
            <div className="divider">
              <span>or continue with</span>
            </div>
          )}
        </>
      )}
      {mode !== "reset" && (
        <div className="auth-methods" aria-label="Sign-in method">
          {options.email && (
            <button
              aria-pressed={method === "password" || method === "link"}
              disabled={busy}
              onClick={() => {
                setMethod("password");
                setError("");
                setMessage("");
              }}
            >
              <Mail size={16} /> Email
            </button>
          )}
          {options.phone && (
            <button
              aria-pressed={method === "phone"}
              disabled={busy}
              onClick={() => {
                setMethod("phone");
                setError("");
                setMessage("");
              }}
            >
              <Smartphone size={16} /> Phone
            </button>
          )}
          {options.sso && (
            <button
              aria-pressed={method === "sso"}
              disabled={busy}
              onClick={() => {
                setMethod("sso");
                setError("");
                setMessage("");
              }}
            >
              <Building2 size={16} /> SSO
            </button>
          )}
        </div>
      )}
      {canUseForm && (
        <form onSubmit={submit}>
          {mode === "signup" && method === "password" && (
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
          {mode !== "reset" && (method === "password" || method === "link") && (
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
          {(mode === "reset" || method === "password") && (
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
          )}
          {method === "phone" &&
            mode !== "reset" &&
            (codeSent ? (
              <>
                <label>
                  Code sent to {phone}
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    placeholder="6-digit code"
                  />
                </label>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    setCodeSent(false);
                    setMessage("");
                  }}
                >
                  Change number or request a new code
                </button>
              </>
            ) : (
              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  maxLength={24}
                  required
                />
                <small>Include your country code. SMS rates may apply.</small>
              </label>
            ))}
          {method === "sso" && mode !== "reset" && (
            <label>
              Organization domain
              <input
                name="domain"
                placeholder="company.com"
                required
                maxLength={253}
                pattern="[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
              />
              <small>Use the domain registered by your organization.</small>
            </label>
          )}
          {mode !== "reset" && (method === "password" || method === "link") && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => {
                setMethod(method === "password" ? "link" : "password");
                setError("");
                setMessage("");
              }}
            >
              {method === "password"
                ? "Use an email sign-in link instead"
                : "Use a password instead"}
            </button>
          )}
          {mode === "login" && method === "password" && (
            <button
              type="button"
              className="text-button forgot"
              disabled={busy}
              onClick={reset}
            >
              Forgot your password?
            </button>
          )}
          <button
            className="button primary full"
            disabled={busy || !authConfigured}
          >
            {busy && <LoaderCircle className="spin" size={18} />}
            {mode === "reset"
              ? "Update password"
              : method === "link"
                ? "Email me a sign-in link"
                : method === "phone"
                  ? codeSent
                    ? "Verify & continue"
                    : "Send verification code"
                  : method === "sso"
                    ? "Continue with SSO"
                    : mode === "signup"
                      ? "Create your account"
                      : "Sign in"}
          </button>
        </form>
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
      {!loading &&
        !optionsError &&
        !canUseForm &&
        options.providers.length === 0 &&
        authConfigured && (
          <p className="notice">
            Sign-in is being set up. Please check back soon.
          </p>
        )}
      {mode !== "reset" && (
        <>
          <p className="auth-switch">
            {mode === "signup"
              ? "Already have an account?"
              : "New to Pattern Lab?"}{" "}
            <Link href={mode === "signup" ? "/login" : "/signup"}>
              {mode === "signup" ? "Log in" : "Create an account"}
            </Link>
          </p>
          <p className="auth-membership">
            A paid membership is required to use the lab.{" "}
            <Link href="/pricing">View plans</Link> ·{" "}
            <Link href="/privacy">Privacy</Link>
          </p>
        </>
      )}
    </div>
  );
}
