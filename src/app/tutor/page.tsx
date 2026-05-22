"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import { Bot, Send, Brain, BookOpen, FileQuestion, Settings2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

const DEFAULT_PROVIDER = "http://localhost:11434";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export default function TutorPage() {
  const { vault } = useVaultStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI physics tutor. I have access to your entire physics vault. You can also connect me to Ollama, LM Studio, or OpenRouter for LLM-powered responses.",
    },
  ]);
  const [input, setInput] = useState("");
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [model, setModel] = useState("llama3.2");
  const [showSettings, setShowSettings] = useState(false);
  const [llmEnabled, setLlmEnabled] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("studyult-llm");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.provider) setProvider(parsed.provider);
        if (parsed.model) setModel(parsed.model);
        if (parsed.enabled) setLlmEnabled(parsed.enabled);
      } catch {}
    }
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const saveSettings = () => {
    localStorage.setItem(
      "studyult-llm",
      JSON.stringify({ provider, model, enabled: llmEnabled })
    );
    setShowSettings(false);
  };

  const quickActions = [
    {
      icon: Brain,
      label: "Explain topic",
      query: "Explain the concept of electric field in simple terms, using examples from my notes.",
    },
    {
      icon: BookOpen,
      label: "Summarize chapter",
      query: "Give me a concise summary of all topics in my current chapter.",
    },
    {
      icon: FileQuestion,
      label: "Generate questions",
      query: "Generate 3 JEE-level practice questions with hints based on my recent study topics.",
    },
  ];

  const buildContext = (): string => {
    if (!vault) return "";
    const chapterNames = vault.chapters.map((c) => c.name).join(", ");
    const topics = vault.notes.slice(0, 5).map((n) => n.title).join(", ");
    return `You are a JEE physics tutor. The student is studying these chapters: ${chapterNames}. Recent topics: ${topics}. Provide clear, concise, and accurate physics explanations. Use LaTeX for formulas where appropriate.`;
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setIsThinking(true);

    if (llmEnabled) {
      try {
        const context = buildContext();
        const res = await fetch(`${provider}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            prompt: `${context}\n\nStudent: ${userMsg}\nTutor:`,
            stream: false,
          }),
        });

        if (!res.ok) throw new Error("LLM not responding");

        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response || "I couldn't generate a response. Try again." },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I couldn't reach the LLM. Make sure Ollama/LM Studio is running, or configure the provider in Settings.",
          },
        ]);
      }
    } else {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I have access to all your notes, flashcards, and questions. To get AI-powered responses, connect me to Ollama (default: http://localhost:11434) and enable the LLM in Settings.",
          },
        ]);
      }, 600);
    }

    setIsThinking(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="AI Tutor" />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 sm:px-6">
        <div ref={chatRef} className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-[#8B5CF6]" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-[#1856FF]/15 border border-[#1856FF]/20 text-white"
                    : "glass"
                )}
                style={msg.role === "assistant" ? {} : {}}
              >
                <span style={{ color: msg.role === "user" ? "var(--text-primary)" : "inherit" }}>
                  {msg.content}
                </span>
              </div>
            </motion.div>
          ))}

          {isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 pl-11"
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#8B5CF6]/40 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-white/25">Thinking...</span>
            </motion.div>
          )}

          {messages.length <= 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setMessages((prev) => [
                      ...prev,
                      { role: "user", content: action.query },
                    ]);
                    setInput("");
                  }}
                  className="glass glass-interactive p-4 text-left"
                >
                  <action.icon className="w-4 h-4 text-[#8B5CF6] mb-2" />
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {action.label}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 mb-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold flex items-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                LLM Configuration
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[10px] text-white/30 hover:text-white/60"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">
                  Provider URL
                </label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-white/30 mb-1 block">
                  Model
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }}
                  placeholder="llama3.2"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input
                  type="checkbox"
                  checked={llmEnabled}
                  onChange={(e) => setLlmEnabled(e.target.checked)}
                  className="rounded"
                />
                Enable LLM responses
              </label>
              <button
                onClick={saveSettings}
                className="px-3 py-1.5 rounded-lg bg-[#1856FF]/15 text-[#1856FF] text-xs border border-[#1856FF]/20 hover:bg-[#1856FF]/25 transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-[10px] text-white/20">
              Supported: Ollama (default), LM Studio, OpenRouter, or any OpenAI-compatible API
            </p>
          </motion.div>
        )}

        <div className="sticky bottom-0 py-3 sm:py-4" style={{ background: "linear-gradient(to top, var(--bg-base), var(--bg-base) 80%, transparent)" }}>
          <div className="flex items-center gap-2 glass p-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl glass-interactive flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
            >
              <Settings2 className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything about physics..."
              className="flex-1 bg-transparent text-sm outline-none px-2 placeholder-opacity-20 min-w-0"
              style={{ color: "var(--text-secondary)" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isThinking}
              className="p-2 rounded-xl bg-[#1856FF]/15 text-[#1856FF] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1856FF]/25 transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
