import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";
import { canonicalSlug, sha256Hex } from "@/lib/content-identity";

export const runtime = "edge";

interface SourceRow {
  id: number;
  user_id: string;
  chapter: string;
  subject: string;
  path: string;
  title: string;
  content: string;
  content_hash: string | null;
  canonical_slug: string | null;
  tags: string[];
  author: string;
}

/**
 * POST /api/vault-bank/save
 *
 * Copies a published chapter vault from an admin's user_notes into
 * the aclose user's own user_notes table. Paths are preserved
 * exactly so the chapter appears with the same structure in the
 * aclose user's Reader, Questions, Quizzes, etc.
 *
 * Body: { owner_id: string, chapter: string }
 *
 *   aclose  — saves the chapter (inserts new rows with their own
 *             user_id, content copied from admin's shared rows).
 *   admin   — can save their OWN chapter (creates a duplicate in
 *             their own vault). Useful for testing.
 *   user    — 403 forbidden.
 *
 * The save is idempotent: if the aclose user has already saved a
 * file with the same content_hash, the row is updated (not
 * duplicated). This handles the case where admin re-publishes or
 * updates a chapter — aclose re-saves to refresh.
 */
export async function POST(request: Request) {
  const log = logRequest("POST /api/vault-bank/save", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  log.setMeta("userId", user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "aclose" && profile?.role !== "admin") {
    await log.warn(403, "forbidden_aclose_or_admin");
    return NextResponse.json({ error: "forbidden_aclose_or_admin" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { owner_id, chapter } = body as { owner_id?: string; chapter?: string };
  if (!owner_id || !chapter) {
    return NextResponse.json(
      { error: "owner_id (string) and chapter (string) required" },
      { status: 400 }
    );
  }

  // Verify the owner is an admin (defence in depth — RLS already
  // restricts the SELECT, but we double-check)
  const { data: owner } = await supabase
    .from("profiles")
    .select("role, name")
    .eq("id", owner_id)
    .single();
  if (owner?.role !== "admin") {
    await log.warn(403, "owner_not_admin");
    return NextResponse.json({ error: "owner_not_admin" }, { status: 403 });
  }

  // Fetch all shared rows for this owner+chapter (RLS already
  // restricts shared_to_aclose = true)
  const { data: sourceRows, error: srcErr } = await supabase
    .from("user_notes")
    .select("id, user_id, chapter, subject, path, title, content, content_hash, canonical_slug, tags, author")
    .eq("user_id", owner_id)
    .eq("chapter", chapter)
    .eq("shared_to_aclose", true);

  if (srcErr) {
    await log.error("vault_bank_save_fetch_failed", srcErr);
    return NextResponse.json({ error: srcErr.message }, { status: 500 });
  }
  if (!sourceRows || sourceRows.length === 0) {
    return NextResponse.json(
      { error: "no_shared_files_for_chapter" },
      { status: 404 }
    );
  }

  // Compute content hashes (the source rows may have them, but
  // recompute to be safe — content_hash is the dedup key)
  const toInsert: Array<{
    user_id: string;
    chapter: string;
    subject: string;
    path: string;
    title: string;
    content: string;
    content_hash: string;
    canonical_slug: string;
    tags: string[];
    author: string;
  }> = [];
  for (const r of sourceRows as SourceRow[]) {
    const hash = await sha256Hex(r.content || "");
    const slug = canonicalSlug(r.path || r.title);
    toInsert.push({
      user_id: user.id,
      chapter: r.chapter,
      subject: r.subject,
      path: r.path,
      title: r.title,
      content: r.content,
      content_hash: hash,
      canonical_slug: slug,
      tags: r.tags || [],
      author: owner.name || "",
    });
  }

  // Upsert on (user_id, path) so the save is idempotent — re-saving
  // a chapter updates existing rows with new content rather than
  // duplicating them.
  const { error: upErr } = await supabase
    .from("user_notes")
    .upsert(toInsert, { onConflict: "user_id,path", ignoreDuplicates: false });

  if (upErr) {
    await log.error("vault_bank_save_upsert_failed", upErr);
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await log.success(
    200,
    `chapter "${chapter}" saved by ${profile.role} (${toInsert.length} files)`
  );
  return NextResponse.json({
    success: true,
    chapter,
    filesCopied: toInsert.length,
  });
}

/**
 * GET /api/vault-bank/save?owner_id=&chapter=
 *
 * Returns the file list for a published chapter so the client can
 * show a preview ("this chapter contains N files: ...") before
 * the aclose user clicks "Save to vault".
 */
export async function GET(request: Request) {
  const log = logRequest("GET /api/vault-bank/save", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ files: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ files: [] }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "aclose" && profile?.role !== "admin") {
    return NextResponse.json({ files: [] });
  }

  const { searchParams } = new URL(request.url);
  const ownerId = searchParams.get("owner_id");
  const chapter = searchParams.get("chapter");
  if (!ownerId || !chapter) {
    return NextResponse.json({ files: [] });
  }

  const { data, error } = await supabase
    .from("user_notes")
    .select("path, title, subject, content, author")
    .eq("user_id", ownerId)
    .eq("chapter", chapter)
    .eq("shared_to_aclose", true)
    .order("path", { ascending: true });

  if (error) {
    await log.error("vault_bank_save_list_failed", error);
    return NextResponse.json({ files: [] }, { status: 500 });
  }

  const files = (data || []).map((r: Record<string, unknown>) => ({
    path: r.path,
    title: r.title,
    subject: r.subject,
    author: r.author,
    excerpt: ((r.content as string) || "").substring(0, 200).replace(/[#*>\-\[\]]/g, ""),
    size: ((r.content as string) || "").length,
  }));

  await log.success(200, `vault-bank save preview: ${files.length} files`);
  return NextResponse.json({ files });
}
