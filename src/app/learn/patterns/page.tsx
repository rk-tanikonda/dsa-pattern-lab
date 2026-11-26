import { requireMembership } from "@/lib/access";
import { PatternPath } from "@/components/pattern-path";
export const metadata = { title: "Learning path" };
export default async function Page() {
  await requireMembership();
  return <PatternPath />;
}
