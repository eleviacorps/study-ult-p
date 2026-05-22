"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { useLlm } from "@/lib/llm-context";
import type { Note } from "@/types";
import { Bot, Loader2, X } from "lucide-react";

export default function ReaderPage() {
  const params = useParams<{ chapter: string; note: string }>();
  const { vault, isLoaded } = useVaultStore();
  const { ask, config } = useLlm();
  const [note, setNote] = useState<Note | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !vault) return;
    const found = vault.notes.find((n) => n.id === params.note);
    setNote(found || null);
  }, [isLoaded, vault, params.note]);

  if (!isLoaded || !vault) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="p-8 max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-64 skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-3/4 skeleton" />
          <div className="h-4 w-5/6 skeleton" />
          <div className="h-4 w-2/3 skeleton" />
        </div>
      </div>
    );
  }

  if (!note) {
    const chapterNotes = vault.notes.filter(
      (n) => n.chapter === decodeURIComponent(params.chapter)
    );

    return (
      <div className="min-h-screen">
        <Header
          breadcrumbs={[
            { label: "Reader", href: "/reader" },
            { label: decodeURIComponent(params.chapter), href: "#" },
          ]}
        />
        <div className="p-8 max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">
            {decodeURIComponent(params.chapter)}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chapterNotes.map((n) => (
              <motion.a
                key={n.id}
                href={`/reader/${encodeURIComponent(n.chapter)}/${n.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-5 hover:bg-white/[0.06] transition-all cursor-pointer group"
              >
                <h3 className="text-sm font-semibold mb-2 group-hover:text-[#1856FF] transition-colors">
                  {n.title}
                </h3>
                <p className="text-xs text-white/30 line-clamp-2">
                  {n.content.substring(0, 150).replace(/[#*>\-\[\]]/g, "")}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {n.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/25"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const headings =
    note.content.match(/^#{1,3}\s+(.+)$/gm)?.map((h) => {
      const level = h.match(/^(#{1,3})\s/)?.[1].length || 1;
      return { text: h.replace(/^#{1,3}\s+/, ""), level };
    }) || [];

  return (
    <div className="min-h-screen">
      <Header
        breadcrumbs={[
          { label: "Reader", href: "/reader" },
          {
            label: decodeURIComponent(params.chapter),
            href: `/reader/${encodeURIComponent(params.chapter)}`,
          },
          { label: note.title, href: "#" },
        ]}
      />
      <div className="flex">
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-3 px-2">
            On this page
          </p>
          {headings.map((h, i) => (
            <a
              key={i}
              href={`#${h.text.toLowerCase().replace(/\s+/g, "-")}`}
              className="block px-2 py-1 text-xs text-white/35 hover:text-white/70 transition-colors rounded-md hover:bg-white/[0.03]"
              style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
            >
              {h.text}
            </a>
          ))}
        </aside>

        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.article
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass p-6 sm:p-10">
                <MarkdownRenderer content={note.content} />
              </div>

              {note.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-4 mb-8">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] text-white/30 border border-white/[0.04]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 glass rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="w-4 h-4 text-[#8B5CF6]" />
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    Ask AI about this topic
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter" && aiQuery.trim() && !aiLoading) {
                        setAiLoading(true);
                        const context = `You are a JEE physics tutor. Here is the full chapter content:\n\n${note.content.substring(0, 4000)}\n\nStudent question:`;
                        const { content } = await ask(context, aiQuery);
                        setAiResponse(content);
                        setAiLoading(false);
                      }
                    }}
                    placeholder="Ask a question about this topic..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <button
                    onClick={async () => {
                      if (!aiQuery.trim() || aiLoading) return;
                      setAiLoading(true);
                      const context = `You are a JEE physics tutor. Here is the full chapter content:\n\n${note.content.substring(0, 4000)}\n\nStudent question:`;
                      const { content } = await ask(context, aiQuery);
                      setAiResponse(content);
                      setAiLoading(false);
                    }}
                    disabled={aiLoading || !aiQuery.trim()}
                    className="px-3 py-2 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] text-xs disabled:opacity-30 hover:bg-[#8B5CF6]/25 transition-colors"
                  >
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}
                  </button>
                </div>
                {aiResponse && (
                  <div className="mt-3 p-3 rounded-xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 text-xs opacity-60 leading-relaxed">
                    {aiResponse}
                  </div>
                )}
              </div>
            </motion.article>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
