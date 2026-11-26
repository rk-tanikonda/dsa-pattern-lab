"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Shapes,
  BookOpen,
  NotebookPen,
  PanelLeftClose,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Code2,
  CreditCard,
} from "lucide-react";
import { Logo } from "./logo";
import { ThemeSwitch } from "./theme-switch";
import { browserClient } from "@/lib/supabase/client";
import { useLearning } from "./learning-provider";
const nav = [
  ["/learn", "Overview", LayoutDashboard],
  ["/learn/patterns", "Learning path", Shapes],
  ["/learn/problems", "Problem library", Code2],
  ["/learn/notes", "My notebook", NotebookPen],
  ["/billing", "Billing & usage", CreditCard],
] as const;
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { signedIn, name } = useLearning(),
    [open, setOpen] = useState(false),
    [authError, setAuthError] = useState("");
  const lastTracked = useRef("");
  useEffect(() => {
    if (path === lastTracked.current) return;
    lastTracked.current = path;
    // Self-reported navigation is separate from authoritative execution counts.
    void browserClient()?.rpc("record_page_view", { p_path: path });
  }, [path]);
  const active = nav.find(([href]) =>
    href === "/learn" ? path === href : path.startsWith(href),
  );
  async function logout() {
    try {
      const { error } = await browserClient()!.auth.signOut();
      if (error) throw error;
      window.location.assign("/");
    } catch {
      setAuthError("Could not sign out. Please try again.");
    }
  }
  return (
    <div className="app-shell">
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-logo">
          <Logo />
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">P</span>
          <div>
            Personal workspace<small>Your space to grow</small>
          </div>
          <PanelLeftClose size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map(([href, label, Icon]) => (
            <Link
              key={href}
              onClick={() => setOpen(false)}
              className={`nav-item ${(href === "/learn" ? path === href : path.startsWith(href)) ? "active" : ""}`}
              href={href}
            >
              <Icon size={19} />
              {label}
              {label === "Problem library" && (
                <span className="nav-count">12</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-note">
            <BookOpen size={20} />
            <strong>Understanding beats memorizing.</strong>
            <p>Take your time. The insight is the goal.</p>
            <Link href="/learn/patterns" onClick={() => setOpen(false)}>
              Explore the patterns <ChevronRight size={15} />
            </Link>
          </div>
          {authError && (
            <p role="alert" className="form-error">
              {authError}
            </p>
          )}
          <div className="user-row">
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>{signedIn ? "Pro membership" : "Exploring the lab"}</small>
            </div>
            {signedIn ? (
              <button
                aria-label="Sign out"
                onClick={logout}
                className="icon-button"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <Link href="/signup" aria-label="Create an account">
                <ChevronRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <div>
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={14} />
            <span>{active?.[1] || "Practice room"}</span>
          </div>
          <div>
            <span className="header-note">
              Small steps. Lasting understanding.
            </span>
            <ThemeSwitch />
            {!signedIn && (
              <Link href="/signup" className="button small dark">
                Create account
              </Link>
            )}
            <span className="avatar small">
              {name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main
          id="main"
          className={
            path.startsWith("/learn/problems/") ? "workspace-main" : "app-main"
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
