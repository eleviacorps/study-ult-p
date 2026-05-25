"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import { getFlashcardStats, getDueFlashcards } from "@/lib/spaced-repetition";
import Link from "next/link";
import { Layers, Brain, Clock, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";

export default function FlashcardsRootPage() {
  const { vault, isLoaded } = useVaultStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const flashcardChapters = vault?.chapters.filter((ch) =>
    vault.flashcards.some((f) => f.chapter === ch.name)
  ) || [];

  return (
    <div className="min-h-screen">
      <Header title="Flashcards" />
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Flashcards</h1>
        <p className="text-sm text-white/35 mb-8">
          SM-2 spaced repetition with animated flip cards
        </p>

        {!isLoaded || !vault ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 skeleton rounded-[20px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flashcardChapters.map((ch, i) => {
              const chapterCards = vault.flashcards.filter((f) => f.chapter === ch.name);
              const cardIds = chapterCards.map((c) => c.id);
              const stats = mounted ? getFlashcardStats(cardIds) : { due: 0, new: chapterCards.length, learning: 0, mastered: 0 };
              return (
                <motion.div
                  key={ch.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link
                    href={`/flashcards/${encodeURIComponent(ch.name)}`}
                    className="glass glass-interactive p-5 block no-underline"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#8B5CF6]" />
                        <h3 className="text-sm font-semibold">{ch.name}</h3>
                      </div>
                      <span className="text-[10px] text-[#8B5CF6]">
                        {chapterCards.length} cards
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { label: "New", value: stats.new, color: "#1856FF", icon: BookOpen },
                        { label: "Due", value: stats.due, color: "#F59E0B", icon: Clock },
                        { label: "Learning", value: stats.learning, color: "#8B5CF6", icon: Brain },
                        { label: "Mastered", value: stats.mastered, color: "#10B981", icon: Layers },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="p-2 flex flex-col items-center"
                          style={{ backgroundColor: `${s.color}08`, border: `1px solid ${s.color}15` }}
                        >
                          <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
                          <span className="text-[9px] text-white/25">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
