import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "edge";

const DEFAULT_AI_BASE_URL = "https://opencode.ai/zen";
const DEFAULT_AI_MODEL = "deepseek-v4-flash-free";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
};

export async function POST(request: Request) {
  const reqId = crypto.randomUUID().slice(0, 8);
  console.log(`[LLM ${reqId}] POST /api/llm`);

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const messages: Record<string, unknown>[] = Array.isArray(body.messages) ? body.messages.filter(isValidMessage).map(normalizeMessage) : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "missing_messages" }, { status: 400 });
    }
    // Reject oversized requests before forwarding to provider
    const estimatedSize = JSON.stringify({ messages }).length;
    if (estimatedSize > 500_000) {
      return NextResponse.json({ error: "request_too_large", detail: `Payload ${(estimatedSize / 1024).toFixed(0)}KB exceeds 500KB limit` }, { status: 413 });
    }

    const baseUrl = getServerAiBaseUrl();
    const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;
    const apiKey = process.env.AI_API_KEY || process.env.OPENCODE_API_KEY || "";
    const hdrs: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) hdrs.Authorization = `Bearer ${apiKey}`;

    const isStream = body.stream === true;

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      max_tokens: typeof body.max_tokens === "number" ? Math.min(body.max_tokens, 32768) : 32768,
      temperature: typeof body.temperature === "number" ? body.temperature : 0.25,
      top_p: typeof body.top_p === "number" ? body.top_p : 0.9,
      stream: isStream,
    };
    if (Array.isArray(body.tools)) requestBody.tools = body.tools;
    if (body.tool_choice) requestBody.tool_choice = body.tool_choice;

    console.log(`[LLM ${reqId}] → ${baseUrl}/v1/chat/completions model=${model} msgs=${messages.length} max_tokens=${requestBody.max_tokens}`);

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: hdrs,
      body: JSON.stringify(requestBody),
    });

    console.log(`[LLM ${reqId}] ← ${res.status}`);

    // Always pipe the provider response body through — do NOT buffer it.
    // Buffering with await res.text() keeps the Edge function wall clock
    // ticking until the entire response arrives. On Hobby (30s wall limit),
    // a slow provider response causes FUNCTION_INVOCATION_TIMEOUT.
    // Piping returns the function as soon as the first byte arrives (~1-3s).
    if (!res.body) {
      return NextResponse.json({ error: "empty_response" }, { status: 502 });
    }
    const contentType = isStream ? "text/event-stream" : "application/json";
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isStream ? "no-cache" : "private",
      },
    });
  } catch (err: unknown) {
    console.log(`[LLM ${reqId}] × exception:`, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown_error" }, { status: 500 });
  }
}

function getServerAiBaseUrl(): string {
  return (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
}

function isValidMessage(message: unknown): message is ChatMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<ChatMessage>;
  return (
    (candidate.role === "system" ||
      candidate.role === "user" ||
      candidate.role === "assistant" ||
      candidate.role === "tool") &&
    (typeof candidate.content === "string" || Array.isArray(candidate.tool_calls))
  );
}

function normalizeMessage(message: ChatMessage): Record<string, unknown> {
  const normalized: Record<string, unknown> = {
    role: message.role,
    content: typeof message.content === "string" ? message.content : "",
  };
  if (Array.isArray(message.tool_calls)) normalized.tool_calls = message.tool_calls;
  if (message.tool_call_id) normalized.tool_call_id = message.tool_call_id;
  if (message.name) normalized.name = message.name;
  return normalized;
}
