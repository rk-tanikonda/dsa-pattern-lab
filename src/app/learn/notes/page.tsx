import { requireMembership } from "@/lib/access";
import { Notebook } from "@/components/notebook";
export const metadata = { title: "My notebook" };
export default async function Page() {
  await requireMembership();
  return <Notebook />;
}
