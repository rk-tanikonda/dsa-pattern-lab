import { notFound } from "next/navigation";
import { getProblem } from "@/lib/catalog";
import { PracticeWorkspace } from "@/components/practice-workspace";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = getProblem((await params).id);
  return { title: p?.title || "Problem not found" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = getProblem((await params).id);
  if (!p) notFound();
  return <PracticeWorkspace key={p.id} problem={p} />;
}
