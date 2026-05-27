"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import { useLlm } from "@/lib/llm-context";
import { Bot, Send, Brain, BookOpen, FileQuestion, ChevronDown, ChevronUp } from "lucide-react";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { updateStudyState, addPoints } from "@/lib/study-state";
import { buildStructuredTutorContext } from "@/lib/ai-retrieval";
import { cn } from "@/lib/cn";
import { loadChat, saveChat, syncChatToDB, getTutorKey } from "@/lib/chat-store";
import type { ChatMessage } from "@/lib/chat-store";

export default function TutorPage() {
  const { vault } = useVaultStore();
  const { ask, isAsking } = useLlm();

  const chatKey = getTutorKey();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadChat(chatKey);
    return saved.length > 0 ? saved : [
      { role: "assistant" as const, content: "Hi! Ask me anything about physics." },
    ];
  });
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist chat to localStorage + DB on every change
  useEffect(() => {
    if (mounted) {
      saveChat(chatKey, messages);
      syncChatToDB(chatKey, messages, {
        type: "physics_tutor",
        title: "Physics Tutor",
        subject: "Physics",
      });
    }
  }, [messages, mounted]);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<number>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const quickActions = [
    { icon: Brain, label: "Explain topic", query: "Explain the concept of electric field in simple terms." },
    { icon: BookOpen, label: "Summarize chapter", query: "Summarize all important concepts from the current chapter." },
    { icon: FileQuestion, label: "Generate questions", query: "Generate 3 JEE-level practice questions based on the chapter content." },
  ];

  const buildContext = (question: string): string => {
    return buildStructuredTutorContext(vault, question, {
      surface: "main_tutor",
      subject: "Physics",
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isAsking) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");

    const context = buildContext(userMsg);
    const { content, reasoning } = await ask(context, userMsg);
    setMessages((prev) => [...prev, { role: "assistant", content, reasoning }]);

    updateStudyState((state) => {
      const today = new Date().toISOString().split("T")[0];
      state.lastStudyDate = today;
      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 3;
    });
    addPoints(3, "Tutor Chat", userMsg.substring(0, 50));
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
                <div className="prose-glass text-sm leading-relaxed max-w-none" style={{ color: "var(--text-primary)" }}>
                  <MarkdownRenderer content={msg.content} />
                </div>
                {msg.reasoning && (
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setExpandedReasoning((prev) => {
                          const next = new Set(prev);
                          next.has(i) ? next.delete(i) : next.add(i);
                          return next;
                        });
                      }}
                      className="flex items-center gap-1 text-[10px] opacity-30 hover:opacity-60 transition-opacity"
                    >
                      {expandedReasoning.has(i) ? (
                        <><ChevronUp className="w-3 h-3" /> Hide thinking</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" /> Show thinking</>
                      )}
                    </button>
                    {expandedReasoning.has(i) && (
                      <div className="mt-1.5 p-2.5 rounded-lg bg-[#8B5CF6]/5 border border-[#8B5CF6]/8 text-[11px] opacity-40 leading-relaxed max-h-48 overflow-y-auto">
                        {msg.reasoning}
                      </div>
                    )}
                  </div>
                )}
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
                  ask(buildContext(action.query), action.query).then(({ content, reasoning }) => {
                    setMessages((prev) => [...prev, { role: "assistant", content, reasoning }]);
                    updateStudyState((state) => {
                      const today = new Date().toISOString().split("T")[0];
                      state.lastStudyDate = today;
                      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 3;
                    });
                    addPoints(3, action.label, action.query.substring(0, 50));
                  });
                }} className="glass glass-interactive p-4 text-left">
                  <action.icon className="w-4 h-4 text-[#8B5CF6] mb-2" />
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{action.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 py-3 sm:py-4" style={{ background: "linear-gradient(to top, var(--bg-base), var(--bg-base) 80%, transparent)" }}>
          <div className="flex items-center gap-2 glass p-2">
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
