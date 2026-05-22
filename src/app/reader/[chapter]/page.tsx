"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import Link from "next/link";

export default function ReaderChapterPage() {
  const params = useParams<{ chapter: string }>();
  const { vault, isLoaded } = useVaultStore();

  const chapterName = decodeURIComponent(params.chapter);

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
        </div>
      </div>
    );
  }

  const chapterNotes = vault.notes.filter((n) => n.chapter === chapterName);

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
          <h1 className="text-2xl font-bold mb-1">{chapterName}</h1>
          <p className="text-sm text-white/35 mb-8">
            {chapterNotes.length} topics
          </p>
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
