import { requireMembership } from "@/lib/access";
import { ProblemLibrary } from "@/components/problem-library";
import { patterns } from "@/lib/catalog-server";
export const metadata = { title: "Problem library" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ pattern?: string }>;
}) {
  await requireMembership();
  const { pattern } = await searchParams;
  return (
    <ProblemLibrary
      key={pattern || "all"}
      initialPattern={patterns.some((p) => p.id === pattern) ? pattern : "all"}
    />
  );
}
