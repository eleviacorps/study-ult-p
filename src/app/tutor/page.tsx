"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import { useLlm } from "@/lib/llm-context";
import { Bot, Send, Brain, BookOpen, FileQuestion, Plus, History, GitBranch } from "lucide-react";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { updateStudyState, addPoints } from "@/lib/study-state";
import { buildStructuredTutorContext } from "@/lib/ai-retrieval";
import { cn } from "@/lib/cn";
import { clearChat, getChatSessionSummary, listLocalChatSessions, loadChat, loadLocalChatSession, queueChatSyncToDB, saveChat, setChatSession, getTutorKey } from "@/lib/chat-store";
import type { ChatMessage } from "@/lib/chat-store";

type TutorSession = {
  id: string;
  title: string;
  type: string;
  updated_at?: string;
  last_message_at?: string;
};

type PendingClarification = {
  action: "explain" | "summarize" | "questions" | "visualize";
  step: "ask_topic" | "ask_count";
  topic?: string;
  count?: number;
} | null;

export default function TutorPage() {
  const { vault } = useVaultStore();
  const { askStream, isAsking } = useLlm();

  const chatKey = getTutorKey();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadChat(chatKey);
    return saved.length > 0 ? saved : [
      { role: "assistant" as const, content: "Hi! Ask me anything about physics." },
    ];
  });
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [pending, setPending] = useState<PendingClarification>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<number>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const [goalRes, aiRes] = await Promise.all([
          supabase.from("student_goal_profiles").select("*").eq("user_id", user.id).maybeSingle(),
          supabase.from("student_ai_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        ]);
        const merged: any = {};
        if (goalRes.data) {
          merged.exam_goals = goalRes.data.exam_goals;
          merged.preferred_difficulty = goalRes.data.preferred_difficulty;
          merged.survey = goalRes.data.survey;
        }
        if (aiRes.data) {
          merged.tutor_personality_prompt = aiRes.data.tutor_personality_prompt;
          merged.generated_learning_profile = aiRes.data.generated_learning_profile;
        }
        setStudentProfile(merged);
      } catch {}
    };
    fetchProfile();
  }, []);

  // Persist chat to localStorage + DB on every change
  useEffect(() => {
    if (!mounted) return;
    saveChat(chatKey, messages);
    queueChatSyncToDB(chatKey, messages, {
      type: "physics_tutor",
      title: "Physics Tutor",
      subject: "Physics",
    });
  }, [messages, mounted]);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat?sessions=1");
      if (!res.ok) return;
      const data = await res.json();
      const remote = Array.isArray(data.sessions)
        ? data.sessions.filter((s: TutorSession) => s.type === "physics_tutor")
        : [];
      const local = listLocalChatSessions(chatKey).filter((s) => s.type === "physics_tutor");
      const seen = new Set<string>();
      const merged = [...local, ...remote].filter((session) => {
        if (seen.has(session.id)) return false;
        seen.add(session.id);
        return true;
      });
      setSessions(merged);
    } catch {
      setSessions(listLocalChatSessions(chatKey).filter((s) => s.type === "physics_tutor"));
    }
  }, []);

  useEffect(() => {
    if (mounted) refreshSessions();
  }, [mounted, refreshSessions]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const buildContext = async (question: string, chatSummary = ""): Promise<string> => {
    return buildStructuredTutorContext(vault, question, {
      surface: "main_tutor",
      subject: "Physics",
      chatSummary,
      studentProfile,
    });
  };

  const sendToAI = async (userMsg: string) => {
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    const chatSummary = await getChatSessionSummary(chatKey);
    const context = await buildContext(userMsg, chatSummary);

    setMessages((prev) => [...prev, { role: "assistant", content: "", reasoning: "" }]);

    let fullContent = "";
    try {
      for await (const token of askStream(context, userMsg)) {
        fullContent += token;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: fullContent };
          return updated;
        });
      }
      if (!fullContent) {
        fullContent = "I'm sorry, I wasn't able to generate a response. Please try rephrasing your question.";
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: fullContent };
          return updated;
        });
      }
    } catch (e) {
      console.error("Tutor stream error:", e);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        updated[updated.length - 1] = { ...last, content: fullContent || "AI service error" };
        return updated;
      });
    }

    updateStudyState((state) => {
      const today = new Date().toISOString().split("T")[0];
      state.lastStudyDate = today;
      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 3;
    });
    addPoints(3, "Tutor Chat", userMsg.substring(0, 50));
    await new Promise((r) => setTimeout(r, 300));
    await refreshSessions();
  };

  const handleSend = async () => {
    if (!input.trim() || isAsking) return;
    if (pending) {
      if (pending.step === "ask_topic") {
        setPending({ ...pending, topic: input.trim(), step: pending.action === "questions" ? "ask_count" : "ask_topic" });
        setInput("");
        if (pending.action === "explain" || pending.action === "summarize" || pending.action === "visualize") {
          const full = pending.action === "explain"
            ? `Explain this topic in detail: ${input.trim()}`
            : pending.action === "summarize"
              ? `Summarize this chapter: ${input.trim()}`
              : `Create a clean Mermaid mindmap visual for this concept: ${input.trim()}. Output valid Mermaid syntax only.`;
          setPending(null);
          await sendToAI(full);
        }
        return;
      }
      if (pending.step === "ask_count") {
        const count = parseInt(input.trim()) || 3;
        setInput("");
        setPending(null);
        await sendToAI(`Generate ${count} JEE-level practice questions about ${pending.topic || "the current chapter"}.`);
        return;
      }
    }
    await sendToAI(input.trim());
    setInput("");
  };

  const handleQuickAction = (action: "explain" | "summarize" | "questions" | "visualize") => {
    setPending({ action, step: "ask_topic" });
  };

  const startNewChat = () => {
    const greeting = { role: "assistant" as const, content: "Hi! Ask me anything about physics." };
    clearChat(chatKey);
    setMessages([greeting]);
    setExpandedReasoning(new Set());
    setShowHistory(false);
    setPending(null);
  };

  const loadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat?session_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();
      let nextMessages = Array.isArray(data.messages)
        ? data.messages
            .filter((m: any) => m.role === "user" || m.role === "assistant")
            .map((m: any) => ({ role: m.role, content: m.content }))
        : [];
      if (nextMessages.length === 0) {
        nextMessages = loadLocalChatSession(chatKey, sessionId);
      }
      setChatSession(chatKey, sessionId, nextMessages.length);
      saveChat(chatKey, nextMessages);
      setMessages(nextMessages.length > 0 ? nextMessages : [{ role: "assistant", content: "Hi! Ask me anything about physics." }]);
      setExpandedReasoning(new Set());
      setShowHistory(false);
      setPending(null);
    } catch {
      const nextMessages = loadLocalChatSession(chatKey, sessionId);
      if (nextMessages.length === 0) return;
      setChatSession(chatKey, sessionId, nextMessages.length);
      saveChat(chatKey, nextMessages);
      setMessages(nextMessages);
      setExpandedReasoning(new Set());
      setShowHistory(false);
      setPending(null);
    }
  };

  return (
    <div className="app-fixed-screen h-[100dvh] flex flex-col overflow-hidden max-lg:fixed max-lg:inset-0 max-lg:z-10">
      <Header title="AI Tutor" />
      <div className="flex-1 min-h-0 max-w-3xl mx-auto w-full px-4 sm:px-6 flex flex-col overflow-hidden">
        <div className="pt-4 flex items-center justify-between gap-3 flex-shrink-0">
          <div>
            <p className="text-xs opacity-35">Physics tutor</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="p-2 rounded-xl glass-interactive opacity-60 hover:opacity-100"
              title="Chat history"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={startNewChat}
              className="p-2 rounded-xl bg-[#1856FF]/15 text-[#1856FF] border border-[#1856FF]/20 hover:bg-[#1856FF]/25"
              title="New chat"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showHistory && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass p-3 mt-3 space-y-2 flex-shrink-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Chat History</p>
              <button onClick={refreshSessions} className="text-[10px] opacity-35 hover:opacity-70">Refresh</button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs opacity-30 py-2">No saved tutor sessions yet.</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {sessions.map((session) => (
                  <button key={session.id} onClick={() => loadSession(session.id)}
                    className="w-full text-left p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                    <p className="text-xs font-medium truncate">{session.title || "New Chat"}</p>
                    <p className="text-[10px] opacity-25">
                      {session.updated_at ? new Date(session.updated_at).toLocaleString() : "Saved session"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y py-4 sm:py-6 space-y-5 scroll-region">
          {messages.map((msg, i) =>
            msg.role === "assistant" ? (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 pl-0.5">
                  <div className="w-5 h-5 rounded-lg bg-[#1856FF]/15 flex items-center justify-center border border-[#1856FF]/20">
                    <Bot className="w-2.5 h-2.5 text-[#1856FF]" />
                  </div>
                  <span className="text-[10px] font-medium tracking-wide text-white/25">AI Tutor</span>
                </div>

                {msg.reasoning && (
                  <div className="ml-7">
                    <button onClick={() => setExpandedReasoning((prev) => {
                      const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next;
                    })} className="text-[9px] tracking-wider uppercase opacity-20 hover:opacity-40 transition-opacity">
                      {expandedReasoning.has(i) ? "▾ Hide thinking" : "▸ Show thinking"}
                    </button>
                    {expandedReasoning.has(i) && (
                      <div className="mt-1 p-2.5 rounded-lg bg-[#1856FF]/[0.03] border border-[#1856FF]/[0.08] text-[10px] leading-relaxed opacity-35 max-h-48 overflow-y-auto">
                        {msg.reasoning}
                      </div>
                    )}
                  </div>
                )}

                <div className="ml-7 max-w-[90%] sm:max-w-[80%] p-3 sm:p-4 rounded-2xl rounded-bl-md border border-white/[0.06] bg-[#09090B]">
                  <div className="prose-glass text-sm leading-relaxed min-w-0" style={{ color: "var(--text-primary)" }}>
                    <MarkdownRenderer content={msg.content} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                <div className="ml-auto w-fit max-w-[85%] sm:max-w-[75%] p-2.5 sm:p-3 rounded-2xl rounded-br-md border border-[#1856FF]/20 bg-[#1856FF]/15">
                  <span className="text-sm leading-relaxed text-white/80 break-words">{msg.content}</span>
                </div>
              </motion.div>
            )
          )}
          {isAsking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 pl-0.5">
                <div className="w-5 h-5 rounded-lg bg-[#1856FF]/15 flex items-center justify-center border border-[#1856FF]/20">
                  <Bot className="w-2.5 h-2.5 text-[#1856FF]" />
                </div>
                <span className="text-[10px] font-medium tracking-wide text-white/25">AI Tutor</span>
              </div>
              <div className="ml-7 flex items-center gap-2.5">
                <div className="flex gap-1">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full bg-[#1856FF]/30 animate-bounce" style={{ animationDelay: `${j * 0.15}s` }} />
                  ))}
                </div>
                <span className="text-[10px] opacity-20">Thinking...</span>
              </div>
            </motion.div>
          )}
          {messages.length <= 1 && !pending && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button onClick={() => handleQuickAction("explain")} className="glass glass-interactive p-3.5 text-left rounded-xl">
                <Brain className="w-3.5 h-3.5 text-[#1856FF] mb-1.5" />
                <p className="text-[11px] font-medium text-white/40">Explain topic</p>
              </button>
              <button onClick={() => handleQuickAction("summarize")} className="glass glass-interactive p-3.5 text-left rounded-xl">
                <BookOpen className="w-3.5 h-3.5 text-[#1856FF] mb-1.5" />
                <p className="text-[11px] font-medium text-white/40">Summarize chapter</p>
              </button>
              <button onClick={() => handleQuickAction("questions")} className="glass glass-interactive p-3.5 text-left rounded-xl">
                <FileQuestion className="w-3.5 h-3.5 text-[#1856FF] mb-1.5" />
                <p className="text-[11px] font-medium text-white/40">Generate questions</p>
              </button>
              <button onClick={() => handleQuickAction("visualize")} className="glass glass-interactive p-3.5 text-left rounded-xl sm:col-span-3">
                <GitBranch className="w-3.5 h-3.5 text-[#06B6D4] mb-1.5" />
                <p className="text-[11px] font-medium text-white/40">Visualize as mind map</p>
              </button>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 backdrop-blur-xl bg-[#09090B]/80 border-t border-white/[0.04] pt-2.5 max-lg:pb-[calc(env(safe-area-inset-bottom)+5.75rem)] lg:pb-[max(env(safe-area-inset-bottom),8px)]">
          {pending && (
            <div className="flex items-center justify-between px-1 pb-1.5">
              <span className="text-[9px] tracking-wide text-white/35">
                {pending.action === "explain" && "Which topic should I explain?"}
                {pending.action === "summarize" && "Which chapter should I summarize?"}
                {pending.action === "questions" && pending.step === "ask_topic" && "Questions about which topic?"}
                {pending.action === "questions" && pending.step === "ask_count" && "How many questions?"}
                {pending.action === "visualize" && "What should I visualize?"}
              </span>
              <button onClick={() => { setPending(null); setInput(""); }} className="text-[9px] text-white/25 hover:text-white/50 transition-colors">
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[#09090B] border border-white/[0.04] rounded-xl p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)]">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={
                pending ? (pending.step === "ask_count" ? "e.g. 5" : "Type your answer...") : "Ask anything about physics..."
              }
              className="flex-1 bg-transparent text-sm outline-none px-2.5 min-w-0 text-white/70 placeholder:text-white/15 py-1.5" />
            <button onClick={handleSend} disabled={!input.trim() || isAsking}
              className="p-2 rounded-lg bg-[#1856FF] text-white disabled:opacity-20 hover:bg-[#1856FF]/80 transition-all flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
