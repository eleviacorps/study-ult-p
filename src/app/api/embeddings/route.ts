import { NextResponse } from "next/server";

export const runtime = "edge";

// Embeddings endpoint removed — embeddings are pre-generated locally and pushed to Supabase.
// The RAG system that called this endpoint has also been removed.
export async function POST() {
  return NextResponse.json({ error: "gone", message: "Embeddings are pre-generated locally. This endpoint is no longer available." }, { status: 410 });
}
