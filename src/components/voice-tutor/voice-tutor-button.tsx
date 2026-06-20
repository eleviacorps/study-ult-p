"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Loader2, X, GraduationCap, User } from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";

interface ChatMsg {
  role: "tutor" | "student";
  content: string;
}

export function LiveTutorPanel() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const vaultData = useVaultStore((s) => s.vault);
  const cc = useVaultStore((s) => s.currentChapter);
  const cn = useVaultStore((s) => s.currentNote);

  const start = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    setError("");
    setMsgs([]);

    const vaultCtx = vaultData?.notes?.map((n: any) => `${n.path}\n${(n.content || "").slice(0, 3000)}`).join("\n\n").slice(0, 50000) || "";

    try {
      const r = await fetch("/api/gemini-live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Start teaching "${cn?.title || cn?.name}" — topic: "${cn?.title || ""}". Introduce it conversationally.`,
          vaultContext: vaultCtx,
          chapterName: cc?.name || "Physics",
          topicName: cn?.title || "",
        }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setMsgs([{ role: "tutor", content: d.reply }]);
    } catch { setError("Failed to connect"); }
    setLoading(false);
  }, [vaultData, cc, cn]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    setMsgs((p) => [...p, { role: "student", content: q }]);
    setLoading(true);

    const vaultCtx = vaultData?.notes?.map((n: any) => `${n.path}\n${(n.content || "").slice(0, 2000)}`).join("\n\n").slice(0, 40000) || "";

    try {
      const r = await fetch("/api/gemini-live/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: q,
          vaultContext: vaultCtx,
          chapterName: cc?.name || "Physics",
          topicName: cn?.title || "",
        }),
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setMsgs((p) => [...p, { role: "tutor", content: d.reply }]);
    } catch { setError("Lost connection"); }
    setLoading(false);
  }, [input, loading, vaultData, cc, cn]);

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
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#1856FF]" />
                <span className="text-sm font-medium text-white/80">Live Tutor</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/[0.06] rounded-lg">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgs.length === 0 && !loading && (
                <div className="text-center py-12">
                  <Bot className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Open a note, then tap the button to start.</p>
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "tutor" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${m.role === "tutor" ? "bg-white/[0.04] text-white/70 border border-white/[0.04]" : "bg-[#1856FF]/20 text-white/80 border border-[#1856FF]/20"}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {m.role === "tutor" ? <Bot className="w-3 h-3 text-[#1856FF]" /> : <User className="w-3 h-3 text-white/40" />}
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
              {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            </div>

            <div className="p-3 border-t border-white/[0.04]">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Ask a question..."
                  className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-[#1856FF]/40"
                />
                <button onClick={send} disabled={loading || !input.trim()}
                  className="p-2 bg-[#1856FF] hover:bg-[#1547D6] disabled:bg-white/[0.06] rounded-xl transition-colors"
                ><Send className="w-4 h-4 text-white" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={open ? () => setOpen(false) : start}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-[#1856FF] hover:bg-[#1547D6]"
      >
        {loading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : open ? <X className="w-6 h-6 text-white" /> : <GraduationCap className="w-6 h-6 text-white" />}
      </motion.button>
    </>
  );
}
