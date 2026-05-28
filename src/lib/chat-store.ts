"use client";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
}

export type ChatSessionType =
  | "physics_tutor"
  | "revision_planner"
  | "mock_test_review"
  | "concept_discussion"
  | "problem_solving"
  | "strategy_coaching";

interface ChatSyncOptions {
  type?: ChatSessionType;
  title?: string;
  subject?: string;
  chapter?: string;
  scope?: Record<string, unknown>;
}

const CHAT_KEY = "studyult-tutor-chat";
const SIDEBAR_CHAT_KEY = "studyult-tutor-sidebar-chat";

function storageKey(key: string, suffix: string): string {
  return `${key}:${suffix}`;
}

function createId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getChatSessionId(key: string): string {
  const idKey = storageKey(key, "session-id");
  try {
    const existing = localStorage.getItem(idKey);
    if (existing) return existing;
    const next = createId();
    localStorage.setItem(idKey, next);
    return next;
  } catch {
    return createId();
  }
}

export async function getChatSessionSummary(key: string): Promise<string> {
  try {
    const sessionId = getChatSessionId(key);
    const res = await fetch(`/api/chat?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) return "";
    const data = await res.json();
    return typeof data.session?.summary === "string" ? data.session.summary : "";
  } catch {
    return "";
  }
}

export function resetChatSession(key: string) {
  try {
    localStorage.removeItem(storageKey(key, "session-id"));
    localStorage.removeItem(storageKey(key, "synced-count"));
  } catch {}
}

export function setChatSession(key: string, sessionId: string, syncedCount = 0) {
  try {
    localStorage.setItem(storageKey(key, "session-id"), sessionId);
    localStorage.setItem(storageKey(key, "synced-count"), String(syncedCount));
    localStorage.setItem(storageKey(key, "summarized-count"), String(syncedCount));
  } catch {}
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
    resetChatSession(key);
  } catch {}
}

export async function syncChatToDB(key: string, messages: ChatMessage[], options: ChatSyncOptions = {}): Promise<boolean> {
  if (messages.length === 0) return false;

  let syncedCount = 0;
  try {
    syncedCount = Number(localStorage.getItem(storageKey(key, "synced-count")) || "0");
  } catch {}

  if (syncedCount >= messages.length) return false;

  const sessionId = getChatSessionId(key);
  const pending = messages.slice(syncedCount);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          id: sessionId,
          type: options.type || "concept_discussion",
          title: options.title || inferTitle(messages),
          subject: options.subject || "",
          chapter: options.chapter || "",
          scope: options.scope || {},
        },
        messages: pending.map((message, index) => ({
          session_id: sessionId,
          client_id: `${sessionId}-${syncedCount + index}`,
          role: message.role,
          content: message.content,
        })),
      }),
    });
    if (res.ok) {
      localStorage.setItem(storageKey(key, "synced-count"), String(messages.length));
      maybeSummarizeChat(key, sessionId, messages.length);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function maybeSummarizeChat(key: string, sessionId: string, messageCount: number) {
  if (messageCount < 8) return;

  const summaryKey = storageKey(key, "summarized-count");
  let summarizedCount = 0;
  try {
    summarizedCount = Number(localStorage.getItem(summaryKey) || "0");
  } catch {}

  if (messageCount - summarizedCount < 6) return;

  fetch("/api/chat/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  })
    .then((res) => {
      if (res.ok) localStorage.setItem(summaryKey, String(messageCount));
    })
    .catch(() => {});
}

export function getTutorKey() {
  return CHAT_KEY;
}

export function getSidebarKey() {
  return SIDEBAR_CHAT_KEY;
}

function inferTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user")?.content;
  return firstUserMessage ? firstUserMessage.slice(0, 80) : "New Chat";
}
