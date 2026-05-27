import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/chat?session_id=xxx — fetch messages for a session
export async function GET(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ messages: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ messages: [] });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  let query = supabase
    .from("chat_messages")
    .select("role,content,created_at,session_id")
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

// POST /api/chat — save one or more messages
export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 501 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const messages: { session_id: string; role: string; content: string }[] = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ synced: false, error: "no_messages" });
  }

  const rows = messages.map((m) => ({
    user_id: user.id,
    session_id: m.session_id,
    role: m.role,
    content: m.content,
  }));

  const { error } = await supabase.from("chat_messages").insert(rows);
  if (error) {
    return NextResponse.json({ synced: false, error: error.message });
  }

  return NextResponse.json({ synced: true });
}
