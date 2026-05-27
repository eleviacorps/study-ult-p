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

async function proxyCompletion(messages: { role: string; content: string }[]): Promise<LlmResponse> {
  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, max_tokens: 32768 }),
    });
    const data = await res.json();
    if (!res.ok) {
      const error = data?.error?.message || data?.error || `API error (${res.status})`;
      return { content: `AI service error: ${error}`, reasoning: "" };
    }
    const message = data.choices?.[0]?.message;
    return {
      content: message?.content || message?.reasoning_content || data.content?.[0]?.text || "",
      reasoning: message?.reasoning_content || "",
    };
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
        ? [{ role: "system", content: context.substring(0, 8000) }, { role: "user", content: question }]
        : [{ role: "user", content: context.substring(0, 8000) }];
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
