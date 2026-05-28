"use client";

import { useMemo } from "react";

const STARS = 180;

export function GalaxyBackground() {
  const stars = useMemo(() => {
    const list = [];
    for (let i = 0; i < STARS; i++) {
      const r = Math.random();
      list.push({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: r > 0.95 ? 3 : r > 0.75 ? 2 : 1,
        delay: Math.random() * 8,
        dur: 2 + Math.random() * 4,
      });
    }
    return list;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white star"
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
  );
}
