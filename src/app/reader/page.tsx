"use client";

import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import Link from "next/link";

export default function ReaderRootPage() {
  const { vault, isLoaded } = useVaultStore();

  return (
    <div className="min-h-screen">
      <Header title="Reader" />
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Knowledge Vault</h1>
        <p className="text-sm text-white/35 mb-8">
          Explore your physics chapters and topics
        </p>

        {!isLoaded || !vault ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 skeleton rounded-[20px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vault.chapters.map((ch, i) => (
              <motion.div
                key={ch.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/reader/${encodeURIComponent(ch.name)}`}
                  className="glass glass-interactive p-5 block"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">{ch.name}</h3>
                    <span className="text-[10px] text-white/25">
                      {ch.totalTopics} topics
                    </span>
                  </div>
                  <p className="text-xs text-white/30 mb-3">
                    JEE Main: {ch.weightage.jeeMain} • Advanced:{" "}
                    {ch.weightage.jeeAdvanced}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#1856FF]/50"
                        style={{
                          width: `${Math.floor(Math.random() * 50 + 20)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-white/20">
                      {Math.floor(Math.random() * 50 + 20)}%
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
