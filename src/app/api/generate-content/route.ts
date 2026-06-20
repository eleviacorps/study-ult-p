import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = "https://opencode.ai/zen";
const DEFAULT_MODEL = "deepseek-v4-flash-free";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const maxTokens = Math.min(Number(body.max_tokens) || 65536, 65536);
    if (!prompt) return NextResponse.json({ error: "missing_prompt" }, { status: 400 });

    const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const model = process.env.AI_MODEL || DEFAULT_MODEL;
    const apiKey = process.env.AI_API_KEY || process.env.OPENCODE_API_KEY || "";
    if (!apiKey) return NextResponse.json({ error: "no_api_key" }, { status: 500 });

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: AbortSignal.timeout(300_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: "provider_error", detail: err.substring(0, 1000) }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    return NextResponse.json({
      success: true,
      content,
      bytes: content.length,
      lines: content.split("\n").length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
