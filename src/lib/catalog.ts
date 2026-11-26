import type data from "@/content/catalog.json";
export type Language = "go" | "python" | "javascript";
export type Problem = (typeof data.problems)[number];
export type Pattern = (typeof data.patterns)[number];
export type Progress = {
  problem_id: string;
  status: "in_progress" | "solved" | "review";
  code: string;
  language: Language;
  updated_at: string;
};
export type Note = { problem_id: string; body: string; updated_at: string };
export type LearningState = { progress: Progress[]; notes: Note[] };
export const emptyState: LearningState = { progress: [], notes: [] };
