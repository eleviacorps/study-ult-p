"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { useLlm, PROVIDER_DEFAULTS, type AiProvider } from "@/lib/llm-context";
import { Database, Bot, Bell, Shield, Palette, Sun, Moon, Check, ChevronRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

const PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic Claude" },
  { value: "lmstudio", label: "LM Studio (Local)" },
  { value: "ollama", label: "Ollama (Local)" },
  { value: "custom", label: "Custom API" },
];

const NEEDS_API_KEY: AiProvider[] = ["openai", "anthropic", "custom"];

export default function SettingsPage() {
  const router = useRouter();
  const { config, setProvider, setApiKey, setBaseUrl, setModel, toggleEnabled, fetchModels, availableModels } = useLlm();
  const [theme, setTheme] = useState<"dark" | "cream">("dark");
  const [llmProvider, setLlmProvider] = useState<AiProvider>(config.provider);
  const [llmApiKey, setLlmApiKey] = useState(config.apiKey);
  const [llmBaseUrl, setLlmBaseUrl] = useState(config.baseUrl);
  const [llmModel, setLlmModel] = useState(config.model);
  const [llmOn, setLlmOn] = useState(config.enabled);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("studyult-theme") as "dark" | "cream";
    if (stored === "dark" || stored === "cream") setTheme(stored);
  }, []);

  const applyTheme = (t: "dark" | "cream") => {
    setTheme(t);
    localStorage.setItem("studyult-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };

  const handleProviderChange = (p: AiProvider) => {
    setLlmProvider(p);
    setLlmBaseUrl(PROVIDER_DEFAULTS[p].baseUrl);
    setLlmModel("");
    if (NEEDS_API_KEY.includes(p)) setLlmApiKey("");
  };

  const saveLlm = () => {
    setProvider(llmProvider);
    if (NEEDS_API_KEY.includes(llmProvider)) setApiKey(llmApiKey);
    setBaseUrl(llmBaseUrl);
    setModel(llmModel);
    if (llmOn !== config.enabled) toggleEnabled();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <Header title="Settings" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm opacity-40 mb-8" style={{ color: "var(--text-muted)" }}>
          Configure your study environment
        </p>

        <div className="space-y-4">
          {/* Theme */}
          <div className="glass p-5">
            <div className="flex items-center gap-4">
              <Palette className="w-5 h-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
              <div className="flex-1">
                <h3 className="text-sm font-medium">Theme</h3>
                <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>Switch between dark and cream</p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04]">
                <button onClick={() => applyTheme("dark")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                    theme === "dark" ? "bg-[#1856FF]/20 text-[#1856FF]" : "opacity-40 hover:opacity-70")}>
                  <Moon className="w-3.5 h-3.5" /> Dark
                </button>
                <button onClick={() => applyTheme("cream")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all",
                    theme === "cream" ? "bg-[#F59E0B]/20 text-[#D97706]" : "opacity-40 hover:opacity-70")}>
                  <Sun className="w-3.5 h-3.5" /> Cream
                </button>
              </div>
            </div>
          </div>

          {/* AI Provider Configuration */}
          <div className="glass p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 flex-shrink-0 text-[#8B5CF6]" />
              <div className="flex-1">
                <h3 className="text-sm font-medium">AI Provider</h3>
                <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>
                  Connect OpenAI, Anthropic Claude, LM Studio, Ollama, or a custom API
                </p>
              </div>
            </div>

            {/* Provider Selector */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] uppercase tracking-wider opacity-30 block">Provider</label>
              <select
                value={llmProvider}
                onChange={(e) => handleProviderChange(e.target.value as AiProvider)}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[#8B5CF6]/30"
                style={{ color: "var(--text-primary)" }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* API Key (for cloud providers + custom) */}
            {NEEDS_API_KEY.includes(llmProvider) && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider opacity-30 block">API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={llmApiKey}
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      placeholder={llmProvider === "openai" ? "sk-..." : llmProvider === "anthropic" ? "sk-ant-..." : "Enter API key"}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[#8B5CF6]/30"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {llmProvider !== "custom" && (
                  <p className="text-[10px] opacity-25">
                    Your key is stored locally in your browser. Never sent to our servers.
                  </p>
                )}
              </div>
            )}

            {/* Base URL (only editable for custom, shown as info for others) */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider opacity-30 block">Base URL</label>
              <input
                type="text"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                disabled={llmProvider !== "custom"}
                placeholder={llmProvider === "custom" ? "https://your-api.com" : ""}
                className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[#8B5CF6]/30 disabled:opacity-40"
                style={{ color: "var(--text-primary)" }}
              />
              {llmProvider !== "custom" && (
                <p className="text-[10px] opacity-25">Auto-filled for {PROVIDER_DEFAULTS[llmProvider].label}</p>
              )}
              {llmProvider === "custom" && (
                <p className="text-[10px] opacity-25">Should be an OpenAI-compatible API endpoint</p>
              )}
            </div>

            {/* Model */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider opacity-30 block">Model</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="Select or type model name"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm outline-none focus:border-[#8B5CF6]/30"
                  style={{ color: "var(--text-primary)" }}
                />
                <button
                  onClick={fetchModels}
                  className="px-3 py-2.5 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs hover:bg-[#8B5CF6]/20 transition-colors whitespace-nowrap"
                >
                  Detect
                </button>
              </div>
              {availableModels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-32 overflow-y-auto">
                  {availableModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => setLlmModel(m)}
                      className={cn("text-[10px] px-2 py-1 rounded-md transition-colors",
                        llmModel === m ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "bg-white/[0.03] opacity-50 hover:opacity-80")}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Enable / Save */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setLlmOn(!llmOn)}
                className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all",
                  llmOn ? "bg-[#10B981]/15 text-[#10B981]" : "bg-white/[0.04] opacity-40")}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full", llmOn ? "bg-[#10B981]" : "bg-white/20")} />
                {llmOn ? "Enabled" : "Disabled"}
              </button>
              <button
                onClick={saveLlm}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] text-xs font-medium hover:bg-[#8B5CF6]/25 transition-colors border border-[#8B5CF6]/20"
              >
                {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : "Save Settings"}
              </button>
            </div>

            {/* Security note for cloud providers */}
            {NEEDS_API_KEY.includes(llmProvider) && (
              <p className="text-[10px] text-[#F59E0B]/60 pt-1">
                ⚠ API keys are stored in localStorage. For production, consider server-side storage.
              </p>
            )}
          </div>

          {/* Navigation */}
          <button onClick={() => router.push("/tutor")}
            className="w-full glass glass-interactive p-5 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">Open AI Tutor</h3>
              <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>Chat with AI, generate questions, get explanations</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </button>

          <button onClick={() => router.push("/analytics")}
            className="w-full glass glass-interactive p-5 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium">Analytics</h3>
              <p className="text-xs opacity-50" style={{ color: "var(--text-muted)" }}>View your study performance and insights</p>
            </div>
            <ChevronRight className="w-4 h-4 opacity-30" />
          </button>

          <div className="glass p-5">
            <h3 className="text-sm font-medium mb-2">About</h3>
            <p className="text-xs opacity-40" style={{ color: "var(--text-muted)" }}>
              StudyUlt — AI-Powered JEE Educational OS · Next.js · Framer Motion · Multi-Provider AI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
