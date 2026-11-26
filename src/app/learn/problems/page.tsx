import { ProblemLibrary } from "@/components/problem-library";
import { patterns } from "@/lib/catalog";
export const metadata = { title: "Problem library" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pattern?: string }>;
}) {
  const { pattern } = await searchParams;
  return (
    <ProblemLibrary
      key={pattern || "all"}
      initialPattern={patterns.some((p) => p.id === pattern) ? pattern : "all"}
    />
  );
}
