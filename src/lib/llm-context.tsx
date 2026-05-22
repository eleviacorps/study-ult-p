"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface LlmConfig {
  provider: string;
  model: string;
  enabled: boolean;
}

interface LlmResponse {
  content: string;
  reasoning: string;
}

interface LlmContextValue {
  config: LlmConfig;
  setProvider: (url: string) => void;
  setModel: (model: string) => void;
  toggleEnabled: () => void;
  ask: (context: string, question: string) => Promise<LlmResponse>;
  isAsking: boolean;
  availableModels: string[];
  fetchModels: () => Promise<void>;
}

const LlmContext = createContext<LlmContextValue | null>(null);

function loadConfig(): LlmConfig {
  if (typeof window === "undefined") {
    return { provider: "http://localhost:1234", model: "", enabled: false };
  }
  try {
    const saved = localStorage.getItem("studyult-llm");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { provider: "http://localhost:1234", model: "", enabled: false };
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

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const setProvider = useCallback((url: string) => {
    setConfig((prev) => {
      const next = { ...prev, provider: url };
      saveConfig(next);
      return next;
    });
  }, []);

  const setModel = useCallback((model: string) => {
    setConfig((prev) => {
      const next = { ...prev, model };
      saveConfig(next);
      return next;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    setConfig((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      saveConfig(next);
      return next;
    });
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/llm/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: config.provider }),
      });
      if (res.ok) {
        const data = await res.json();
        const models = data.models || [];
        setAvailableModels(models);
        if (models.length > 0 && !config.model) {
          setModel(models[0]);
        }
        return;
      }
    } catch {}
    setAvailableModels([]);
  }, [config.provider, config.model, setModel]);

  const ask = useCallback(
    async (context: string, question: string): Promise<LlmResponse> => {
      if (!config.enabled)
        return { content: "LLM is not enabled.", reasoning: "" };

      setIsAsking(true);
      try {
        const modelName = config.model?.trim() || "local-model";

        const messages: { role: string; content: string }[] = question
          ? [
              { role: "system", content: context.substring(0, 4000) },
              { role: "user", content: question },
            ]
          : [{ role: "user", content: context }];

        const res = await fetch("/api/llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: config.provider, model: modelName, messages }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            content: data.content || "",
            reasoning: data.reasoning || "",
          };
        }

        return { content: `Error: Cannot reach LM Studio at ${config.provider}`, reasoning: "" };
      } catch (err: any) {
        return { content: `Error: ${err.message}`, reasoning: "" };
      } finally {
        setIsAsking(false);
      }
    },
    [config]
  );

  return (
    <LlmContext.Provider
      value={{ config, setProvider, setModel, toggleEnabled, ask, isAsking, availableModels, fetchModels }}
    >
      {children}
    </LlmContext.Provider>
  );
}

export function useLlm() {
  const ctx = useContext(LlmContext);
  if (!ctx) throw new Error("useLlm must be used within LlmProvider");
  return ctx;
}
