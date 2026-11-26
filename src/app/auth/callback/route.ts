import { NextRequest, NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await serverClient();
  if (client && code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) {
      const destination =
        request.nextUrl.searchParams.get("next") === "/reset-password"
          ? "/reset-password"
          : "/learn";
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
