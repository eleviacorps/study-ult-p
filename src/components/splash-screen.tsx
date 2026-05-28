"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const STARS = 120;

export function SplashScreen() {
  const [phase, setPhase] = useState<"icon" | "text" | "spinner">("icon");

  const stars = useMemo(() => {
    const list = [];
    for (let i = 0; i < STARS; i++) {
      list.push({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() > 0.9 ? 2.5 : Math.random() > 0.6 ? 1.5 : 1,
        delay: Math.random() * 6,
        dur: 2 + Math.random() * 4,
      });
    }
    return list;
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 2000);
    const t2 = setTimeout(() => setPhase("spinner"), 5000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[100] bg-[#09090B] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 15% 25%, rgba(24, 86, 255, 0.07), transparent), radial-gradient(ellipse 50% 60% at 85% 75%, rgba(6, 182, 212, 0.05), transparent), radial-gradient(ellipse 40% 40% at 50% 50%, rgba(24, 86, 255, 0.03), transparent)",
            backgroundSize: "200% 200%",
            animation: "gradient-shift 10s ease infinite",
          }}
        />
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <img src="/splash-screen-logo.png" alt="" className="w-20 h-20 sm:w-24 sm:h-24" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: phase === "icon" ? 0 : 1, y: phase === "icon" ? 12 : 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mt-5 text-base sm:text-lg font-semibold tracking-[0.25em] text-white/70"
      >
        EV | STUDY
      </motion.p>

      <AnimatePresence>
        {phase === "spinner" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="mt-8"
          >
            <Loader2 className="w-5 h-5 animate-spin text-white/20" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
