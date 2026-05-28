import { NextResponse } from "next/server";

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
  try {
    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages.filter(isValidMessage).map(normalizeMessage) : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "missing_messages" }, { status: 400 });
    }

    const baseUrl = getServerAiBaseUrl();
    const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;
    const apiKey = process.env.AI_API_KEY || process.env.OPENCODE_API_KEY || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const requestBody: Record<string, unknown> = {
      model,
      messages,
      max_tokens: typeof body.max_tokens === "number" ? Math.min(body.max_tokens, 8192) : 4096,
      temperature: typeof body.temperature === "number" ? body.temperature : 0.25,
      top_p: typeof body.top_p === "number" ? body.top_p : 0.9,
    };
    if (Array.isArray(body.tools)) requestBody.tools = body.tools;
    if (body.tool_choice) requestBody.tool_choice = body.tool_choice;

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
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
