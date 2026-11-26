import { requireMembership } from "@/lib/access";
import { Dashboard } from "@/components/dashboard";
export const metadata = { title: "Your workspace" };
export default async function Page() {
  await requireMembership();
  return <Dashboard />;
}
