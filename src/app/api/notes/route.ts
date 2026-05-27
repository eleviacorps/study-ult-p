import { NextResponse } from "next/server";
import { canonicalSlug, sha256Hex } from "@/lib/content-identity";
import { createClient } from "@/lib/supabase/server";

type IncomingNote = {
  chapter: string;
  subject: string;
  path: string;
  title: string;
  content: string;
  tags?: string[];
};

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
    .select("chapter,subject,path,title,content,tags,content_hash")
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

  const body = await request.json().catch(() => ({}));
  const notes: IncomingNote[] = body.notes;
  if (!Array.isArray(notes) || notes.length === 0) {
    return NextResponse.json({ synced: false, error: "no_notes" });
  }

  const errors: string[] = [];
  const skippedDuplicates: string[] = [];
  let upserted = 0;

  for (const note of notes) {
    if (!isValidNote(note)) {
      errors.push(`${getUnknownPath(note)}: invalid_note_payload`);
      continue;
    }

    const contentHash = await sha256Hex(note.content);
    const { data: duplicate, error: duplicateError } = await supabase
      .from("user_notes")
      .select("path")
      .eq("user_id", user.id)
      .eq("content_hash", contentHash)
      .maybeSingle();

    if (duplicateError) {
      errors.push(`${note.path}: ${duplicateError.message}`);
      continue;
    }

    if (duplicate && duplicate.path !== note.path) {
      skippedDuplicates.push(`${note.path} duplicates ${duplicate.path}`);
      continue;
    }

    const { error } = await supabase.from("user_notes").upsert(
      {
        user_id: user.id,
        chapter: note.chapter,
        subject: note.subject || "",
        path: note.path,
        title: note.title,
        content: note.content,
        content_hash: contentHash,
        canonical_slug: canonicalSlug(note.path || note.title),
        tags: note.tags || [],
      },
      { onConflict: "user_id,path" }
    );
    if (error) errors.push(`${note.path}: ${error.message}`);
    else upserted++;
  }

  if (errors.length > 0) {
    return NextResponse.json({ synced: false, upserted, skippedDuplicates, errors });
  }

  return NextResponse.json({ synced: true, upserted, skippedDuplicates });
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

function isValidNote(note: unknown): note is IncomingNote {
  if (!note || typeof note !== "object") return false;
  const candidate = note as Partial<IncomingNote>;
  return (
    typeof candidate.chapter === "string" &&
    typeof candidate.subject === "string" &&
    typeof candidate.path === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.content === "string" &&
    candidate.chapter.trim().length > 0 &&
    candidate.path.trim().length > 0 &&
    candidate.title.trim().length > 0
  );
}

function getUnknownPath(note: unknown): string {
  if (!note || typeof note !== "object") return "unknown";
  const path = (note as { path?: unknown }).path;
  return typeof path === "string" && path.trim() ? path : "unknown";
}
