import { serverClient } from "@/lib/supabase/server";
import { LearningProvider } from "@/components/learning-provider";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await serverClient();
  const result = client ? await client.auth.getUser() : null;
  const user = result?.data.user;
  const name = String(
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Explorer",
  ).slice(0, 80);
  return (
    <LearningProvider signedIn={Boolean(user)} name={name}>
      <AppShell>{children}</AppShell>
    </LearningProvider>
  );
}
