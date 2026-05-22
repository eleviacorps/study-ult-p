"use client";

import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Clock, Flag, ChevronRight, Timer } from "lucide-react";

export default function TestsRootPage() {
  return (
    <div className="min-h-screen">
      <Header title="Mock Tests" />
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Mock Tests</h1>
        <p className="text-sm text-white/35 mb-8">
          Full JEE simulator with timer, marking, and analytics
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["Electric Charges and Fields", "Units and Measurement"].map(
            (ch, i) => (
              <motion.div
                key={ch}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#1856FF]/10 flex items-center justify-center">
                    <Timer className="w-5 h-5 text-[#1856FF]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{ch}</h3>
                    <p className="text-[10px] text-white/30">20 questions · 30 mins</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-[10px] text-white/30">
                    <Clock className="w-3 h-3" />
                    30 min
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-white/30">
                    <Flag className="w-3 h-3" />
                    JEE Pattern
                  </div>
                </div>
                <button className="w-full py-3 rounded-xl bg-[#1856FF]/10 border border-[#1856FF]/20 text-[#1856FF] text-xs font-medium hover:bg-[#1856FF]/20 transition-colors flex items-center justify-center gap-2">
                  Start Test <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          )}
        </div>

        <div className="mt-8 glass p-6">
          <h3 className="text-sm font-semibold mb-1">Coming Soon</h3>
          <p className="text-xs text-white/30">
            Full-length JEE Main and Advanced mock tests with percentile simulation,
            negative marking, and detailed analytics will be available in the next update.
          </p>
        </div>
      </div>
    </div>
  );
}
