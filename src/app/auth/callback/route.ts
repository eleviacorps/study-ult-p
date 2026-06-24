import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedPaths = ["/dashboard", "/onboarding", "/settings", "/reader", "/flashcards"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Validate next against allowlist to prevent open redirect
  const safeNext = allowedPaths.some((p) => next.startsWith(p)) ? next : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
