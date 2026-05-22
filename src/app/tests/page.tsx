"use client";

import { motion } from "framer-motion";
import { useVaultStore } from "@/stores/vault-store";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { Clock, Timer, ChevronRight, BookOpen } from "lucide-react";

export default function TestsRootPage() {
  const { vault, isLoaded } = useVaultStore();

  const testChapters =
    vault?.chapters.filter((ch) =>
      vault.questions.some((q) => q.chapter === ch.name)
    ) || [];

  return (
    <div className="min-h-screen">
      <Header title="Mock Tests" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Mock Tests</h1>
        <p className="text-sm text-white/35 mb-8">
          JEE-pattern tests with timer, marking, and analytics
        </p>

        {!isLoaded ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 skeleton rounded-[20px]" />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Timer className="w-4 h-4 text-[#1856FF]" />
                Chapter Tests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testChapters.map((ch, i) => (
                  <motion.div
                    key={ch.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      href={`/tests/${encodeURIComponent(ch.name)}`}
                      className="glass glass-interactive p-5 block no-underline"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">{ch.name}</h3>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-white/30">
                        <span>{vault?.questions.filter((q) => q.chapter === ch.name).length || 0} questions available</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981]">
                          Configurable
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-white/25">
                          Timer
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-[#8B5CF6]" />
                Full-Length Tests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    name: "Full Physics — All Chapters",
                    count: vault?.questions.length || 0,
                    time: "60 min",
                  },
                  {
                    name: "Mixed Chapter — Random Selection",
                    count: Math.min(30, vault?.questions.length || 0),
                    time: "45 min",
                  },
                ].map((test, i) => (
                  <motion.div
                    key={test.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass p-5 flex flex-col"
                  >
                    <h3 className="text-sm font-semibold mb-2">{test.name}</h3>
                    <div className="flex items-center gap-3 text-[10px] text-white/30 mb-4">
                      <span>{test.count} questions</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {test.time}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs hover:bg-[#8B5CF6]/20 transition-colors">
                        Start Full Test
                      </button>
                      <button className="px-3 py-2.5 rounded-xl glass-interactive text-white/30 text-xs">
                        Configure
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="glass p-6">
              <h3 className="text-sm font-semibold mb-1">
                JEE Advanced Simulator
              </h3>
              <p className="text-xs text-white/30 mb-4">
                Full JEE Advanced pattern with 3 sections, negative marking, and
                percentile simulation.
              </p>
              <button className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#1856FF]/10 to-[#8B5CF6]/10 border border-[#1856FF]/10 text-white/50 text-xs hover:text-white/80 transition-all">
                Coming Soon
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
