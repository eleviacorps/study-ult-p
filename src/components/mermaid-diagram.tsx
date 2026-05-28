"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Maximize2, Minus } from "lucide-react";

type MermaidDiagramProps = {
  source: string;
};

export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const cleanedSource = useMemo(() => source.trim(), [source]);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

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

    return () => { cancelled = true; };
  }, [cleanedSource]);

  const openExpanded = () => {
    setExpanded(true);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const closeExpanded = () => {
    setExpanded(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const zoomIn = () => setZoom(z => Math.min(5, +(z * 1.4).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z / 1.4).toFixed(2)));

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }, []);

  const startDrag = useCallback((clientX: number, clientY: number) => {
    setDragging(true);
    dragRef.current = { x: clientX, y: clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragging) return;
    const dx = clientX - dragRef.current.x;
    const dy = clientY - dragRef.current.y;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }, [dragging]);

  const stopDrag = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const handleMouseUp = () => stopDrag();
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, moveDrag, stopDrag]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => stopDrag();

  return (
    <>
      <div className="my-3 overflow-hidden rounded-xl border border-white/[0.06] bg-[#05060A]/50">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/25">map</span>
          <button
            onClick={openExpanded}
            className="p-1 rounded-md text-white/20 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            title="Open fullscreen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
        <div
          onClick={openExpanded}
          className="min-h-24 overflow-x-auto bg-white/[0.01] p-2.5 cursor-pointer transition-colors hover:bg-white/[0.02] active:bg-white/[0.03]"
        >
          {svg ? (
            <div className="mermaid-svg min-w-fit [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : error ? (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-white/30">{cleanedSource}</pre>
          ) : (
            <div className="h-24 skeleton" />
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center"
          onClick={closeExpanded}
        >
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              className="p-1.5 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all text-[10px]"
              title="Reset zoom"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); zoomOut(); }}
              className="p-1.5 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-white/25 font-mono w-8 text-center select-none">{Math.round(zoom * 100)}%</span>
            <button
              onClick={(e) => { e.stopPropagation(); zoomIn(); }}
              className="p-1.5 rounded-lg bg-white/[0.04] text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-all"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); closeExpanded(); }}
              className="p-1.5 rounded-lg bg-white/[0.04] text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all ml-2"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div
            className="select-none"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              cursor: dragging ? "grabbing" : zoom > 1 ? "grab" : "default",
              width: "90vw",
              height: "90vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              touchAction: "none",
            }}
          >
            <div
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: dragging ? "none" : "transform 0.15s ease",
                transformOrigin: "center center",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              {svg ? (
                <div
                  className="mermaid-svg [&_svg]:block [&_svg]:max-w-[90vw] [&_svg]:max-h-[85vh] [&_svg]:w-auto [&_svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : (
                <div className="h-32 w-64 skeleton" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
