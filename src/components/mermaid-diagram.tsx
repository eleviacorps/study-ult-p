"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

type MermaidDiagramProps = {
  source: string;
  onRetry?: (source: string) => void;
};

export function MermaidDiagram({ source, onRetry }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const cleanedSource = useMemo(() => source.trim(), [source]);
  const contentRef = useRef<HTMLDivElement>(null);
  const retriedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setSvg("");
    setError("");
    retriedRef.current = false;

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
        if (!cancelled) {
          setError("Diagram could not be rendered.");
        }
      });

    return () => { cancelled = true; };
  }, [cleanedSource]);

  useEffect(() => {
    if (error && onRetry && !retriedRef.current) {
      retriedRef.current = true;
      onRetry(cleanedSource);
    }
  }, [error, onRetry, cleanedSource]);

  const zoomIn = () => setZoom(z => Math.min(5, +(z * 1.4).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z / 1.4).toFixed(2)));

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  }, []);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ sx: 0, sy: 0, px: 0, py: 0 });

  const startDrag = useCallback((cx: number, cy: number) => {
    setDragging(true);
    dragRef.current = { sx: cx, sy: cy, px: pos.x, py: pos.y };
  }, [pos]);

  const moveDrag = useCallback((cx: number, cy: number) => {
    if (!dragging) return;
    setPos({ x: dragRef.current.px + cx - dragRef.current.sx, y: dragRef.current.py + cy - dragRef.current.sy });
  }, [dragging]);

  const stopDrag = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    const mm = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const mu = () => stopDrag();
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
  }, [dragging, moveDrag, stopDrag]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const card = (
    <div className="my-3 overflow-hidden rounded-xl border border-white/[0.06] bg-[#05060A]/50">
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/25">map</span>
        <button disabled={!!error} onClick={() => setExpanded(true)} className="p-1 rounded-md text-white/20 hover:text-white/60 hover:bg-white/[0.04] transition-all disabled:opacity-0">
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>
      <div
        onClick={() => !error && setExpanded(true)}
        className="min-h-24 overflow-x-auto bg-white/[0.01] p-2.5 cursor-pointer transition-colors hover:bg-white/[0.02] active:bg-white/[0.03]"
      >
        {svg ? (
          <div className="mermaid-svg min-w-fit [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : error ? (
          <div className="flex items-center gap-2 text-xs text-white/30 min-h-8">
            {onRetry ? (
              <><span className="w-2 h-2 rounded-full bg-[#1856FF] animate-pulse" />Fixing diagram...</>
            ) : (
              <pre className="overflow-x-auto whitespace-pre-wrap">{cleanedSource}</pre>
            )}
          </div>
        ) : (
          <div className="h-24 skeleton" />
        )}
      </div>
    </div>
  );

  if (!expanded) return card;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col" onClick={() => { setExpanded(false); setZoom(1); setPos({ x: 0, y: 0 }); }}>
      <div className="flex items-center justify-end gap-1.5 p-3 z-10">
        <button onClick={(e) => { e.stopPropagation(); setZoom(1); setPos({ x: 0, y: 0 }); }} className="p-1.5 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all">
          <span className="text-[10px] font-mono text-white/30 px-1">{Math.round(zoom * 100)}%</span>
        </button>
        <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} className="p-1.5 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} className="p-1.5 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); setExpanded(false); setZoom(1); setPos({ x: 0, y: 0 }); }} className="p-1.5 rounded-lg bg-white/[0.04] text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all ml-2">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className="flex-1 min-h-0 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrag}
        onWheel={handleWheel}
        style={{ cursor: dragging ? "grabbing" : zoom > 1 ? "grab" : "default", touchAction: "none" }}
      >
        <div
          ref={contentRef}
          style={{
            transform: `scale(${zoom}) translate(${pos.x / zoom}px, ${pos.y / zoom}px)`,
            transition: dragging ? "none" : "transform 0.15s ease",
            maxWidth: "100%",
            maxHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {svg ? (
            <div className="mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="h-32 w-64 skeleton" />
          )}
        </div>
      </div>
    </div>
  );
}
