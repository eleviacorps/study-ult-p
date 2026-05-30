import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_EMBEDDING_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_EMBEDDING_MODEL = "nvidia/llama-nemotron-embed-1b-v2";

export async function POST(request: Request) {
  const reqId = crypto.randomUUID().slice(0, 8);

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

    const requestBody: Record<string, unknown> = {
      input: Array.isArray(input) ? input : [input],
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
