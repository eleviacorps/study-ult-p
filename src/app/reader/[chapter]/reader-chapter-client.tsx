"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { Trash2, AlertTriangle } from "lucide-react";

export default function ReaderChapterPage() {
  const params = useParams<{ chapter: string }>();
  const { vault, isLoaded, removeChapter } = useVaultStore();
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const chapterName = decodeURIComponent(params.chapter);

  const chapterNotes = vault ? vault.notes.filter((n) => n.chapter === chapterName) : [];

  if (!isLoaded || !vault) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="p-8 space-y-4">
          <div className="h-8 w-48 skeleton" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-[20px]" />
            ))}
        </div>

        {/* Delete confirmation */}
        <AnimatePresence>
          {showDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setShowDelete(false)}
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
                  <h3 className="text-sm font-semibold">Delete "{chapterName}"?</h3>
                </div>
                <p className="text-xs text-white/40 mb-6 leading-relaxed">
                  This will permanently remove all {chapterNotes.length} notes from this device and the database.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDelete(false)}
                    className="flex-1 py-2 text-xs bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setDeleting(true);
                      await removeChapter(chapterName);
                      setDeleting(false);
                      setShowDelete(false);
                    }}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        breadcrumbs={[
          { label: "Reader", href: "/reader" },
          { label: chapterName, href: "#" },
        ]}
      />
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">{chapterName}</h1>
              <p className="text-sm text-white/35 mb-8">
                {chapterNotes.length} topics
              </p>
            </div>
            <button
              onClick={() => setShowDelete(true)}
              className="p-2 text-[#EF4444]/40 hover:text-[#EF4444]/80 hover:bg-[#EF4444]/5 transition-all"
              title="Delete chapter"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chapterNotes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/reader/${encodeURIComponent(chapterName)}/${note.id}`}
                className="glass glass-interactive p-5 block h-full"
              >
                <h3 className="text-sm font-semibold mb-2 group-hover:text-[#1856FF] transition-colors">
                  {note.title}
                </h3>
                <p className="text-xs text-white/30 line-clamp-2 leading-relaxed">
                  {note.content
                    .substring(0, 180)
                    .replace(/[#*>\-\[\]`]/g, "")
                    .replace(/\n/g, " ")}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/25"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
