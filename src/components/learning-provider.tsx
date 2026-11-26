"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { emptyState, type LearningState } from "@/lib/catalog";
type Context = {
  state: LearningState;
  loading: boolean;
  error: string;
  signedIn: boolean;
  name: string;
  refresh: () => Promise<void>;
  request: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
};
const LearningContext = createContext<Context | null>(null);
export function LearningProvider({
  children,
  signedIn,
  name,
}: {
  children: React.ReactNode;
  signedIn: boolean;
  name: string;
}) {
  const [state, setState] = useState<LearningState>(emptyState),
    [loading, setLoading] = useState(signedIn),
    [error, setError] = useState("");
  const request = useCallback(
    async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
      const response = await fetch(`/api/lab/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to complete the request.");
      return data as T;
    },
    [],
  );
  const refresh = useCallback(async () => {
    if (!signedIn) {
      setLoading(false);
      return;
    }
    try {
      setState(await request<LearningState>("state"));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load your progress.",
      );
    } finally {
      setLoading(false);
    }
  }, [signedIn, request]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <LearningContext.Provider
      value={{ state, loading, error, signedIn, name, refresh, request }}
    >
      {children}
    </LearningContext.Provider>
  );
}
export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) throw new Error("LearningProvider is required");
  return context;
}
