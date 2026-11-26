"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";
export function AccountControls({
  hasCustomer,
  pending = false,
}: {
  hasCustomer: boolean;
  pending?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (!pending) return;
    let count = 0;
    const timer = setInterval(() => {
      router.refresh();
      if (++count >= 12) clearInterval(timer);
    }, 5000);
    return () => clearInterval(timer);
  }, [pending, router]);
  async function manage() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/billing/portal", { method: "POST" }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing.");
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      const client = browserClient();
      if (!client) throw new Error("Sign out is unavailable.");
      const { error } = await client.auth.signOut();
      if (error) throw error;
      location.assign("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out.");
      setBusy(false);
    }
  }
  return (
    <div className="account-controls">
      {hasCustomer && (
        <button className="button outline" disabled={busy} onClick={manage}>
          Manage billing
        </button>
      )}
      <button
        className="button outline"
        onClick={() => router.refresh()}
        disabled={busy}
      >
        Refresh status
      </button>
      <button className="text-button" onClick={logout} disabled={busy}>
        Sign out
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
