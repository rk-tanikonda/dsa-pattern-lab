import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
export const requireAccount = cache(async () => {
  const client = await serverClient();
  const identity = client ? await client.auth.getUser() : null;
  const user = identity?.data.user;
  if (!client || !user || user.is_anonymous) redirect("/login");
  return { client, user };
});
export const requireMembership = cache(async () => {
  const account = await requireAccount();
  const { data, error } = await account.client.rpc("has_paid_access");
  if (error)
    throw new Error(
      "Membership verification is temporarily unavailable. Please retry.",
    );
  if (data !== true) redirect("/billing");
  return account;
});
export function isAdmin(id: string) {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(id);
}
