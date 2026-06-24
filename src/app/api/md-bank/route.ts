import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

export async function GET(request: Request) {
  const log = logRequest("GET /api/md-bank", null);
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const { data, error } = await supabase
      .from("md_bank")
      .select("id,title,author,subject,chapter,tags,content,filename,description,created_by,created_at,updated_at")
      .eq("id", id)
      .single();

    if (error) {
      await log.warn(404, `md_bank entry ${id} not found`);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    await log.success(200, `md_bank entry ${id} fetched`);
    return NextResponse.json(data);
  }

  const subject = searchParams.get("subject");
  const author = searchParams.get("author");
  const chapter = searchParams.get("chapter");
  const q = searchParams.get("q");
  const limit = Math.min(Number(searchParams.get("limit") || 200), 500);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  let query = supabase
    .from("md_bank")
    .select("id, title, author, subject, chapter, tags, filename, description, created_at, created_by")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (subject) query = query.eq("subject", subject);
  if (author) query = query.eq("author", author);
  if (chapter) query = query.eq("chapter", chapter);
  if (q) query = query.or(`title.ilike.%${q}%,subject.ilike.%${q}%,author.ilike.%${q}%,chapter.ilike.%${q}%,description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    await log.error("md_bank_fetch_failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await log.success(200, `fetched ${(data||[]).length} md bank entries`);
  // Return raw array (no wrapper) to maintain backward compatibility with frontend
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const log = logRequest("POST /api/md-bank", null);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    await log.warn(403, "forbidden_admin_only");
    return NextResponse.json({ error: "forbidden_admin_only" }, { status: 403 });
  }

  const body = await request.json();
  const { title, author, subject, chapter, tags, content, filename, description } = body;

  if (!title || !content || !filename) {
    return NextResponse.json(
      { error: "title, content, and filename are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("md_bank")
    .upsert({
      title,
      author: author || "",
      subject: subject || "",
      chapter: chapter || "",
      tags: tags || [],
      content,
      filename,
      description: description || "",
      created_by: user.id,
    }, { onConflict: "filename", ignoreDuplicates: false })
    .select()
    .single();

  if (error) {
    await log.error("md_bank_upsert_failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await log.success(201, `md_bank entry created/updated: ${filename}`);
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: Request) {
  const log = logRequest("DELETE /api/md-bank", null);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    await log.warn(403, "forbidden_admin_only");
    return NextResponse.json({ error: "forbidden_admin_only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    await log.warn(400, "id parameter required");
    return NextResponse.json({ error: "id parameter required" }, { status: 400 });
  }

  const { error } = await supabase.from("md_bank").delete().eq("id", id);
  if (error) {
    await log.error("md_bank_delete_failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await log.success(200, `md_bank entry ${id} deleted`);
  return NextResponse.json({ success: true });
}
