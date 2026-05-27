import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ChatSessionType =
  | "physics_tutor"
  | "revision_planner"
  | "mock_test_review"
  | "concept_discussion"
  | "problem_solving"
  | "strategy_coaching";

type IncomingMessage = {
  session_id: string;
  client_id?: string;
  role: string;
  content: string;
};

type IncomingSession = {
  id: string;
  type?: ChatSessionType;
  title?: string;
  subject?: string;
  chapter?: string;
  scope?: Record<string, unknown>;
};

const CHAT_TYPES = new Set<string>([
  "physics_tutor",
  "revision_planner",
  "mock_test_review",
  "concept_discussion",
  "problem_solving",
  "strategy_coaching",
]);

// GET /api/chat?sessions=1 returns scoped chat sessions.
// GET /api/chat?session_id=xxx returns messages for a session.
export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ messages: [], sessions: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ messages: [], sessions: [] });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (searchParams.get("sessions") === "1") {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id,type,title,subject,chapter,scope,summary,last_message_at,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch chat sessions:", error);
      return NextResponse.json({ sessions: [] });
    }

    return NextResponse.json({ sessions: data || [] });
  }

  let query = supabase
    .from("chat_messages")
    .select("role,content,created_at,session_id,client_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch chat messages:", error);
    return NextResponse.json({ messages: [] });
  }

  return NextResponse.json({ messages: data || [] });
}

// POST /api/chat saves one or more messages under a first-class chat session.
export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const messages: IncomingMessage[] = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ synced: false, error: "no_messages" });
  }

  const firstValidMessage = messages.find(isValidMessage);
  if (!firstValidMessage) {
    return NextResponse.json({ synced: false, error: "invalid_messages" }, { status: 400 });
  }

  const session = normalizeSession(body.session, firstValidMessage.session_id);
  const now = new Date().toISOString();
  const { error: sessionError } = await supabase.from("chat_sessions").upsert(
    {
      user_id: user.id,
      id: session.id,
      type: session.type,
      title: session.title,
      subject: session.subject,
      chapter: session.chapter,
      scope: session.scope,
      last_message_at: now,
      updated_at: now,
    },
    { onConflict: "id" }
  );

  if (sessionError) {
    return NextResponse.json({ synced: false, error: sessionError.message });
  }

  const rows = messages
    .filter(isValidMessage)
    .map((message) => ({
      user_id: user.id,
      session_id: session.id,
      client_id: message.client_id || null,
      role: message.role,
      content: message.content,
    }));

  const { error } = await supabase
    .from("chat_messages")
    .upsert(rows, { onConflict: "user_id,session_id,client_id", ignoreDuplicates: true });

  if (error) {
    return NextResponse.json({ synced: false, error: error.message });
  }

  return NextResponse.json({ synced: true, session_id: session.id, inserted: rows.length });
}

function isValidMessage(message: unknown): message is IncomingMessage {
  if (!message || typeof message !== "object") return false;
  const candidate = message as Partial<IncomingMessage>;
  return (
    typeof candidate.session_id === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.content === "string" &&
    candidate.session_id.trim().length > 0 &&
    candidate.content.trim().length > 0 &&
    (candidate.role === "user" || candidate.role === "assistant")
  );
}

function normalizeSession(rawSession: unknown, fallbackId: string): Required<IncomingSession> {
  const session = rawSession && typeof rawSession === "object" ? rawSession as Partial<IncomingSession> : {};
  const type = session.type && CHAT_TYPES.has(session.type) ? session.type : "concept_discussion";
  return {
    id: typeof session.id === "string" && session.id.trim() ? session.id : fallbackId,
    type,
    title: typeof session.title === "string" && session.title.trim() ? session.title.slice(0, 120) : "New Chat",
    subject: typeof session.subject === "string" ? session.subject.slice(0, 80) : "",
    chapter: typeof session.chapter === "string" ? session.chapter.slice(0, 120) : "",
    scope: session.scope && typeof session.scope === "object" ? session.scope : {},
  };
}
