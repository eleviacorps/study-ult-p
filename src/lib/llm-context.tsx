"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

declare const Capacitor: any | undefined;

function isNative(): boolean {
  try { return typeof Capacitor !== "undefined"; } catch { return false; }
}

export type AiProvider = "openai" | "anthropic" | "lmstudio" | "ollama" | "custom";

export interface LlmConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
}

interface LlmResponse {
  content: string;
  reasoning: string;
}

interface LlmContextValue {
  config: LlmConfig;
  setProvider: (p: AiProvider) => void;
  setApiKey: (key: string) => void;
  setBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  toggleEnabled: () => void;
  ask: (context: string, question: string) => Promise<LlmResponse>;
  isAsking: boolean;
  availableModels: string[];
  fetchModels: () => Promise<void>;
}

const LlmContext = createContext<LlmContextValue | null>(null);

export const PROVIDER_DEFAULTS: Record<AiProvider, { baseUrl: string; label: string }> = {
  openai: { baseUrl: "https://api.openai.com", label: "OpenAI" },
  anthropic: { baseUrl: "https://api.anthropic.com", label: "Anthropic Claude" },
  lmstudio: { baseUrl: "http://localhost:1234", label: "LM Studio (Local)" },
  ollama: { baseUrl: "http://localhost:11434", label: "Ollama (Local)" },
  custom: { baseUrl: "", label: "Custom API" },
};

function normalizeProvider(raw: any): AiProvider {
  if (typeof raw === "string" && PROVIDER_DEFAULTS[raw as AiProvider]) return raw as AiProvider;
  return "lmstudio";
}

function getDefaultConfig(): LlmConfig {
  return { provider: "custom", apiKey: "", baseUrl: "server-configured", model: "server-configured", enabled: true };
}

function loadConfig(): LlmConfig {
  return getDefaultConfig();
}

function saveConfig(c: LlmConfig) {
  void c;
}

export function LlmProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LlmConfig>(loadConfig);
  const [isAsking, setIsAsking] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => { setConfig(loadConfig()); }, []);

  const setProvider = useCallback((provider: AiProvider) => {
    setConfig((prev) => {
      const next = { ...prev, provider };
      saveConfig(next);
      return next;
    });
  }, []);

  const setApiKey = useCallback((apiKey: string) => {
    setConfig((prev) => { const n = { ...prev, apiKey }; saveConfig(n); return n; });
  }, []);

  const setBaseUrl = useCallback((baseUrl: string) => {
    setConfig((prev) => { const n = { ...prev, baseUrl }; saveConfig(n); return n; });
  }, []);

  const setModel = useCallback((model: string) => {
    setConfig((prev) => { const n = { ...prev, model }; saveConfig(n); return n; });
  }, []);

  const toggleEnabled = useCallback(() => {
    setConfig((prev) => { const n = { ...prev, enabled: true }; saveConfig(n); return n; });
  }, []);

  function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, "");
  }

  async function capFetch(url: string, opts: RequestInit): Promise<{ data: any; status: number; headers: any }> {
    const { CapacitorHttp } = await import("@capacitor/core");
    const method = (opts.method || "GET").toUpperCase();
    const headers = (opts.headers as Record<string, string>) || {};
    const body = opts.body ? JSON.parse(opts.body as string) : undefined;
    const res = await CapacitorHttp.request({ url, method, headers, data: body });
    return { data: res.data, status: res.status, headers: res.headers };
  }

  async function tryProxy(
    provider: AiProvider,
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
  ): Promise<{ content: string; reasoning: string } | null> {
    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, max_tokens: 32768 }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error?.message || data?.error || `API error (${res.status})`;
        return { content: `Proxy error: ${errMsg}`, reasoning: "" };
      }
      const msg = data.choices?.[0]?.message;
      return { content: msg?.content || msg?.reasoning_content || data.content?.[0]?.text || "", reasoning: "" };
    } catch (e: any) {
      return { content: `Proxy error: ${e?.message || "Request failed"}`, reasoning: "" };
    }
  }

  async function directLlmCompletion(
    provider: AiProvider,
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
  ): Promise<{ content: string; reasoning: string }> {
    if (isNative()) {
      const proxyResult = await tryProxy(provider, baseUrl, apiKey, model, messages);
      if (proxyResult) return proxyResult;
      return nativeDirectCall(provider, normalizeBaseUrl(baseUrl), apiKey, model, messages);
    }
    const result = await tryProxy(provider, baseUrl, apiKey, model, messages);
    if (result) return result;
    return { content: "AI request failed — check your API key and model name in Settings", reasoning: "" };
  }

  async function nativeDirectCall(
    provider: AiProvider,
    bUrl: string,
    apiKey: string,
    model: string,
    messages: { role: string; content: string }[]
  ): Promise<{ content: string; reasoning: string }> {
    const resolved = model && model !== "default" ? model : "gpt-4o-mini";
    switch (provider) {
      case "openai": {
        const res = await capFetch(`${bUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: resolved, messages, max_tokens: 32768 }),
        });
        if (res.status >= 400) return { content: `OpenAI error (${res.status})`, reasoning: "" };
        const msg = res.data.choices?.[0]?.message;
        return { content: msg?.content || msg?.reasoning_content || "", reasoning: "" };
      }
      case "anthropic": {
        const systemMsg = messages.find((m) => m.role === "system");
        const userMsgs = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
        const res = await capFetch(`${bUrl}/v1/messages`, {
          method: "POST",
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model: resolved, max_tokens: 32768, system: systemMsg?.content || "", messages: userMsgs.length > 0 ? userMsgs : [{ role: "user", content: "Hello" }] }),
        });
        if (res.status >= 400) return { content: `Anthropic error (${res.status})`, reasoning: "" };
        return { content: res.data.content?.[0]?.text || "", reasoning: "" };
      }
      case "ollama": {
        const ollamaMsgs = messages.map((m) => ({ role: m.role, content: m.content }));
        while (ollamaMsgs.length > 0 && ollamaMsgs[0].role === "system") ollamaMsgs[0].role = "user";
        const res = await capFetch(`${bUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: resolved, messages: ollamaMsgs, stream: false }),
        });
        if (res.status >= 400) return { content: `Ollama error (${res.status})`, reasoning: "" };
        return { content: res.data.message?.content || "", reasoning: "" };
      }
      case "lmstudio":
      case "custom":
      default: {
        const res = await capFetch(`${bUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}), "Content-Type": "application/json" },
          body: JSON.stringify({ model: resolved, messages, max_tokens: 32768 }),
        });
        if (res.status >= 400) return { content: `API error (${res.status})`, reasoning: "" };
        const msg = res.data.choices?.[0]?.message;
        return { content: msg?.content || msg?.reasoning_content || "", reasoning: "" };
      }
    }
  }

  async function directLlmModels(
    provider: AiProvider,
    baseUrl: string,
    apiKey: string
  ): Promise<string[]> {
    try {
      const modelRes = await fetch(`/api/llm/models?provider=${provider}&baseUrl=${encodeURIComponent(baseUrl)}&apiKey=${encodeURIComponent(apiKey || "")}`);
      if (modelRes.ok) {
        const data = await modelRes.json();
        if (data.models && data.models.length > 0) return data.models;
      }
    } catch {}

    if (!isNative()) return [];

    const bUrl = normalizeBaseUrl(baseUrl);
    switch (provider) {
      case "openai":
      case "lmstudio":
      case "custom": {
        const res = await capFetch(`${bUrl}/v1/models`, {
          headers: apiKey ? { "Authorization": `Bearer ${apiKey}` } : {},
        });
        if (res.status >= 400) return [];
        return (res.data.data || []).map((m: any) => m.id || m.name).filter(Boolean);
      }
      case "ollama": {
        const res = await capFetch(`${bUrl}/api/tags`, {});
        if (res.status >= 400) return [];
        return (res.data.models || res.data.tags || []).map((m: any) => m.name).filter(Boolean);
      }
      case "anthropic":
        return ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-opus-4-20250514"];
      default:
        return [];
    }
  }

  const fetchModels = useCallback(async () => {
    try {
      const models = await directLlmModels(config.provider, config.baseUrl, config.apiKey);
      setAvailableModels(models);
      if (models.length > 0 && !config.model) setModel(models[0]);
      if (models.length === 0) setAvailableModels([]);
    } catch {
      setAvailableModels([]);
    }
  }, [config.provider, config.baseUrl, config.apiKey, config.model, setModel]);

  const ask = useCallback(
    async (context: string, question: string): Promise<LlmResponse> => {
      if (!config.enabled) return { content: "AI is not available.", reasoning: "" };
      setIsAsking(true);
      try {
        const messages = question
          ? [{ role: "system", content: context.substring(0, 8000) }, { role: "user", content: question }]
          : [{ role: "user", content: context }];

        const result = await directLlmCompletion(
          config.provider,
          config.baseUrl,
          config.apiKey,
          config.model,
          messages
        );
        return result;
      } catch (err: any) {
        return { content: `Error: ${err.message}`, reasoning: "" };
      } finally {
        setIsAsking(false);
      }
    },
    [config]
  );

  return (
    <LlmContext.Provider value={{ config, setProvider, setApiKey, setBaseUrl, setModel, toggleEnabled, ask, isAsking, availableModels, fetchModels }}>
      {children}
    </LlmContext.Provider>
  );
}

export function useLlm() {
  const ctx = useContext(LlmContext);
  if (!ctx) throw new Error("useLlm must be used within LlmProvider");
  return ctx;
}
