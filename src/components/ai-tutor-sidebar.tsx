"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useLlm } from "@/lib/llm-context";
import { addPoints } from "@/lib/study-state";
import { Bot, Send, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

interface AiTutorSidebarProps {
  context: string;
  chapterName?: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function AiTutorSidebar({ context, chapterName }: AiTutorSidebarProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { ask, config } = useLlm();
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const sysContext = `You are a JEE physics tutor. Context: ${context.substring(0, 3000)}`;
      const { content } = await ask(sysContext, userMsg);
      setMessages((prev) => [...prev, { role: "assistant", content: content || "No response" }]);
      addPoints(2, "Tutor Query", userMsg.substring(0, 50));
    } catch {}
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-20 p-2 bg-[var(--bg-elevated)] border border-r-0 border-[var(--glass-border)] text-white/40 hover:text-white/70 transition-colors"
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
          initial={{ width: 0 }}
          animate={{ width: 340 }}
          exit={{ width: 0 }}
          className="fixed right-0 top-0 h-full z-20 bg-[var(--bg-surface)] border-l border-[var(--glass-border)] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#8B5CF6]" />
              <span className="text-sm font-semibold">AI Tutor</span>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-white/30 hover:text-white/60">
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
                      onClick={() => {
                        setMessages([{ role: "user", content: q }]);
                        handleQuickAsk(q);
                      }}
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
                    <span style={{ color: "var(--text-secondary)" }}>{msg.content}</span>
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

          <div className="p-3 border-t border-[var(--glass-border)]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about this chapter..."
                className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.06] text-xs outline-none focus:border-[#1856FF]/30"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2 bg-[#1856FF]/15 text-[#1856FF] disabled:opacity-20 border border-[#1856FF]/20"
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

async function handleQuickAsk(q: string) {
  return q;
}
