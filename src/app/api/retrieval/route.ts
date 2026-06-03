import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logRequest } from "@/lib/server-log";

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 24);
}

type VaultChunk = {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_estimate: number;
  metadata: Record<string, string> | null;
  created_at: string;
};

type ScoredChunk = VaultChunk & { score: number };

function scoreChunk(chunk: { content?: string; metadata?: Record<string, string> | null }, queryTokens: string[], chapter: string | null): number {
  const metadata = chunk.metadata || {};
  const haystack = `${chunk.content || ""} ${metadata.title || ""} ${metadata.chapter || ""}`.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) score += token.length > 5 ? 3 : 2;
  }
  if (chapter && String(metadata.chapter || "").toLowerCase() === chapter.toLowerCase()) score += 8;
  return score;
}

export async function GET(request: Request) {
  const log = logRequest("GET /api/retrieval", null);
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    await log.warn(200, "supabase_not_configured");
    return NextResponse.json({ retrievals: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    await log.warn(401, "unauthorized");
    return NextResponse.json({ retrievals: [] }, { status: 401 });
  }
  log.setMeta("userId", user.id);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const chapter = searchParams.get("chapter");
  const limit = Math.min(Number(searchParams.get("limit") || 8), 16);
  const queryTokens = tokens(query);

  if (queryTokens.length === 0 && !chapter) {
    return NextResponse.json({ retrievals: [] });
  }

  let requestQuery = supabase
    .from("vault_chunks")
    .select("id,document_id,chunk_index,content,token_estimate,metadata,created_at")
    .eq("user_id", user.id)
    .limit(160);

  if (chapter) {
    requestQuery = requestQuery.contains("metadata", { chapter });
  }

  const { data, error } = await requestQuery;
  if (error) {
    return NextResponse.json({ retrievals: [], error: error.message }, { status: 500 });
  }

  const chunks = (data || []) as VaultChunk[];
  const retrievals = chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, queryTokens, chapter) }))
    .filter((chunk: ScoredChunk) => chunk.score > 0 || chapter)
    .sort((a: ScoredChunk, b: ScoredChunk) => b.score - a.score)
    .slice(0, limit)
    .map((chunk: ScoredChunk) => ({
      id: chunk.id,
      document_id: chunk.document_id,
      chunk_index: chunk.chunk_index,
      title: chunk.metadata?.title || "Vault chunk",
      chapter: chunk.metadata?.chapter || "",
      subject: chunk.metadata?.subject || "",
      source_path: chunk.metadata?.source_path || "",
      content: chunk.content,
      score: chunk.score,
      token_estimate: chunk.token_estimate,
    }));

  await log.success(200, `retrieved ${retrievals.length} chunks`);
  return NextResponse.json({ retrievals });
}
