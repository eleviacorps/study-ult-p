"use client";

import { createContext, useCallback, useContext, useState } from "react";

export interface LlmConfig {
  enabled: boolean;
}

interface LlmResponse {
  content: string;
  reasoning: string;
}

interface LlmContextValue {
  config: LlmConfig;
  ask: (context: string, question: string) => Promise<LlmResponse>;
  isAsking: boolean;
}

const LlmContext = createContext<LlmContextValue | null>(null);
const SERVER_CONFIGURED_LLM: LlmConfig = { enabled: true };
const LLM_CACHE_PREFIX = "studyult-llm-cache:";
const LLM_CACHE_TTL_MS = 10 * 60 * 1000;

async function digest(value: string): Promise<string> {
  try {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return btoa(unescape(encodeURIComponent(value))).slice(0, 96);
  }
}

async function readCachedResponse(messages: { role: string; content: string }[]): Promise<LlmResponse | null> {
  try {
    const key = LLM_CACHE_PREFIX + await digest(JSON.stringify(messages));
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { timestamp: number; response: LlmResponse };
    if (Date.now() - entry.timestamp > LLM_CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return entry.response;
  } catch {
    return null;
  }
}

async function writeCachedResponse(messages: { role: string; content: string }[], response: LlmResponse): Promise<void> {
  try {
    const key = LLM_CACHE_PREFIX + await digest(JSON.stringify(messages));
    sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), response }));
  } catch {
    // Session storage unavailable or full.
  }
}

async function proxyCompletion(messages: { role: string; content: string }[]): Promise<LlmResponse> {
  try {
    const cached = await readCachedResponse(messages);
    if (cached) return cached;

    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, max_tokens: 4096 }),
    });
    const data = await res.json();
    if (!res.ok) {
      const error = data?.error?.message || data?.error || `API error (${res.status})`;
      return { content: `AI service error: ${error}`, reasoning: "" };
    }
    const message = data.choices?.[0]?.message;
    const response = {
      content: message?.content || message?.reasoning_content || data.content?.[0]?.text || "",
      reasoning: message?.reasoning_content || "",
    };
    if (response.content) await writeCachedResponse(messages, response);
    return response;
  } catch (error: any) {
    return { content: `AI service error: ${error?.message || "Request failed"}`, reasoning: "" };
  }
}

export function LlmProvider({ children }: { children: React.ReactNode }) {
  const [isAsking, setIsAsking] = useState(false);

  const ask = useCallback(async (context: string, question: string): Promise<LlmResponse> => {
    setIsAsking(true);
    try {
      const messages = question
        ? [{ role: "system", content: context }, { role: "user", content: question }]
        : [{ role: "user", content: context }];
      return await proxyCompletion(messages);
    } finally {
      setIsAsking(false);
    }
  }, []);

  return (
    <LlmContext.Provider value={{ config: SERVER_CONFIGURED_LLM, ask, isAsking }}>
      {children}
    </LlmContext.Provider>
  );
}

export function useLlm() {
  const ctx = useContext(LlmContext);
  if (!ctx) throw new Error("useLlm must be used within LlmProvider");
  return ctx;
}
