import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

export const runtime = "edge";

interface ChapterPackage {
  owner_id: string;
  owner_name: string;
  chapter: string;
  subject: string;
  file_count: number;
  total_size: number;
  paths: string[];
  titles: string[];
  published_at: string;
}

async function loadProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("id, name, username, role")
    .eq("id", userId)
    .single();
  return data as { id: string; name: string; username: string; role: string } | null;
}

/**
 * GET /api/vault-bank
 *
 * Lists all chapter packages currently published to the Vault Bank.
 *
 * Returns array of { owner_id, owner_name, chapter, subject,
 *   file_count, total_size, paths, titles, published_at }.
 *
 *   aclose  — sees all published chapters (across all admin owners, but
 *             for this app there is exactly one admin).
 *   admin   — sees only their own published chapters (so they can
 *             manage what they have shared).
 *   user    — empty list.
 *
 * The shared rows are filtered through RLS; aclose users can only
 * read user_notes where shared_to_aclose = true.
 */
export async function GET() {
  const log = logRequest("GET /api/vault-bank", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ chapters: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ chapters: [] }, { status: 401 });
  log.setMeta("userId", user.id);

  const profile = await loadProfile(supabase, user.id);
  if (!profile) return NextResponse.json({ chapters: [] });

  if (profile.role !== "aclose" && profile.role !== "admin") {
    return NextResponse.json({ chapters: [] });
  }

  // Admins manage their own publishes. aclose users see publishes
  // from admin owners.
  let query = supabase
    .from("user_notes")
    .select("user_id, chapter, subject, path, title, content, shared_at, author")
    .eq("shared_to_aclose", true);

  if (profile.role === "admin") {
    // Admin only sees their own publishes
    query = query.eq("user_id", user.id);
  } else {
    // aclose users only see publishes from admin users
    // We filter via the profiles table since user_notes.user_id is opaque
    // to the client. Use a not-in or join — RLS already restricts
    // what the aclose user can see (shared_to_aclose = true only),
    // and we additionally filter to admin owners in code below.
  }

  const { data, error } = await query;
  if (error) {
    await log.error("vault_bank_fetch_failed", error);
    return NextResponse.json({ chapters: [] }, { status: 500 });
  }

  // Restrict to admin owners (for aclose) — fetch admin ids once
  const adminIds = new Set<string>();
  if (profile.role === "aclose") {
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");
    for (const a of admins || []) adminIds.add((a as { id: string }).id);
  }

  // Group by (owner_id, chapter) to build chapter packages
  const packages = new Map<string, ChapterPackage>();
  for (const r of (data || []) as Array<{
    user_id: string;
    chapter: string;
    subject: string;
    path: string;
    title: string;
    content: string;
    shared_at: string;
    author: string;
  }>) {
    if (profile.role === "aclose" && !adminIds.has(r.user_id)) continue;

    const key = `${r.user_id}::${r.chapter}`;
    let pkg = packages.get(key);
    if (!pkg) {
      // Fetch owner name (cache as we go — but for a single admin
      // we can lazy-load once)
      const ownerProfile = await loadProfile(supabase, r.user_id);
      pkg = {
        owner_id: r.user_id,
        owner_name: ownerProfile?.name || ownerProfile?.username || "",
        chapter: r.chapter,
        subject: r.subject,
        file_count: 0,
        total_size: 0,
        paths: [],
        titles: [],
        published_at: r.shared_at || new Date().toISOString(),
      };
      packages.set(key, pkg);
    }
    pkg.file_count += 1;
    pkg.total_size += (r.content || "").length;
    pkg.paths.push(r.path);
    pkg.titles.push(r.title);
    // Use the most recent shared_at
    if (r.shared_at && r.shared_at > pkg.published_at) {
      pkg.published_at = r.shared_at;
    }
  }

  // Sort: most recently published first
  const chapters = Array.from(packages.values()).sort(
    (a, b) => b.published_at.localeCompare(a.published_at)
  );

  await log.success(200, `vault_bank: ${chapters.length} chapter(s)`);
  return NextResponse.json({ chapters });
}

/**
 * POST /api/vault-bank
 *
 * Publish or unpublish an entire chapter vault.
 *
 * Body: { chapter: string, shared: boolean }
 *
 *   admin   — toggles shared_to_aclose for ALL their own rows
 *             where chapter matches. Atomic via single UPDATE.
 *   others  — 403 forbidden.
 */
export async function POST(request: Request) {
  const log = logRequest("POST /api/vault-bank", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  log.setMeta("userId", user.id);

  const profile = await loadProfile(supabase, user.id);
  if (profile?.role !== "admin") {
    await log.warn(403, "forbidden_admin_only");
    return NextResponse.json({ error: "forbidden_admin_only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { chapter, shared } = body as { chapter?: string; shared?: boolean };
  if (!chapter || typeof shared !== "boolean") {
    return NextResponse.json(
      { error: "chapter (string) and shared (boolean) required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("user_notes")
    .update({ shared_to_aclose: shared, shared_at: shared ? new Date().toISOString() : null })
    .eq("user_id", user.id)
    .eq("chapter", chapter);

  if (error) {
    await log.error("vault_bank_publish_failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await log.success(200, `chapter "${chapter}" shared=${shared}`);
  return NextResponse.json({ success: true, chapter, shared });
}
