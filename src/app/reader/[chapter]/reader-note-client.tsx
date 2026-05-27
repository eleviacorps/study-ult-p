"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { MarkdownRenderer } from "@/components/reader/markdown-renderer";
import { AiTutorSidebar } from "@/components/ai-tutor-sidebar";
import { SelectionToolbar } from "@/components/selection-toolbar";
import { useLlm } from "@/lib/llm-context";
import { addPoints } from "@/lib/study-state";
import type { Note } from "@/types";
import { Bot, Loader2, X } from "lucide-react";

export default function ReaderPage() {
  const params = useParams<{ chapter: string; note: string }>();
  const { vault, isLoaded } = useVaultStore();
  const { ask, config } = useLlm();
  const [note, setNote] = useState<Note | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  const handleSelectionExplain = useCallback(async (text: string) => {
    if (!config.enabled) return;
    setTutorOpen(true);
    setTimeout(() => {
      const event = new CustomEvent("tutor-ask", { detail: `Explain this: ${text}` });
      window.dispatchEvent(event);
    }, 300);
  }, [config.enabled]);

  const handleSelectionSummarize = useCallback(async (text: string) => {
    if (!config.enabled) return;
    setTutorOpen(true);
    setTimeout(() => {
      const event = new CustomEvent("tutor-ask", { detail: `Summarize this concisely: ${text}` });
      window.dispatchEvent(event);
    }, 300);
  }, [config.enabled]);

  const handleSelectionManim = useCallback(async (text: string) => {
    if (!config.enabled) return;
    setTutorOpen(true);
    setTimeout(() => {
      const event = new CustomEvent("tutor-ask", { detail: `Write a Manim Community Edition Python animation script for: "${text}". Use from manim import *. Include a single Scene class. Keep it short and visual.` });
      window.dispatchEvent(event);
    }, 300);
  }, [config.enabled]);

  const handleSearchVideos = useCallback((text: string) => {
    const query = encodeURIComponent(`${text} JEE physics`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, "_blank");
  }, []);

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
        <div className="p-4 sm:p-8 max-w-5xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold mb-6">
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
      <SelectionToolbar
        onExplain={handleSelectionExplain}
        onSummarize={handleSelectionSummarize}
        onManim={handleSelectionManim}
        onSearchVideos={handleSearchVideos}
      />
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
      <div className={`flex overflow-x-hidden transition-all duration-300 ${tutorOpen ? 'xl:mr-[340px]' : ''}`}>
        <aside className="hidden xl:block w-56 flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-white/25 mb-3 px-2">
            On this page
          </p>
          {headings.map((h, i) => (
            <a
              key={i}
              href={`#${h.text.toLowerCase().replace(/\s+/g, "-")}`}
              className="block px-2 py-1 text-xs text-white/35 hover:text-white/70 transition-colors hover:bg-white/[0.03]"
              style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
            >
              {h.text}
            </a>
          ))}
        </aside>

        <main className="flex-1 min-w-0 max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <AnimatePresence mode="wait">
            <motion.article
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="glass p-4 sm:p-6 md:p-10 overflow-x-hidden rounded-2xl">
                <MarkdownRenderer content={note.content} />
              </div>

              {note.tags.length > 0 && (
                <div className="flex items-center gap-2 mt-4 mb-8">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2.5 py-1 bg-white/[0.04] text-white/30 border border-white/[0.04]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.article>
          </AnimatePresence>
        </main>

        <AiTutorSidebar
          context={note.content}
          chapterName={decodeURIComponent(params.chapter)}
          onOpenChange={setTutorOpen}
        />
      </div>
    </div>
  );
}
