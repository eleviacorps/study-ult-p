"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, RefreshCw, Loader2, Video, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type SimType =
  | "graph" | "projectile" | "wave" | "pendulum" | "electric-field"
  | "pythagorean" | "coulombs-law" | "electric-dipole" | "gauss-law"
  | "kinematics" | "shm" | "refraction" | "doppler"
  | "molecular-structure" | "periodic-trends" | "reaction-kinetics"
  | "unit-circle" | "limits" | "derivative" | "integration"
  | "vectors-3d" | "conic-sections";

interface SimulationProps {
  type: SimType;
  title?: string;
  initialParams?: Record<string, number | string>;
}

function getDefaultParams(type: string): Record<string, number | string> {
  const defaults: Record<string, Record<string, number | string>> = {
    graph: { a: 1, b: -2, c: 1, xMin: -5, xMax: 5 },
    projectile: { velocity: 40, angle: 45, gravity: 9.8 },
    wave: { amplitude: 1, frequency: 1, phase: 0 },
    pendulum: { length: 2, gravity: 9.8, damping: 0.1 },
    "electric-field": { charge: 1, separation: 3 },
    pythagorean: { side_a: 3, side_b: 4 },
    "coulombs-law": { q1: 5, q2: -3, distance: 4 },
    "electric-dipole": { separation: 2, e_strength: 2 },
    "gauss-law": { charge: 5, radius: 2.5, surface: "sphere" },
    kinematics: { v_initial: 10, acceleration: 2 },
    shm: { mass: 1, spring_k: 10, amplitude: 1.5 },
    refraction: { n1: 1, n2: 1.5, angle: 45 },
    doppler: { v_source: 0.8, frequency: 2 },
    "molecular-structure": { molecule: "H2O" },
    "periodic-trends": {},
    "reaction-kinetics": { ea: 50, delta_h: -30, catalyst: 0 },
    "unit-circle": {},
    limits: { point: 2 },
    derivative: { a: 1, b: -2, c: 1, x0: 1 },
    integration: { func_a: 2, n_start: 4, x_start: 0, x_end: 4 },
    "vectors-3d": { ax: 3, ay: 1, az: 2, bx: -1, by: 2, bz: 3 },
    "conic-sections": { conic: "circle" },
  };
  return defaults[type] || {};
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
    side_a: { min: 1, max: 8, step: 0.5 },
    side_b: { min: 1, max: 8, step: 0.5 },
    q1: { min: -10, max: 10, step: 0.5 },
    q2: { min: -10, max: 10, step: 0.5 },
    distance: { min: 1, max: 8, step: 0.5 },
    e_strength: { min: 0.5, max: 5, step: 0.5 },
    radius: { min: 1, max: 5, step: 0.5 },
    v_initial: { min: 2, max: 30, step: 1 },
    acceleration: { min: -5, max: 5, step: 0.5 },
    mass: { min: 0.5, max: 5, step: 0.5 },
    spring_k: { min: 5, max: 30, step: 1 },
    n1: { min: 0.5, max: 3, step: 0.1 },
    n2: { min: 0.5, max: 3, step: 0.1 },
    v_source: { min: 0.1, max: 2, step: 0.1 },
    ea: { min: 10, max: 150, step: 5 },
    delta_h: { min: -100, max: 100, step: 5 },
    catalyst: { min: 0, max: 40, step: 1 },
    point: { min: 0.5, max: 5, step: 0.5 },
    x0: { min: -3, max: 3, step: 0.5 },
    func_a: { min: 0.5, max: 5, step: 0.5 },
    n_start: { min: 2, max: 16, step: 2 },
    x_start: { min: -4, max: 4, step: 0.5 },
    x_end: { min: 0, max: 8, step: 0.5 },
    ax: { min: -5, max: 5, step: 0.5 },
    ay: { min: -5, max: 5, step: 0.5 },
    az: { min: -5, max: 5, step: 0.5 },
    bx: { min: -5, max: 5, step: 0.5 },
    by: { min: -5, max: 5, step: 0.5 },
    bz: { min: -5, max: 5, step: 0.5 },
  };
  return ranges[key] || { min: 0, max: 100, step: 1 };
}

const STRING_PARAMS: Record<string, string[]> = {
  "gauss-law": ["surface"],
  "molecular-structure": ["molecule"],
  "conic-sections": ["conic"],
};

export function Simulation({ type, title, initialParams }: SimulationProps) {
  const [params, setParams] = useState<Record<string, number | string>>(initialParams || getDefaultParams(type));
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
    if (video.paused) { video.play(); setPlaying(true); }
    else { video.pause(); setPlaying(false); }
  };

  const reset = () => {
    const video = videoRef.current;
    if (video) { video.currentTime = 0; video.pause(); setPlaying(false); }
  };

  const stringKeys = STRING_PARAMS[type] || [];

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
            <button onClick={renderSimulation} className="text-[10px] text-[#1856FF] hover:text-[#06B6D4]">Retry</button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Video className="w-10 h-10 text-white/10" />
            <p className="text-xs text-white/20">Manim-powered simulation</p>
          </div>
        )}

        {cached && videoPath && (
          <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">cached</div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button onClick={togglePlay} disabled={!videoPath || loading} className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors disabled:opacity-15">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button onClick={reset} disabled={!videoPath} className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors disabled:opacity-15">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={renderSimulation} disabled={loading} className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors disabled:opacity-15" title={cached ? "Re-render" : "Render"}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(params).map(([key, value]) => {
            if (stringKeys.includes(key)) {
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <label className="text-[9px] text-white/25 uppercase">{key}</label>
                  <select
                    value={String(value)}
                    onChange={(e) => { setParams((p) => ({ ...p, [key]: e.target.value })); setVideoPath(null); setCached(false); }}
                    className="text-[9px] bg-white/[0.04] border border-white/[0.08] text-white/80 px-1.5 py-0.5"
                  >
                    {key === "molecule" && (["H2O", "CH4", "CO2"]).map(o => <option key={o} value={o}>{o}</option>)}
                    {key === "surface" && (["sphere", "cylinder"]).map(o => <option key={o} value={o}>{o}</option>)}
                    {key === "conic" && (["circle", "ellipse", "parabola", "hyperbola"]).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              );
            }
            const range = getParamRange(key);
            return (
              <div key={key} className="flex items-center gap-1.5">
                <label className="text-[9px] text-white/25 uppercase">{key}</label>
                <input
                  type="range"
                  min={range.min}
                  max={range.max}
                  step={range.step}
                  value={Number(value)}
                  onChange={(e) => { setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) })); setVideoPath(null); setCached(false); }}
                  className="w-16 h-3 appearance-none bg-white/[0.06] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#1856FF]"
                />
                <span className="text-[9px] text-white/30 w-8 text-right">{Number(value).toFixed(Number(value) < 10 ? 1 : 0)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!videoPath && !loading && (
        <button onClick={renderSimulation} disabled={loading} className="w-full py-2 bg-[#1856FF]/10 border border-[#1856FF]/20 text-[#1856FF] text-xs font-medium hover:bg-[#1856FF]/20 disabled:opacity-20 transition-colors flex items-center justify-center gap-2">
          {loading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...</>) : (<><Video className="w-3.5 h-3.5" /> Render with Manim</>)}
        </button>
      )}
    </div>
  );
}
