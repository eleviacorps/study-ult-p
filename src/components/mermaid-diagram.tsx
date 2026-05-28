"use client";

import { useEffect, useMemo, useState } from "react";

type MermaidDiagramProps = {
  source: string;
};

export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const cleanedSource = useMemo(() => source.trim(), [source]);

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError("");

    fetch("/api/diagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: cleanedSource }),
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(text || "Diagram render failed");
        if (!cancelled) setSvg(text);
      })
      .catch(() => {
        if (!cancelled) setError("Diagram could not be rendered.");
      });

    return () => {
      cancelled = true;
    };
  }, [cleanedSource]);

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#05060A]/70">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">Visual Map</span>
        <span className="text-[10px] text-[#1856FF]/70">Mermaid</span>
      </div>
      <div className="min-h-32 overflow-x-auto bg-white/[0.02] p-3">
        {svg ? (
          <div className="mermaid-svg min-w-fit" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : error ? (
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-white/40">{cleanedSource}</pre>
        ) : (
          <div className="h-32 skeleton" />
        )}
      </div>
    </div>
  );
}
