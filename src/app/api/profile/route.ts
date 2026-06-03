import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

export async function GET() {
  const log = logRequest("GET /api/profile", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await log.warn(501, "supabase_not_configured");
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await log.warn(401, "unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  log.setMeta("userId", user.id);

  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,username,bio,avatar_url,instagram,twitter,github,website,onboarding_completed,role,created_at")
    .eq("id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    await log.error("profile_fetch_failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await log.success(200, "profile fetched");
  return NextResponse.json(data || { id: user.id });
}

export async function PUT(request: Request) {
  const log = logRequest("PUT /api/profile", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await log.warn(501, "supabase_not_configured");
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    await log.warn(401, "unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  log.setMeta("userId", user.id);

  const body = await request.json();
  const allowed = ["name", "username", "bio", "avatar_url", "instagram", "twitter", "github", "website", "onboarding_completed"];
  const updates: Record<string, string | boolean> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...updates }, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    if (error.message.includes("idx_profiles_username")) {
      await log.warn(409, "username_taken");
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    await log.error("profile_update_failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await log.success(200, "profile updated");
  return NextResponse.json(data);
}
