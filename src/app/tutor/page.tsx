"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { useVaultStore } from "@/stores/vault-store";
import { useLlm } from "@/lib/llm-context";
import { Bot, Send, Brain, BookOpen, FileQuestion, ChevronDown, ChevronUp, Plus, History } from "lucide-react";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { updateStudyState, addPoints } from "@/lib/study-state";
import { buildStructuredTutorContext } from "@/lib/ai-retrieval";
import { cn } from "@/lib/cn";
import { clearChat, getChatSessionSummary, loadChat, saveChat, setChatSession, syncChatToDB, getTutorKey } from "@/lib/chat-store";
import type { ChatMessage } from "@/lib/chat-store";

type TutorSession = {
  id: string;
  title: string;
  type: string;
  updated_at?: string;
  last_message_at?: string;
};

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
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);

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

  const refreshSessions = async () => {
    try {
      const res = await fetch("/api/chat?sessions=1");
      if (!res.ok) return;
      const data = await res.json();
      const next = Array.isArray(data.sessions)
        ? data.sessions.filter((session: TutorSession) => session.type === "physics_tutor")
        : [];
      setSessions(next);
    } catch {}
  };

  useEffect(() => {
    if (mounted) refreshSessions();
  }, [mounted]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const quickActions = [
    { icon: Brain, label: "Explain topic", query: "Explain the concept of electric field in simple terms." },
    { icon: BookOpen, label: "Summarize chapter", query: "Summarize all important concepts from the current chapter." },
    { icon: FileQuestion, label: "Generate questions", query: "Generate 3 JEE-level practice questions based on the chapter content." },
  ];

  const buildContext = async (question: string, chatSummary = ""): Promise<string> => {
    return buildStructuredTutorContext(vault, question, {
      surface: "main_tutor",
      subject: "Physics",
      chatSummary,
      studentProfile,
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isAsking) return;
    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");

    const chatSummary = await getChatSessionSummary(chatKey);
    const context = await buildContext(userMsg, chatSummary);
    const { content, reasoning } = await ask(context, userMsg);
    setMessages((prev) => [...prev, { role: "assistant", content, reasoning }]);

    updateStudyState((state) => {
      const today = new Date().toISOString().split("T")[0];
      state.lastStudyDate = today;
      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 3;
    });
    addPoints(3, "Tutor Chat", userMsg.substring(0, 50));
    refreshSessions();
  };

  const startNewChat = () => {
    const greeting = { role: "assistant" as const, content: "Hi! Ask me anything about physics." };
    clearChat(chatKey);
    setMessages([greeting]);
    setExpandedReasoning(new Set());
    setShowHistory(false);
  };

  const loadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat?session_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const nextMessages = Array.isArray(data.messages)
        ? data.messages
            .filter((message: any) => message.role === "user" || message.role === "assistant")
            .map((message: any) => ({ role: message.role, content: message.content }))
        : [];
      setChatSession(chatKey, sessionId, nextMessages.length);
      saveChat(chatKey, nextMessages);
      setMessages(nextMessages.length > 0 ? nextMessages : [{ role: "assistant", content: "Hi! Ask me anything about physics." }]);
      setExpandedReasoning(new Set());
      setShowHistory(false);
    } catch {}
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden">
      <Header title="AI Tutor" />
      <div className="flex-1 min-h-0 max-w-3xl mx-auto w-full px-4 sm:px-6 flex flex-col">
        <div className="pt-4 flex items-center justify-between gap-3 flex-shrink-0">
          <div>
            <p className="text-xs opacity-35">Physics tutor</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory((value) => !value)}
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
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass p-3 mt-3 space-y-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Chat History</p>
              <button onClick={refreshSessions} className="text-[10px] opacity-35 hover:opacity-70">Refresh</button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs opacity-30 py-2">No saved tutor sessions yet.</p>
            ) : (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className="w-full text-left p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
                  >
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

        <div ref={chatRef} className="flex-1 min-h-0 overflow-y-auto py-6 space-y-4">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-[#1856FF]/15 flex items-center justify-center flex-shrink-0 mt-1 border border-[#1856FF]/20">
                  <Bot className="w-4 h-4 text-[#1856FF]" />
                </div>
              )}
              <div className={cn("max-w-[95%] sm:max-w-[90%] p-3 sm:p-4 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-[#1856FF]/15 rounded-2xl rounded-br-md border border-[#1856FF]/20"
                  : "bg-[#09090B] rounded-2xl rounded-bl-md border border-white/[0.06]")}>
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
                      <div className="mt-1.5 p-2.5 rounded-lg bg-[#1856FF]/5 border border-[#1856FF]/10 text-[11px] opacity-40 leading-relaxed max-h-48 overflow-y-auto">
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
                  <div key={i} className="w-2 h-2 rounded-full bg-[#1856FF]/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
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
                  getChatSessionSummary(chatKey).then(async (chatSummary) => ask(await buildContext(action.query, chatSummary), action.query)).then(({ content, reasoning }) => {
                    setMessages((prev) => [...prev, { role: "assistant", content, reasoning }]);
                    updateStudyState((state) => {
                      const today = new Date().toISOString().split("T")[0];
                      state.lastStudyDate = today;
                      state.studyMinutes[today] = (state.studyMinutes[today] || 0) + 3;
                    });
                    addPoints(3, action.label, action.query.substring(0, 50));
                  });
                }} className="glass glass-interactive p-4 text-left">
                  <action.icon className="w-4 h-4 text-[#1856FF] mb-2" />
                  <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{action.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 max-lg:pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:pt-4">
          <div className="flex items-center gap-2 bg-[#09090B] border border-white/[0.06] rounded-2xl p-2 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything about physics..."
              className="flex-1 bg-transparent text-sm outline-none px-3 min-w-0 text-white/70 placeholder:text-white/20" />
            <button onClick={handleSend} disabled={!input.trim() || isAsking}
              className="p-2.5 rounded-xl bg-[#1856FF] text-white disabled:opacity-20 hover:bg-[#1856FF]/80 transition-all flex-shrink-0 shadow-[0_0_20px_rgba(24,86,255,0.2)]">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
