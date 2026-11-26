import "server-only";
import data from "@/content/catalog.json";
export const problems = data.problems;
export const patterns = data.patterns;
export const getProblem = (id: string) => problems.find((p) => p.id === id);
