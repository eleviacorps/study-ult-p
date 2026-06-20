"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Send, Loader2, Bot, User, X } from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";

interface TutorMessage {
  role: "tutor" | "student";
  content: string;
}

export function TutorPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [mastery, setMastery] = useState<Record<string, number>>({});
  const chatRef = useRef<HTMLDivElement>(null);
  const vaultData = useVaultStore((s) => s.vault);
  const currentChapter = useVaultStore((s) => s.currentChapter);
  const currentNote = useVaultStore((s) => s.currentNote);

  const startSession = useCallback(async () => {
    setOpen(true);
    setMessages([]);

    // Build context from current chapter/note
    const chapterName = currentChapter?.name || "Physics";
    const noteTitle = currentNote?.title || "";
    const noteContent = currentNote?.content || "";
    const vaultSummary = vaultData
      ? `Vault has ${vaultData.notes?.length || 0} notes, ${vaultData.questions?.length || 0} questions, ${vaultData.flashcards?.length || 0} flashcards`
      : "";

    setTopic(noteTitle || chapterName);
    setLoading(true);

    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash-001",
          contents: [
            {
              role: "user",
              parts: [{
                text: `You are a JEE Physics tutor. The student is studying "${chapterName}".\n\nCurrent topic: "${noteTitle}"\n\nTopic content:\n${(noteContent || "").slice(0, 15000)}\n\n${vaultSummary}\n\nIntroduce the topic conversationally. Then ask ONE question to check their understanding. Keep your response under 200 words.`
              }]
            }
          ],
        }),
      });
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Let's start! What do you know about this topic?";
      setMessages([{ role: "tutor", content: reply }]);
    } catch (err: any) {
      setMessages([{ role: "tutor", content: "Connection failed. Make sure GEMINI_API_KEY is set." }]);
    }
    setLoading(false);
  }, [vaultData, currentChapter, currentNote]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const studentMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "student", content: studentMsg }]);
    setLoading(true);

    const history = [...messages, { role: "student" as const, content: studentMsg }];

    try {
      const res = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash-001",
          contents: [
            {
              role: "user",
              parts: [{
                text: `You are a JEE Physics tutor for "${currentChapter?.name || "Physics"}".\n\nCurrent topic: "${currentNote?.title || ""}"\n\nTopic content (for reference):\n${(currentNote?.content || "").slice(0, 15000)}\n\nYou are teaching the student. Keep responses under 150 words. Ask follow-up questions to check understanding. If they answer correctly, praise and ask a harder question. If wrong, gently correct and explain. After 3+ exchanges, estimate their mastery (0-100) and suggest next topic if ready.`
              }]
            },
            ...history.map((m) => ({
              role: m.role === "tutor" ? "model" as const : "user" as const,
              parts: [{ text: m.content }],
            })),
          ],
        }),
      });
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I didn't get that. Can you rephrase?";

      setMessages((prev) => [...prev, { role: "tutor", content: reply }]);

      // Extract mastery estimate from reply
      const masteryMatch = reply.match(/mastery[:\s]+(\d+)/i);
      if (masteryMatch && currentNote?.title) {
        setMastery((prev) => ({ ...prev, [currentNote.title!]: parseInt(masteryMatch[1]) }));
      }
    } catch {
      setMessages((prev) => [...prev, { role: "tutor", content: "Sorry, I lost connection. Try again." }]);
    }
    setLoading(false);
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [input, loading, messages, currentChapter, currentNote]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-6 z-50 w-96 h-[520px] glass rounded-2xl border border-white/[0.06] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#1856FF]" />
                <span className="text-sm font-medium text-white/80">AI Tutor</span>
              </div>
              <div className="flex items-center gap-2">
                {currentNote?.title && (
                  <span className="text-[10px] text-white/30 px-2 py-0.5 rounded-full bg-white/[0.04]">
                    {mastery[currentNote.title] ? `${mastery[currentNote.title]}%` : "New"}
                  </span>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/[0.06] rounded-lg">
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Bot className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-xs text-white/30">Open a note first, then start the tutor.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "tutor" ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                      m.role === "tutor"
                        ? "bg-white/[0.04] text-white/70 border border-white/[0.04]"
                        : "bg-[#1856FF]/20 text-white/80 border border-[#1856FF]/20"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {m.role === "tutor" ? (
                        <Bot className="w-3 h-3 text-[#1856FF]" />
                      ) : (
                        <User className="w-3 h-3 text-white/40" />
                      )}
                      <span className="text-[10px] text-white/20">{m.role === "tutor" ? "Tutor" : "You"}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.04] px-3 py-2 rounded-xl border border-white/[0.04]">
                    <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/[0.04]">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your answer..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-[#1856FF]/40"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="p-2 bg-[#1856FF] hover:bg-[#1547D6] disabled:bg-white/[0.06] rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={open ? () => setOpen(false) : startSession}
        className={`fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          open ? "bg-white/[0.08]" : "bg-[#1856FF] hover:bg-[#1547D6]"
        }`}
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <GraduationCap className="w-5 h-5 text-white" />
        )}
      </motion.button>
    </>
  );
}
