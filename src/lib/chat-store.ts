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

export type LocalChatSession = {
  id: string;
  title: string;
  type: ChatSessionType;
  updated_at: string;
  message_count: number;
};

const CHAT_KEY = "studyult-tutor-chat";
const SIDEBAR_CHAT_KEY = "studyult-tutor-sidebar-chat";
const CHAT_SYNC_DEBOUNCE_MS = 900;
const CHAT_SYNC_BATCH_SIZE = 24;

type QueuedChatSync = {
  messages: ChatMessage[];
  options: ChatSyncOptions;
  timer: ReturnType<typeof setTimeout>;
};

const chatSyncQueue = new Map<string, QueuedChatSync>();

function storageKey(key: string, suffix: string): string {
  return `${key}:${suffix}`;
}

function sessionMessagesKey(key: string, sessionId: string): string {
  return storageKey(key, `session:${sessionId}:messages`);
}

function sessionsIndexKey(key: string): string {
  return storageKey(key, "sessions-index");
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
    if (messages.length > 0) {
      const sessionId = getChatSessionId(key);
      const now = new Date().toISOString();
      const existing = listLocalChatSessions(key).filter((session) => session.id !== sessionId);
      const nextSession: LocalChatSession = {
        id: sessionId,
        title: inferTitle(messages),
        type: key === CHAT_KEY ? "physics_tutor" : "concept_discussion",
        updated_at: now,
        message_count: messages.length,
      };
      localStorage.setItem(sessionMessagesKey(key, sessionId), JSON.stringify(messages));
      localStorage.setItem(sessionsIndexKey(key), JSON.stringify([nextSession, ...existing].slice(0, 50)));
    }
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

export function listLocalChatSessions(key: string): LocalChatSession[] {
  try {
    const raw = localStorage.getItem(sessionsIndexKey(key));
    const sessions = raw ? JSON.parse(raw) : [];
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

export function loadLocalChatSession(key: string, sessionId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(sessionMessagesKey(key, sessionId));
    const messages = raw ? JSON.parse(raw) : [];
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

export function queueChatSyncToDB(key: string, messages: ChatMessage[], options: ChatSyncOptions = {}, delay = CHAT_SYNC_DEBOUNCE_MS) {
  if (messages.length === 0 || typeof window === "undefined") return;

  const existing = chatSyncQueue.get(key);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    chatSyncQueue.delete(key);
    syncChatToDB(key, messages, options).catch(() => {});
  }, delay);

  chatSyncQueue.set(key, { messages, options, timer });
}

export async function syncChatToDB(key: string, messages: ChatMessage[], options: ChatSyncOptions = {}): Promise<boolean> {
  if (messages.length === 0) return false;

  let syncedCount = 0;
  try {
    syncedCount = Number(localStorage.getItem(storageKey(key, "synced-count")) || "0");
  } catch {}

  if (syncedCount >= messages.length) return false;

  const sessionId = getChatSessionId(key);
  const allPending = messages.slice(syncedCount, syncedCount + CHAT_SYNC_BATCH_SIZE);
  // Skip empty assistant placeholders (pre-stream fill) to avoid 400 from /api/chat
  const pending = allPending.filter((m) => m.role !== "assistant" || m.content.trim().length > 0);
  if (pending.length === 0) {
    localStorage.setItem(storageKey(key, "synced-count"), String(syncedCount + allPending.length));
    return false;
  }

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
      const nextSyncedCount = syncedCount + pending.length;
      localStorage.setItem(storageKey(key, "synced-count"), String(nextSyncedCount));
      maybeSummarizeChat(key, sessionId, nextSyncedCount);
      if (nextSyncedCount < messages.length) {
        queueChatSyncToDB(key, messages, options, 120);
      }
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
