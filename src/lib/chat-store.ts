"use client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
}

const CHAT_KEY = "studyult-tutor-chat";
const SIDEBAR_CHAT_KEY = "studyult-tutor-sidebar-chat";

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  return sessionId;
}

export function loadChat(key: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveChat(key: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(key, JSON.stringify(messages));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearChat(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// Sync messages to Supabase (fire-and-forget, only if authenticated)
export function syncChatToDB(messages: ChatMessage[]) {
  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({
        session_id: getSessionId(),
        role: m.role,
        content: m.content,
      })),
    }),
  }).catch(() => {});
}

export function getTutorKey() {
  return CHAT_KEY;
}

export function getSidebarKey() {
  return SIDEBAR_CHAT_KEY;
}
