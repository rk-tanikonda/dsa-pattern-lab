import { AuthPage } from "@/components/auth-page";
export const metadata = { title: "Log in" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <AuthPage
      mode="login"
      invalidLink={(await searchParams).error === "link"}
    />
  );
}
