import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { provider, baseUrl, apiKey } = await request.json();

    if (!provider || !baseUrl) {
      return NextResponse.json({ models: [] }, { status: 400 });
    }

    const cleanUrl = baseUrl.replace(/\/+$/, "");

    // Anthropic doesn't have a models API — return known models
    if (provider === "anthropic") {
      return NextResponse.json({
        models: [
          "claude-sonnet-4-20250514",
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229",
        ],
      });
    }

    // Ollama's models endpoint
    if (provider === "ollama") {
      const res = await fetch(`${cleanUrl}/api/tags`, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const models = data.models?.map((m: any) => m.name) || [];
        return NextResponse.json({ models });
      }
      return NextResponse.json({ models: [] }, { status: 502 });
    }

    // OpenAI / LM Studio / Custom — use /v1/models
    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(`${cleanUrl}/v1/models`, { headers });

    if (res.ok) {
      const data = await res.json();
      const models = data.data?.map((m: any) => m.id) || [];
      return NextResponse.json({ models });
    }

    return NextResponse.json({ models: [] }, { status: 502 });
  } catch {
    return NextResponse.json({ models: [] }, { status: 502 });
  }
}
