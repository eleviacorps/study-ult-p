import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_EMBEDDING_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_EMBEDDING_MODEL = "nvidia/llama-nemotron-embed-1b-v2";

function isGeminiProvider(baseUrl: string): boolean {
  return baseUrl.includes("generativelanguage.googleapis.com");
}

export async function POST(request: Request) {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const input = body.input;
    const inputType = body.input_type || "passage";
    if (!input || (Array.isArray(input) && input.length === 0)) {
      return NextResponse.json({ error: "missing_input" }, { status: 400 });
    }

    const baseUrl = (process.env.EMBEDDING_BASE_URL || DEFAULT_EMBEDDING_BASE_URL).replace(/\/+$/, "");
    const model = process.env.EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
    const apiKey = process.env.EMBEDDING_API_KEY || "";
    const texts = Array.isArray(input) ? input : [input];

    // ── Gemini native API (not OpenAI-compatible) ──
    if (isGeminiProvider(baseUrl)) {
      if (!apiKey) return NextResponse.json({ error: "missing_api_key" }, { status: 400 });

      const requests = texts.map((t: string) => ({
        model: `models/${model}`,
        content: { parts: [{ text: t }] },
      }));

      const url = requests.length === 1
        ? `${baseUrl}/models/${model}:embedContent?key=${apiKey}`
        : `${baseUrl}/models/${model}:batchEmbedContents?key=${apiKey}`;

      const geminiBody = requests.length === 1
        ? requests[0]
        : { requests };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });

      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json(
          { error: `embedding_api_error: ${text.substring(0, 500)}` },
          { status: res.status }
        );
      }

      const geminiRes = JSON.parse(text);
      // Convert Gemini response → OpenAI format
      const embeddings = geminiRes.embeddings
        ? geminiRes.embeddings.map((e: { values?: number[] }, i: number) => ({
            embedding: e.values,
            index: i,
          }))
        : geminiRes.embedding
          ? [{ embedding: geminiRes.embedding.values, index: 0 }]
          : [];

      return NextResponse.json({ data: embeddings }, { status: 200 });
    }

    // ── OpenAI-compatible (NVIDIA, etc.) ──
    const requestBody: Record<string, unknown> = {
      input: texts,
      model,
      encoding_format: "float",
      input_type: inputType,
    };

    const hdrs: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) hdrs.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify(requestBody),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `embedding_api_error: ${text.substring(0, 500)}` },
        { status: res.status }
      );
    }

    const data = JSON.parse(text);
    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "use POST" }, { status: 405 });
}
