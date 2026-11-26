import { socialProviders } from "@/lib/auth-providers";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ providers: [], guest: false });
  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error("Unavailable");
    const settings = await response.json();
    return Response.json(
      {
        providers: socialProviders.filter((p) => settings.external?.[p.id]),
        guest: false,
        phone: settings.external?.phone === true,
        sso: process.env.NEXT_PUBLIC_ENABLE_SSO === "true",
        email: settings.external?.email === true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        providers: [],
        guest: false,
        error: "Sign-in options are temporarily unavailable.",
      },
      { status: 503 },
    );
  }
}
