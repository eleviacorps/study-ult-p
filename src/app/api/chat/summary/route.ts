import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_AI_BASE_URL = "https://opencode.ai/zen";
const DEFAULT_AI_MODEL = "deepseek-v4-flash-free";

async function summarizeWithAi(transcript: string): Promise<string> {
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/+$/, "");
  const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;
  const apiKey = process.env.AI_API_KEY || process.env.OPENCODE_API_KEY || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Summarize this StudyUlt tutoring session for future retrieval. Include goals, concepts discussed, misconceptions, unresolved questions, and next actions. Keep it under 180 words.",
        },
        { role: "user", content: transcript.slice(0, 12000) },
      ],
      temperature: 0.2,
      max_tokens: 700,
    }),
  });

  if (!response.ok) throw new Error("summary_failed");
  const data = await response.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

function fallbackSummary(transcript: string): string {
  const compact = transcript.replace(/\s+/g, " ").trim();
  return compact.length > 700 ? `${compact.slice(0, 700)}...` : compact;
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ summarized: false, error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ summarized: false, error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!sessionId) return NextResponse.json({ summarized: false, error: "session_id_required" }, { status: 400 });

  const { data: session, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("id,title,type")
    .eq("user_id", user.id)
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) return NextResponse.json({ summarized: false, error: "session_not_found" }, { status: 404 });

  const { data: messages, error: messageError } = await supabase
    .from("chat_messages")
    .select("id,role,content,created_at")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (messageError) return NextResponse.json({ summarized: false, error: messageError.message }, { status: 500 });

  const rows = messages || [];
  if (rows.length < 6) return NextResponse.json({ summarized: false, reason: "not_enough_messages" });

  const transcript = rows.map((message: any) => `${message.role}: ${message.content}`).join("\n\n");
  let summary = fallbackSummary(transcript);
  try {
    summary = await summarizeWithAi(transcript);
  } catch {
    // Fall back to deterministic compression so memory still advances.
  }

  const coveredMessageIds = rows.map((message: any) => message.id);
  const tokenEstimate = Math.ceil(summary.length / 4);
  const now = new Date().toISOString();

  const { error: summaryError } = await supabase.from("chat_context_summaries").insert({
    user_id: user.id,
    session_id: sessionId,
    summary,
    covered_message_ids: coveredMessageIds,
    token_estimate: tokenEstimate,
  });
  if (summaryError) return NextResponse.json({ summarized: false, error: summaryError.message }, { status: 500 });

  await supabase
    .from("chat_sessions")
    .update({ summary, updated_at: now })
    .eq("user_id", user.id)
    .eq("id", sessionId);

  return NextResponse.json({ summarized: true, summary, tokenEstimate });
}
