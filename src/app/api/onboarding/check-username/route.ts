import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

export async function GET(request: Request) {
  const log = logRequest("GET /api/onboarding/check-username", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await log.warn(501, "supabase_not_configured");
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim().toLowerCase();
  log.setMeta("username", username);

  if (!username || username.length < 3) {
    await log.warn(200, "username too short");
    return NextResponse.json({ available: false });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  await log.success(200, `username ${username} ${data ? "taken" : "available"}`);
  return NextResponse.json({ available: !data });
}
