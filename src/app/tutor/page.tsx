"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import { useLlm } from "@/lib/llm-context";
import { Bot, Send, Brain, BookOpen, FileQuestion, Settings2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function TutorPage() {
  const { vault } = useVaultStore();
  const { ask, config, setProvider, setModel, toggleEnabled, isAsking, availableModels, fetchModels } = useLlm();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        config.enabled
          ? `Connected to LM Studio at ${config.provider}. Ask me anything about physics!`
          : "Hi! Enable LM Studio in Settings to connect me to your local LLM for AI-powered responses.",
    },
  ]);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [localUrl, setLocalUrl] = useState(config.provider);
  const [localModel, setLocalModel] = useState(config.model);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const quickActions = [
    { icon: Brain, label: "Explain topic", query: "Explain the concept of electric field in simple terms." },
    { icon: BookOpen, label: "Summarize chapter", query: "Summarize all important concepts from the current chapter." },
    { icon: FileQuestion, label: "Generate questions", query: "Generate 3 JEE-level practice questions based on the chapter content." },
  ];

  const buildContext = (): string => {
    if (!vault) return "You are a JEE physics tutor.";
    const chapterNames = vault.chapters.map((c) => c.name).join(", ");
    const topics = vault.notes.slice(0, 5).map((n) => n.title).join(", ");
    return `You are a JEE physics tutor. Available chapters: ${chapterNames}. Topics: ${topics}. Keep answers clear and concise. Use LaTeX $$ for formulas.`;
  };

  const handleSend = async () => {
    if (!input.trim() || isAsking) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");

    const context = buildContext();
    const response = await ask(context, userMsg);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="AI Tutor" />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 sm:px-6">
        <div ref={chatRef} className="flex-1 overflow-y-auto py-6 space-y-4">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-[#8B5CF6]" />
                </div>
              )}
              <div className={cn("max-w-[85%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === "user" ? "bg-[#1856FF]/15 border border-[#1856FF]/20" : "glass")}>
                <span style={{ color: "var(--text-primary)" }}>{msg.content}</span>
              </div>
            </motion.div>
          ))}
          {isAsking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 pl-11">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#8B5CF6]/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs opacity-25">Thinking...</span>
            </motion.div>
          )}
          {messages.length <= 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {quickActions.map((action) => (
                <button key={action.label} onClick={() => {
                  setMessages((prev) => [...prev, { role: "user", content: action.query }]);
                  ask(buildContext(), action.query).then((r) =>
                    setMessages((prev) => [...prev, { role: "assistant", content: r }])
                  );
                }} className="glass glass-interactive p-4 text-left">
                  <action.icon className="w-4 h-4 text-[#8B5CF6] mb-2" />
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{action.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 mb-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold flex items-center gap-2"><Settings2 className="w-3.5 h-3.5" /> LLM Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-[10px] opacity-30 hover:opacity-60">Close</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-1 block">Provider URL</label>
                <input type="text" value={localUrl} onChange={(e) => setLocalUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#1856FF]/30"
                  style={{ color: "var(--text-primary)" }} placeholder="http://localhost:1234" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider opacity-30 mb-1 block">Model</label>
                <div className="flex gap-2">
                  <input type="text" value={localModel} onChange={(e) => setLocalModel(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#1856FF]/30"
                    style={{ color: "var(--text-primary)" }} />
                  <button onClick={fetchModels} className="px-2 py-2 rounded-lg bg-[#8B5CF6]/10 text-[#8B5CF6] text-[10px] whitespace-nowrap">
                    Detect
                  </button>
                </div>
                {availableModels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {availableModels.map((m) => (
                      <button key={m} onClick={() => setLocalModel(m)}
                        className={cn("text-[10px] px-2 py-1 rounded-md", localModel === m ? "bg-[#8B5CF6]/20 text-[#8B5CF6]" : "bg-white/[0.03] opacity-50")}>
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
                <input type="checkbox" checked={config.enabled} onChange={toggleEnabled} className="rounded" /> Enable LLM
              </label>
              <button onClick={() => { setProvider(localUrl); setModel(localModel); setShowSettings(false); }}
                className="px-3 py-1.5 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] text-xs border border-[#8B5CF6]/20 hover:bg-[#8B5CF6]/25">
                Apply
              </button>
            </div>
          </motion.div>
        )}

        <div className="sticky bottom-0 py-3 sm:py-4" style={{ background: "linear-gradient(to top, var(--bg-base), var(--bg-base) 80%, transparent)" }}>
          <div className="flex items-center gap-2 glass p-2">
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-xl glass-interactive flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              <Settings2 className="w-4 h-4" />
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything about physics..."
              className="flex-1 bg-transparent text-sm outline-none px-2 min-w-0"
              style={{ color: "var(--text-secondary)" }} />
            <button onClick={handleSend} disabled={!input.trim() || isAsking}
              className="p-2 rounded-xl bg-[#1856FF]/15 text-[#1856FF] disabled:opacity-20 hover:bg-[#1856FF]/25 flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
