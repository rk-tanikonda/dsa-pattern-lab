import { patterns, problems } from "@/lib/catalog-server";
import { requireMembership } from "@/lib/access";
import { LearningProvider } from "@/components/learning-provider";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireMembership();
  const name = String(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer",
  ).slice(0, 80);
  return (
    <LearningProvider
      signedIn={true}
      name={name}
      catalog={{ patterns, problems }}
    >
      <AppShell>{children}</AppShell>
    </LearningProvider>
  );
}
