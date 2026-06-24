import { NextResponse } from "next/server";
import { canonicalSlug, sha256Hex } from "@/lib/content-identity";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

type IncomingNote = {
  chapter: string;
  subject: string;
  author: string;
  path: string;
  title: string;
  content: string;
  tags?: string[];
};

// GET /api/notes — fetch all notes for the authenticated user
export async function GET() {
  const log = logRequest("GET /api/notes", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await log.warn(200, "supabase_not_configured, returning empty");
    return NextResponse.json({ notes: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await log.warn(200, "no user, returning empty");
    return NextResponse.json({ notes: [] });
  }
  log.setMeta("userId", user.id);

  const { data, error } = await supabase
    .from("user_notes")
    .select("chapter,subject,author,path,title,content,tags,content_hash")
    .eq("user_id", user.id)
    .order("chapter", { ascending: true })
    .limit(10000);

  if (error) {
    await log.error("notes_fetch_failed", error);
    return NextResponse.json({ notes: [] });
  }

  await log.success(200, `fetched ${(data||[]).length} notes`);
  return NextResponse.json({ notes: data || [] });
}

// POST /api/notes — upsert notes (array). Deduped by (user_id, path).
export async function POST(request: Request) {
  const log = logRequest("POST /api/notes", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await log.warn(501, "supabase_not_configured");
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await log.warn(401, "unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  log.setMeta("userId", user.id);

  const body = await request.json().catch(() => ({}));
  const notes: IncomingNote[] = body.notes;
  if (!Array.isArray(notes) || notes.length === 0) {
    return NextResponse.json({ synced: false, error: "no_notes" });
  }

  const errors: string[] = [];
  const skippedDuplicates: string[] = [];
  let upserted = 0;

  // Validate all notes first
  const validNotes = notes.filter((n) => isValidNote(n));
  for (const note of notes) {
    if (!isValidNote(note)) {
      errors.push(`${getUnknownPath(note)}: invalid_note_payload`);
    }
  }
  if (validNotes.length === 0) {
    return NextResponse.json({ synced: false, upserted: 0, skippedDuplicates, errors }, { status: 400 });
  }

  // Batch: fetch all existing content hashes for dedup
  const contentHashes: string[] = await Promise.all(
    validNotes.map((n) => sha256Hex(n.content))
  );
  const notesWithHashes = validNotes.map((n, i) => ({ ...n, contentHash: contentHashes[i] }));

  // Batch `in` queries in groups of 200 to avoid Supabase IN clause limits
  const BATCH_SIZE = 200;
  const allExistingHashes: Array<{ path: string; content_hash: string }> = [];
  for (let i = 0; i < contentHashes.length; i += BATCH_SIZE) {
    const batch = contentHashes.slice(i, i + BATCH_SIZE);
    const { data: batchResult } = await supabase
      .from("user_notes")
      .select("path,content_hash")
      .eq("user_id", user.id)
      .in("content_hash", batch);
    if (batchResult) allExistingHashes.push(...(batchResult as Array<{ path: string; content_hash: string }>));
  }

  const existingMap = new Map(
    allExistingHashes.map((r) => [r.content_hash, r.path])
  );

  // Filter duplicates and collect notes to upsert
  const toUpsert: Array<ReturnType<typeof normalizeNoteForDb>> = [];
  for (const note of notesWithHashes) {
    const existingPath = existingMap.get(note.contentHash);
    if (existingPath && existingPath !== note.path) {
      skippedDuplicates.push(`${note.path} duplicates ${existingPath}`);
      continue;
    }
    toUpsert.push(normalizeNoteForDb(user.id, note));
  }

  if (toUpsert.length > 0) {
    const { error: upsetErr } = await supabase.from("user_notes").upsert(
      toUpsert,
      { onConflict: "user_id,path", ignoreDuplicates: false }
    );
    if (upsetErr) {
      errors.push(`batch_upsert: ${upsetErr.message}`);
    } else {
      upserted = toUpsert.length;
      // Batch ingest: process all ingestion in parallel
      const ingestionResults = await Promise.allSettled(
        toUpsert.map((normalized) =>
          ingestVaultDocument(supabase, user.id, {
            chapter: normalized.chapter,
            subject: normalized.subject,
            path: normalized.path,
            title: normalized.title,
            content: normalized.content,
            tags: normalized.tags as string[] | undefined,
          } as IncomingNote, normalized.content_hash || "")
        )
      );
      for (let i = 0; i < ingestionResults.length; i++) {
        const result = ingestionResults[i];
        if (result.status === "rejected") {
          errors.push(`${toUpsert[i].path}: ingestion_failed`);
        } else if (result.value) {
          errors.push(`${toUpsert[i].path}: ${result.value}`);
        }
      }

      // Batch insert ingestion logs at the end instead of per-document
      const logEntries = ingestionResults
        .map((r, i) => (r.status === "fulfilled" && !r.value ? {
          user_id: user.id,
          source: toUpsert[i].path,
          content_hash: toUpsert[i].content_hash || "",
          status: "indexed",
          message: "Ingested via batch upsert",
          metadata: { canonical_slug: canonicalSlug(toUpsert[i].path || toUpsert[i].title) },
        } : null))
        .filter((x): x is NonNullable<typeof x> => x != null);
      if (logEntries.length > 0) {
        await supabase.from("vault_ingestion_logs").insert(logEntries);
      }
    }
  }

  if (errors.length > 0) {
    await log.warn(200, `notes upsert with errors: ${errors.join("; ")}`);
    return NextResponse.json({ synced: false, upserted, skippedDuplicates, errors });
  }

  await log.success(200, `upserted ${upserted} notes, skipped ${skippedDuplicates.length}`);
  return NextResponse.json({ synced: true, upserted, skippedDuplicates });
}

// DELETE /api/notes?chapter=xxx — delete all notes for a chapter (or all if no chapter)
export async function DELETE(request: Request) {
  const log = logRequest("DELETE /api/notes", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await log.warn(501, "supabase_not_configured");
    return NextResponse.json({ deleted: false, error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await log.warn(401, "unauthorized");
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  log.setMeta("userId", user.id);

  const { searchParams } = new URL(request.url);
  const chapter = searchParams.get("chapter");
  log.setMeta("chapter", chapter);

  let query = supabase.from("user_notes").delete().eq("user_id", user.id);
  if (chapter) {
    query = query.eq("chapter", chapter);
  }
  const { error } = await query;

  if (error) {
    await log.error("notes_delete_failed", error);
    return NextResponse.json({ deleted: false, error: error.message });
  }

  await log.success(200, `deleted notes for chapter=${chapter || "all"}`);
  return NextResponse.json({ deleted: true });
}

function normalizeNoteForDb(userId: string, note: IncomingNote & { contentHash: string }) {
  return {
    user_id: userId,
    chapter: note.chapter,
    subject: note.subject || "",
    author: note.author || "",
    path: note.path,
    title: note.title,
    content: note.content,
    content_hash: note.contentHash,
    canonical_slug: canonicalSlug(note.path || note.title),
    tags: note.tags || [],
  };
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

async function ingestVaultDocument(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, note: IncomingNote, contentHash: string): Promise<string | null> {
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
      { onConflict: "user_id,content_hash" }
    )
    .select("id")
    .single();

  if (documentError) return documentError.message;
  if (!document?.id) return "vault_document_missing";

  const chunks = await buildChunks(note.content, contentHash);

  if (chunks.length === 0) return null;

  const { error: chunkError } = await supabase.from("vault_chunks").upsert(
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
    })),
    { onConflict: "document_id,chunk_index", ignoreDuplicates: false }
  );

  if (chunkError) return chunkError.message;

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
