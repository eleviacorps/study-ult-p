"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLlm } from "@/lib/llm-context";
import { addPoints, recordAiConversation } from "@/lib/study-state";
import { buildStructuredTutorContext } from "@/lib/ai-retrieval";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { Bot, Send, ChevronRight, ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { clearChat, getChatSessionSummary, loadChat, saveChat, syncChatToDB, getSidebarKey } from "@/lib/chat-store";
import type { ChatMessage } from "@/lib/chat-store";

interface AiTutorSidebarProps {
  context: string;
  chapterName?: string;
  onOpenChange?: (open: boolean) => void;
}

export function AiTutorSidebar({ context, chapterName, onOpenChange }: AiTutorSidebarProps) {
  const sidebarKey = getSidebarKey();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat(sidebarKey));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { ask } = useLlm();
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Persist chat to localStorage + DB on every change
  useEffect(() => {
    if (messages.length > 0) {
      saveChat(sidebarKey, messages);
      syncChatToDB(sidebarKey, messages, {
        type: "concept_discussion",
        title: chapterName ? `${chapterName} sidebar tutor` : "Reader sidebar tutor",
        chapter: chapterName || "",
        scope: { surface: "reader_sidebar" },
      });
    }
  }, [messages, chapterName, sidebarKey]);

  const contextRef = useRef(context);
  contextRef.current = context;

  const doAsk = async (q: string) => {
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const chatSummary = await getChatSessionSummary(sidebarKey);
      const sysContext = buildStructuredTutorContext(null, q, {
        surface: "reader_sidebar",
        chapter: chapterName,
        readerContext: contextRef.current,
        chatSummary,
      });
      const { content } = await ask(sysContext, q);
      setMessages((prev) => [...prev, { role: "assistant", content: content || "No response" }]);
      addPoints(2, "Tutor Query", q.substring(0, 50));
      recordAiConversation("user", q, chapterName || "general");
      recordAiConversation("assistant", content || "No response", chapterName || "general");
    } catch {}
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    await doAsk(userMsg);
  };

  const handleQuickAsk = async (q: string) => {
    await doAsk(q);
  };

  const toggle = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      if (detail) {
        doAsk(detail);
      }
    };
    window.addEventListener("tutor-ask", handler);
    return () => window.removeEventListener("tutor-ask", handler);
  }, []);

  return (
    <>
      <button
        onClick={() => toggle(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 p-2 bg-[var(--bg-elevated)] border border-r-0 border-[var(--glass-border)] text-white/40 hover:text-white/70 transition-colors"
        style={{ borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}
      >
        {open ? <ChevronRight className="w-4 h-4" /> : (
          <div className="flex flex-col items-center gap-1">
            <ChevronLeft className="w-4 h-4" />
            <Bot className="w-4 h-4" />
          </div>
        )}
      </button>

      {open && (
        <motion.aside
          initial={isMobile ? { x: "100%" } : { width: 0 }}
          animate={isMobile ? { x: 0 } : { width: 340 }}
          exit={isMobile ? { x: "100%" } : { width: 0 }}
          className="fixed right-0 top-0 h-full z-40 bg-[var(--bg-surface)] border-l border-[var(--glass-border)] flex flex-col"
          style={{ width: isMobile ? "100vw" : undefined }}
        >
          <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#8B5CF6]" />
              <span className="text-sm font-semibold">AI Tutor</span>
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); clearChat(sidebarKey); }}
                  className="ml-auto p-1 text-white/20 hover:text-[#EF4444] transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => toggle(false)} className="p-1 text-white/30 hover:text-white/60">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-8 h-8 text-[#8B5CF6]/30 mx-auto mb-3" />
                <p className="text-xs text-white/30">
                  Ask me anything about {chapterName || "this chapter"}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {["Explain this concept", "Give me a summary", "Key formulas", "Common mistakes"].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickAsk(q)}
                      className="text-[10px] px-2 py-1 bg-white/[0.03] border border-white/[0.06] text-white/30 hover:text-white/50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn("text-xs leading-relaxed", msg.role === "user" ? "text-right" : "")}>
                  <div className={cn("inline-block max-w-[90%] p-3",
                    msg.role === "user"
                      ? "bg-[#1856FF]/15 border border-[#1856FF]/20"
                      : "bg-white/[0.03] border border-white/[0.06]"
                  )}>
                    {msg.role === "assistant" ? (
                      <div className="prose-glass text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 pl-2">
                <Loader2 className="w-3 h-3 animate-spin text-[#8B5CF6]" />
                <span className="text-[10px] text-white/20">Thinking...</span>
              </div>
            )}
          </div>

          <div className="p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about this chapter..."
                className="flex-1 min-h-11 px-3 py-2 bg-white/[0.03] border border-white/[0.06] text-sm outline-none focus:border-[#1856FF]/30"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="min-h-11 min-w-11 p-2 bg-[#1856FF]/15 text-[#1856FF] disabled:opacity-20 border border-[#1856FF]/20 flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </>
  );
}
