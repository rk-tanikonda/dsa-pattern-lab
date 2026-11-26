"use client";
import { createContext, useContext, useEffect, useState } from "react";
type Theme = "light" | "dark" | "system";
type ThemeContextValue = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
};
const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});
const key = "pattern-lab-theme";
function valid(value: string | null): Theme {
  return value === "light" || value === "dark" ? value : "system";
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system"),
    [resolved, setResolved] = useState<"light" | "dark">("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    let preference: Theme = "system";
    try {
      preference = valid(localStorage.getItem(key));
    } catch {}
    function apply(next: Theme) {
      const value =
        next === "system" ? (media.matches ? "dark" : "light") : next;
      setThemeState(next);
      setResolved(value);
      document.documentElement.dataset.theme = value;
      document.documentElement.style.colorScheme = value;
    }
    apply(preference);
    const systemChanged = () => {
      if (preference === "system") apply("system");
    };
    const stored = (event: StorageEvent) => {
      if (event.key === key) {
        preference = valid(event.newValue);
        apply(preference);
      }
    };
    const changed = (event: Event) => {
      preference = (event as CustomEvent<Theme>).detail;
      apply(preference);
    };
    media.addEventListener("change", systemChanged);
    window.addEventListener("storage", stored);
    window.addEventListener("pattern-theme", changed);
    return () => {
      media.removeEventListener("change", systemChanged);
      window.removeEventListener("storage", stored);
      window.removeEventListener("pattern-theme", changed);
    };
  }, []);
  function setTheme(next: Theme) {
    try {
      localStorage.setItem(key, next);
    } catch {}
    window.dispatchEvent(new CustomEvent("pattern-theme", { detail: next }));
  }
  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
