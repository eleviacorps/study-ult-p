"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, RefreshCw, Loader2, Video, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface SimulationProps {
  type: "graph" | "projectile" | "wave" | "pendulum" | "electric-field";
  title?: string;
  initialParams?: Record<string, number>;
}

function getDefaultParams(type: string): Record<string, number> {
  switch (type) {
    case "graph": return { a: 1, b: -2, c: 1, xMin: -5, xMax: 5 };
    case "projectile": return { velocity: 40, angle: 45, gravity: 9.8 };
    case "wave": return { amplitude: 1, frequency: 1, phase: 0 };
    case "pendulum": return { length: 2, gravity: 9.8, damping: 0.1 };
    case "electric-field": return { charge: 1, separation: 3 };
    default: return {};
  }
}

function getParamRange(key: string): { min: number; max: number; step: number } {
  const ranges: Record<string, { min: number; max: number; step: number }> = {
    a: { min: -5, max: 5, step: 0.1 },
    b: { min: -10, max: 10, step: 0.5 },
    c: { min: -10, max: 10, step: 0.5 },
    xMin: { min: -20, max: 0, step: 1 },
    xMax: { min: 1, max: 20, step: 1 },
    velocity: { min: 5, max: 100, step: 1 },
    angle: { min: 5, max: 85, step: 1 },
    gravity: { min: 1, max: 20, step: 0.1 },
    amplitude: { min: 0.1, max: 5, step: 0.1 },
    frequency: { min: 0.1, max: 5, step: 0.1 },
    phase: { min: 0, max: 2, step: 0.05 },
    charge: { min: -10, max: 10, step: 0.5 },
    separation: { min: 0.5, max: 10, step: 0.1 },
    length: { min: 0.5, max: 5, step: 0.1 },
    damping: { min: 0, max: 1, step: 0.01 },
  };
  return ranges[key] || { min: 0, max: 100, step: 1 };
}

export function Simulation({ type, title, initialParams }: SimulationProps) {
  const [params, setParams] = useState(initialParams || getDefaultParams(type));
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const renderSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, params }),
      });
      const data = await res.json();
      if (data.status === "success" && data.videoPath) {
        setVideoPath(data.videoPath);
        setCached(data.cached ?? false);
      } else {
        setError(data.error || "Failed to render simulation");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to Manim renderer");
    }
    setLoading(false);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const reset = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="glass p-4 space-y-3">
      {title && <h3 className="text-xs font-semibold text-white/40">{title}</h3>}

      <div className="w-full border border-white/[0.04] relative" style={{ minHeight: 360, background: "var(--bg-base)", overflow: "hidden" }}>
        {videoPath ? (
          <video
            ref={videoRef}
            src={videoPath}
            className="w-full"
            style={{ maxHeight: 400 }}
            loop
            onEnded={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#1856FF] animate-spin" />
            <p className="text-xs text-white/30">Rendering with Manim...</p>
            <p className="text-[10px] text-white/15">This may take 10-30 seconds</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
            <p className="text-xs text-[#F59E0B] text-center max-w-sm">{error}</p>
            <button onClick={renderSimulation} className="text-[10px] text-[#1856FF] hover:text-[#06B6D4]">
              Retry
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Video className="w-10 h-10 text-white/10" />
            <p className="text-xs text-white/20">Manim-powered simulation</p>
          </div>
        )}

        {cached && videoPath && (
          <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
            cached
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePlay}
            disabled={!videoPath || loading}
            className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors disabled:opacity-15"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={reset}
            disabled={!videoPath}
            className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors disabled:opacity-15"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={renderSimulation}
            disabled={loading}
            className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors disabled:opacity-15"
            title={cached ? "Re-render with current params" : "Render with Manim"}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(params).map(([key, value]) => {
            const range = getParamRange(key);
            return (
              <div key={key} className="flex items-center gap-1.5">
                <label className="text-[9px] text-white/25 uppercase">{key}</label>
                <input
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={value}
                  onChange={(e) => {
                    setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) }));
                    setVideoPath(null);
                    setCached(false);
                  }}
                  className="w-16 h-3 appearance-none bg-white/[0.06] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#1856FF]"
                />
                <span className="text-[9px] text-white/30 w-8 text-right">
                  {typeof value === "number" ? value.toFixed(value < 10 ? 1 : 0) : value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!videoPath && !loading && (
        <button
          onClick={renderSimulation}
          disabled={loading}
          className="w-full py-2 bg-[#1856FF]/10 border border-[#1856FF]/20 text-[#1856FF] text-xs font-medium hover:bg-[#1856FF]/20 disabled:opacity-20 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...</>
          ) : (
            <><Video className="w-3.5 h-3.5" /> Render with Manim</>
          )}
        </button>
      )}
    </div>
  );
}
