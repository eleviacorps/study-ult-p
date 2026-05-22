"use client";

import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { Layers } from "lucide-react";

export default function FlashcardsRootPage() {
  const { vault, isLoaded } = useVaultStore();

  return (
    <div className="min-h-screen">
      <Header title="Flashcards" />
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Flashcards</h1>
        <p className="text-sm text-white/35 mb-8">
          Animated flip cards with spaced repetition
        </p>

        {!isLoaded || !vault ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 skeleton rounded-[20px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vault.chapters
              .filter((ch) =>
                vault.flashcards.some((f) => f.chapter === ch.name)
              )
              .map((ch, i) => {
                const count = vault.flashcards.filter(
                  (f) => f.chapter === ch.name
                ).length;
                return (
                  <motion.div
                    key={ch.name}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={`/flashcards/${encodeURIComponent(ch.name)}`}
                      className="glass glass-interactive p-5 block"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#8B5CF6]" />
                          <h3 className="text-sm font-semibold">{ch.name}</h3>
                        </div>
                        <span className="text-[10px] text-[#8B5CF6]">
                          {count} cards
                        </span>
                      </div>
                      <p className="text-xs text-white/30">
                        Concept definitions, formulas, and memory tricks
                      </p>
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
