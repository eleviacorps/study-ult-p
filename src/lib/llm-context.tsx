"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

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
  return { provider: "lmstudio", apiKey: "", baseUrl: "http://localhost:1234", model: "", enabled: false };
}

function loadConfig(): LlmConfig {
  if (typeof window === "undefined") return getDefaultConfig();
  try {
    const raw = localStorage.getItem("studyult-llm");
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        provider: saved.provider || "lmstudio",
        apiKey: saved.apiKey || "",
        baseUrl: saved.baseUrl || PROVIDER_DEFAULTS[saved.provider as AiProvider]?.baseUrl || "http://localhost:1234",
        model: saved.model || "",
        enabled: saved.enabled ?? false,
      };
    }
  } catch {}
  return getDefaultConfig();
}

function saveConfig(c: LlmConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem("studyult-llm", JSON.stringify(c));
  }
}

export function LlmProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<LlmConfig>(loadConfig);
  const [isAsking, setIsAsking] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  useEffect(() => { setConfig(loadConfig()); }, []);

  const setProvider = useCallback((provider: AiProvider) => {
    setConfig((prev) => {
      const next = { ...prev, provider, baseUrl: PROVIDER_DEFAULTS[provider].baseUrl, model: "" };
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
    setConfig((prev) => { const n = { ...prev, enabled: !prev.enabled }; saveConfig(n); return n; });
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/llm/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: config.provider, baseUrl: config.baseUrl, apiKey: config.apiKey }),
      });
      if (res.ok) {
        const data = await res.json();
        const models = data.models || [];
        setAvailableModels(models);
        if (models.length > 0 && !config.model) setModel(models[0]);
        return;
      }
    } catch {}
    setAvailableModels([]);
  }, [config.provider, config.baseUrl, config.apiKey, config.model, setModel]);

  const ask = useCallback(
    async (context: string, question: string): Promise<LlmResponse> => {
      if (!config.enabled) return { content: "LLM is not enabled.", reasoning: "" };
      setIsAsking(true);
      try {
        const messages = question
          ? [{ role: "system", content: context.substring(0, 4000) }, { role: "user", content: question }]
          : [{ role: "user", content: context }];

        const res = await fetch("/api/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: config.provider,
            baseUrl: config.baseUrl,
            apiKey: config.apiKey,
            model: config.model || "default",
            messages,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          return { content: data.content || "", reasoning: data.reasoning || "" };
        }
        const errData = await res.json().catch(() => ({}));
        return { content: `Error: ${errData.error || `HTTP ${res.status}`}`, reasoning: "" };
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
