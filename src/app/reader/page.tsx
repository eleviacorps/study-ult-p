"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { Trash2, AlertTriangle, BookOpen, GraduationCap } from "lucide-react";
import { loadStudyState } from "@/lib/study-state";

export default function ReaderRootPage() {
  const { vault, isLoaded, removeChapter } = useVaultStore();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function getChapterProgress(chapterName: string): number {
    try {
      const state = loadStudyState();
      // Check test scores and quiz scores for this chapter
      const testEntries = (state.testScores || []).filter(s => s.chapter === chapterName);
      if (testEntries.length > 0) {
        const last = testEntries[testEntries.length - 1];
        return Math.round((last.score / Math.max(1, last.total)) * 100);
      }
      // Fallback to quiz scores if no test taken yet
      const quizMatches = (state.quizScores || []).filter(s => s.total > 0);
      if (quizMatches.length > 0) {
        const last = quizMatches[quizMatches.length - 1];
        return Math.round((last.score / Math.max(1, last.total)) * 100);
      }
      return 0;
    } catch { return 0; }
  }

  const subjectAuthorChapters = useMemo(() => {
    if (!vault) return [];
    const map: Record<string, Record<string, { chapter: string; noteCount: number }[]>> = {};
    for (const ch of vault.chapters) {
      const subject = ch.subject || "General";
      const author = ""; // static vault chapters have no author
      if (!map[subject]) map[subject] = {};
      if (!map[subject][author]) map[subject][author] = [];
      const noteCount = vault.notes.filter((n) => n.chapter === ch.name && !n.path.match(/[/\\](questions|flashcards|quizzes)[/\\]/)).length;
      map[subject][author].push({ chapter: ch.name, noteCount });
    }
    for (const note of vault.notes) {
      const subject = note.subject || "General";
      const author = note.author || "Other";
      if (!map[subject]) map[subject] = {};
      if (!map[subject][author]) map[subject][author] = [];
      const existing = map[subject][author].find((c) => c.chapter === note.chapter);
      if (!existing) {
        map[subject][author].push({ chapter: note.chapter, noteCount: 1 });
      }
    }
    return Object.entries(map).map(([subject, authors]) => ({
      subject,
      authors: Object.entries(authors).map(([author, chapters]) => ({
        author: author || "General",
        chapters,
      })),
    }));
  }, [vault]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await removeChapter(deleteTarget);
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen">
      <Header title="Reader" />
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Knowledge Vault</h1>
        <p className="text-sm text-white/35 mb-8">
          Browse study materials by subject, author, and chapter
        </p>

        {!isLoaded || !vault ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 skeleton rounded-[20px]" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {subjectAuthorChapters.map(({ subject, authors }) => (
              <div key={subject}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-[#1856FF]/80">
                  <BookOpen className="w-4 h-4" /> {subject}
                </h2>
                <div className="space-y-4 pl-4">
                  {authors.map(({ author, chapters }) => (
                    <div key={author}>
                      <h3 className="text-xs font-medium uppercase tracking-wider opacity-40 mb-2 flex items-center gap-1.5">
                        <GraduationCap className="w-3 h-3" /> {author}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {chapters.map((ch, i) => (
                          <motion.div
                            key={ch.chapter}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="group relative"
                          >
                            <Link
                              href={`/reader/${encodeURIComponent(ch.chapter)}`}
                              className="glass glass-interactive p-5 block"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold">{ch.chapter}</h3>
                                <span className="text-[10px] text-white/25">
                                  {ch.noteCount} notes
                                </span>
                              </div>
                              <p className="text-xs text-white/30 mb-3">
                                {author || "General"} &bull; {subject}
                              </p>
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#1856FF]/50"
                                    style={{ width: `${getChapterProgress(ch.chapter)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-white/20">
                                  {getChapterProgress(ch.chapter)}%
                                </span>
                              </div>
                            </Link>
                            <button
                              onClick={(e) => { e.preventDefault(); setDeleteTarget(ch.chapter); }}
                              className="absolute top-2 right-2 p-1.5 text-[#EF4444]/0 group-hover:text-[#EF4444]/50 hover:text-[#EF4444]/80 hover:bg-[#EF4444]/5 transition-all rounded-md"
                              title="Delete chapter"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass p-6 max-w-sm mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
                <h3 className="text-sm font-semibold">Delete "{deleteTarget}"?</h3>
              </div>
              <p className="text-xs text-white/40 mb-6 leading-relaxed">
                This will permanently remove all notes for this chapter from your device and database.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2 text-xs bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 text-xs bg-[#EF4444]/15 text-[#EF4444] hover:bg-[#EF4444]/25 border border-[#EF4444]/20 transition-all disabled:opacity-40"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
