import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notes — fetch all notes for the authenticated user
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ notes: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ notes: [] });

  const { data, error } = await supabase
    .from("user_notes")
    .select("chapter,subject,path,title,content,tags")
    .eq("user_id", user.id)
    .order("chapter", { ascending: true });

  if (error) {
    console.error("Failed to fetch user notes:", error);
    return NextResponse.json({ notes: [] });
  }

  return NextResponse.json({ notes: data || [] });
}

// POST /api/notes — upsert notes (array). Deduped by (user_id, path).
export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const notes: { chapter: string; subject: string; path: string; title: string; content: string; tags?: string[] }[] = body.notes;
  if (!Array.isArray(notes) || notes.length === 0) {
    return NextResponse.json({ synced: false, error: "no_notes" });
  }

  const errors: string[] = [];
  for (const note of notes) {
    const { error } = await supabase.from("user_notes").upsert(
      {
        user_id: user.id,
        chapter: note.chapter,
        subject: note.subject || "",
        path: note.path,
        title: note.title,
        content: note.content,
        tags: note.tags || [],
      },
      { onConflict: "user_id,path" }
    );
    if (error) errors.push(`${note.path}: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ synced: false, errors });
  }

  return NextResponse.json({ synced: true });
}

// DELETE /api/notes?chapter=xxx — delete all notes for a chapter (or all if no chapter)
export async function DELETE(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ deleted: false, error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const chapter = searchParams.get("chapter");

  let query = supabase.from("user_notes").delete().eq("user_id", user.id);
  if (chapter) {
    query = query.eq("chapter", chapter);
  }
  const { error } = await query;

  if (error) {
    return NextResponse.json({ deleted: false, error: error.message });
  }

  return NextResponse.json({ deleted: true });
}
