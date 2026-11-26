"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
export function ThemeSwitch() {
  const { theme, resolved, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className="theme-switch" ref={container}>
      <button
        ref={trigger}
        type="button"
        className={`theme-trigger ${open ? "is-open" : ""}`}
        aria-label="Choose theme"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {resolved === "dark" ? <Moon size={17} /> : <Sun size={17} />}
        <span>Theme</span>
      </button>
      {open && (
        <div className="theme-menu" role="group" aria-label="Appearance">
          <div className="theme-menu-title">Make yourself comfortable</div>
          {(
            [
              {
                value: "light",
                label: "Light",
                description: "A fresh perspective",
                Icon: Sun,
              },
              {
                value: "dark",
                label: "Dark",
                description: "A little less light",
                Icon: Moon,
              },
              {
                value: "system",
                label: "System",
                description: "Follow your device",
                Icon: Monitor,
              },
            ] as const
          ).map(({ value, label, description, Icon }) => (
            <button
              key={value}
              aria-pressed={theme === value}
              onClick={() => {
                setTheme(value);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <Icon size={18} />
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              {theme === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
