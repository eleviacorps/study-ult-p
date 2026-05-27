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
    if (error) {
      errors.push(`${note.path}: ${error.message}`);
    } else {
      const ingestionError = await ingestVaultDocument(supabase, user.id, note, contentHash);
      if (ingestionError) errors.push(`${note.path}: ${ingestionError}`);
      upserted++;
    }
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

async function ingestVaultDocument(supabase: any, userId: string, note: IncomingNote, contentHash: string): Promise<string | null> {
  const slug = canonicalSlug(note.path || note.title);
  const now = new Date().toISOString();
  const { data: document, error: documentError } = await supabase
    .from("vault_documents")
    .upsert(
      {
        user_id: userId,
        source_path: note.path,
        subject: note.subject || "",
        chapter: note.chapter,
        title: note.title,
        content_hash: contentHash,
        canonical_slug: slug,
        metadata: { source: "user_notes", tags: note.tags || [] },
        updated_at: now,
      },
      { onConflict: "content_hash" }
    )
    .select("id")
    .single();

  if (documentError) return documentError.message;
  if (!document?.id) return "vault_document_missing";

  const chunks = await buildChunks(note.content, contentHash);
  await supabase.from("vault_chunks").delete().eq("document_id", document.id);

  if (chunks.length === 0) return null;

  const { error: chunkError } = await supabase.from("vault_chunks").insert(
    chunks.map((chunk, index) => ({
      document_id: document.id,
      user_id: userId,
      chunk_index: index,
      content: chunk.content,
      content_hash: chunk.hash,
      token_estimate: Math.ceil(chunk.content.length / 4),
      metadata: {
        title: note.title,
        chapter: note.chapter,
        subject: note.subject || "",
        source_path: note.path,
      },
    }))
  );

  if (chunkError) return chunkError.message;

  await supabase.from("vault_ingestion_logs").insert({
    user_id: userId,
    source: note.path,
    content_hash: contentHash,
    status: "indexed",
    message: `Indexed ${chunks.length} retrieval chunks`,
    metadata: { document_id: document.id, canonical_slug: slug },
  });

  return null;
}

async function buildChunks(content: string, documentHash: string): Promise<{ content: string; hash: string }[]> {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections = normalized
    .split(/\n(?=#{1,3}\s+)/g)
    .map((section) => section.trim())
    .filter(Boolean);
  const sourceBlocks = sections.length > 0 ? sections : [normalized];
  const chunks: string[] = [];

  for (const block of sourceBlocks) {
    if (block.length <= 1400) {
      chunks.push(block);
      continue;
    }
    const paragraphs = block.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
    let current = "";
    for (const paragraph of paragraphs) {
      if (`${current}\n\n${paragraph}`.length > 1400 && current) {
        chunks.push(current);
        current = paragraph;
      } else {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
      }
    }
    if (current) chunks.push(current);
  }

  return Promise.all(
    chunks.slice(0, 80).map(async (chunk, index) => ({
      content: chunk.slice(0, 1800),
      hash: await sha256Hex(`${documentHash}:${index}:${chunk}`),
    }))
  );
}
