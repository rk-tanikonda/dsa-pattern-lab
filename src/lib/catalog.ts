import data from "@/content/catalog.json";
export type Language = "go" | "python" | "javascript";
export type Problem = (typeof data.problems)[number];
export type Pattern = (typeof data.patterns)[number];
export const problems = data.problems;
export const patterns = data.patterns;
export const getProblem = (id: string) => problems.find((p) => p.id === id);
export const getPattern = (id: string) => patterns.find((p) => p.id === id)!;
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
