"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart, Label } from "recharts";
import type { FunctionPlotDatum } from "function-plot";

const COLORS = ["#1856FF", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4"];
const GRID_COLOR = "rgba(255,255,255,0.04)";

interface SimulationProps {
  type: "graph" | "projectile" | "wave" | "pendulum" | "electric-field" | "vector-field";
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
    case "vector-field": return { strength: 1, decay: 1 };
    default: return {};
  }
}

export function Simulation({ type, title, initialParams }: SimulationProps) {
  const [running, setRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [params, setParams] = useState(initialParams || getDefaultParams(type));
  const animRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      setTime((t) => t + dt);
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [running]);

  const reset = () => {
    setTime(0);
    setRunning(false);
  };

  const needsCanvas = ["electric-field", "vector-field"].includes(type);

  useEffect(() => {
    if (!needsCanvas) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      drawField(canvas, type as "electric-field" | "vector-field", params);
    } catch {}
  }, [params, needsCanvas, type]);

  const dataPoints = useComputeData(type, params, time);

  return (
    <div className="glass p-4 space-y-3">
      {title && <h3 className="text-xs font-semibold text-white/40">{title}</h3>}

      {needsCanvas ? (
        <canvas
          ref={canvasRef}
          width={600}
          height={360}
          className="w-full border border-white/[0.04]"
          style={{ background: "var(--bg-base)" }}
        />
      ) : (
        <div className="w-full border border-white/[0.04]" style={{ height: 360, background: "var(--bg-base)" }}>
          <ResponsiveContainer width="100%" height="100%">
            {type === "graph" ? (
              <AreaChart data={dataPoints} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="graphFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1856FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#1856FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="x" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} />
                <Area type="monotone" dataKey="y" stroke="#1856FF" strokeWidth={2} fill="url(#graphFill)" dot={false} />
              </AreaChart>
            ) : type === "projectile" ? (
              <LineChart data={dataPoints} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="x" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} label={{ value: "Range (m)", position: "bottom", offset: -5, style: { fill: "rgba(255,255,255,0.2)", fontSize: 10 } }} />
                <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} label={{ value: "Height (m)", angle: -90, position: "left", offset: 5, style: { fill: "rgba(255,255,255,0.2)", fontSize: 10 } }} />
                <Line type="monotone" dataKey="y" stroke="#1856FF" strokeWidth={2} dot={false} />
                {getCurrentPosition(dataPoints, time, "projectile", params) && (
                  <Line
                    data={[getCurrentPosition(dataPoints, time, "projectile", params)!]}
                    dataKey="y"
                    stroke="none"
                    dot={{ r: 6, fill: "#EF4444", strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            ) : type === "wave" ? (
              <LineChart data={dataPoints} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="x" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} domain={[-5, 5]} />
                <Line type="monotone" dataKey="y" stroke="#06B6D4" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            ) : (
              <LineChart data={dataPoints} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis dataKey="x" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 9 }} tickLine={false} />
                <Line type="monotone" dataKey="y" stroke="#1856FF" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRunning(!running)}
            className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={reset}
            className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
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
                  onChange={(e) => setParams((p) => ({ ...p, [key]: parseFloat(e.target.value) }))}
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

      {type === "projectile" && params.velocity && params.angle && params.gravity && (
        <div className="flex gap-4 text-[9px] text-white/20">
          <span>Range: {(((params.velocity ** 2) * Math.sin(2 * (params.angle * Math.PI / 180))) / params.gravity).toFixed(1)}m</span>
          <span>Max Height: {(((params.velocity * Math.sin(params.angle * Math.PI / 180)) ** 2) / (2 * params.gravity)).toFixed(1)}m</span>
          <span>Time: {((2 * params.velocity * Math.sin(params.angle * Math.PI / 180)) / params.gravity).toFixed(2)}s</span>
        </div>
      )}
    </div>
  );
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
    strength: { min: 0.1, max: 5, step: 0.1 },
    decay: { min: 0.5, max: 5, step: 0.1 },
  };
  return ranges[key] || { min: 0, max: 100, step: 1 };
}

function useComputeData(type: string, params: Record<string, number>, time: number) {
  const [data, setData] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const points: { x: number; y: number }[] = [];
    const { a = 1, b = -2, c = 1, xMin = -5, xMax = 5, velocity = 40, angle = 45, gravity = 9.8, amplitude = 1, frequency = 1, phase = 0 } = params;

    switch (type) {
      case "graph": {
        const step = (xMax - xMin) / 200;
        for (let x = xMin; x <= xMax; x += step) {
          points.push({ x: Math.round(x * 100) / 100, y: a * x * x + b * x + c });
        }
        break;
      }
      case "projectile": {
        const rad = (angle * Math.PI) / 180;
        const vx = velocity * Math.cos(rad);
        const vy = velocity * Math.sin(rad);
        const totalTime = (2 * vy) / gravity;
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
          const t = (i / steps) * totalTime;
          points.push({
            x: Math.round(vx * t * 10) / 10,
            y: Math.round((vy * t - 0.5 * gravity * t * t) * 10) / 10,
          });
        }
        break;
      }
      case "wave": {
        for (let i = 0; i <= 200; i++) {
          const x = (i / 200) * 4 * Math.PI;
          const y = amplitude * Math.sin(x * frequency - time * 2 * Math.PI - phase * Math.PI);
          points.push({ x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 });
        }
        break;
      }
      case "pendulum": {
        const { length = 2, damping = 0.1 } = params;
        const { gravity: g = 9.8 } = params;
        const omega = Math.sqrt(g / length);
        for (let i = 0; i <= 200; i++) {
          const t = i * 0.1;
          const angle = (Math.PI / 4) * Math.exp(-damping * t) * Math.cos(omega * t);
          const amp = Math.exp(-damping * t);
          points.push({ x: Math.round(t * 10) / 10, y: Math.round(angle * 100) / 100 });
        }
        break;
      }
    }
    setData(points);
  }, [type, params, time]);

  return data;
}

function getCurrentPosition(
  data: { x: number; y: number }[],
  time: number,
  type: string,
  params: Record<string, number>
): { x: number; y: number } | null {
  if (type !== "projectile" || data.length === 0) return null;
  const { velocity = 40, angle = 45, gravity = 9.8 } = params;
  const rad = (angle * Math.PI) / 180;
  const vx = velocity * Math.cos(rad);
  const vy = velocity * Math.sin(rad);
  const totalTime = (2 * vy) / gravity;
  const ct = ((time * 0.5) % totalTime);
  const bx = vx * ct;
  const by = vy * ct - 0.5 * gravity * ct * ct;
  return { x: Math.round(bx * 10) / 10, y: Math.max(0, Math.round(by * 10) / 10) };
}

function drawField(canvas: HTMLCanvasElement, type: "electric-field" | "vector-field", params: Record<string, number>) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(15, 17, 23, 1)";
  ctx.fillRect(0, 0, w, h);

  if (type === "electric-field") {
    drawElectricField(ctx, w, h, params);
  } else {
    drawVectorField(ctx, w, h, params);
  }
}

function drawElectricField(ctx: CanvasRenderingContext2D, w: number, h: number, params: Record<string, number>) {
  const { charge = 1, separation = 3 } = params;
  const cx = w / 2;
  const cy = h / 2;
  const s = separation * 35;

  ctx.fillStyle = charge > 0 ? "#EF4444" : "#1856FF";
  ctx.beginPath();
  ctx.arc(cx - s, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(charge > 0 ? "+" : "-", cx - s, cy);

  ctx.fillStyle = "#EF4444";
  ctx.beginPath();
  ctx.arc(cx + s, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.fillText("+", cx + s, cy);

  const gridSpacing = 28;
  ctx.strokeStyle = "rgba(139, 92, 246, 0.3)";
  ctx.lineWidth = 0.8;
  for (let gx = 40; gx < w - 20; gx += gridSpacing) {
    for (let gy = 40; gy < h - 20; gy += gridSpacing) {
      let ex = 0;
      let ey = 0;

      const dx1 = gx - (cx - s);
      const dy1 = gy - cy;
      const d1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) + 0.1;
      const mag1 = charge * 300 / (d1 * d1);
      ex += mag1 * (dx1 / d1);
      ey += mag1 * (dy1 / d1);

      const dx2 = gx - (cx + s);
      const dy2 = gy - cy;
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) + 0.1;
      const mag2 = 300 / (d2 * d2);
      ex += mag2 * (dx2 / d2);
      ey += mag2 * (dy2 / d2);

      const mag = Math.sqrt(ex * ex + ey * ey);
      const len = Math.min(10, mag * 0.8);
      const nx = mag > 0 ? (ex / mag) * len : 0;
      const ny = mag > 0 ? (ey / mag) * len : 0;

      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + nx, gy + ny);
      ctx.stroke();

      if (mag > 0.1 && len > 2) {
        const arrowSize = 3;
        const angle = Math.atan2(ny, nx);
        ctx.beginPath();
        ctx.moveTo(gx + nx, gy + ny);
        ctx.lineTo(gx + nx - arrowSize * Math.cos(angle - 0.6), gy + ny - arrowSize * Math.sin(angle - 0.6));
        ctx.moveTo(gx + nx, gy + ny);
        ctx.lineTo(gx + nx - arrowSize * Math.cos(angle + 0.6), gy + ny - arrowSize * Math.sin(angle + 0.6));
        ctx.stroke();
      }
    }
  }

  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText(`Charge ratio: ${charge}:${1}  Separation: ${separation}`, 20, h - 12);
}

function drawVectorField(ctx: CanvasRenderingContext2D, w: number, h: number, params: Record<string, number>) {
  const { strength = 1, decay = 1 } = params;
  const margin = 20;
  const spacing = 22;

  ctx.strokeStyle = "rgba(139, 92, 246, 0.35)";
  ctx.lineWidth = 0.8;

  for (let x = margin; x < w - margin; x += spacing) {
    for (let y = margin; y < h - margin; y += spacing) {
      const dx = (x - w / 2) / 12;
      const dy = (y - h / 2) / 12;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;

      const vx = strength * (-dy / Math.pow(dist, decay));
      const vy = strength * (dx / Math.pow(dist, decay));

      const mag = Math.sqrt(vx * vx + vy * vy);
      const nx = mag > 0 ? (vx / mag) * 10 : 0;
      const ny = mag > 0 ? (vy / mag) * 10 : 0;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + nx, y + ny);
      ctx.stroke();

      if (mag > 0.05) {
        const as = 3;
        const ang = Math.atan2(ny, nx);
        ctx.beginPath();
        ctx.moveTo(x + nx, y + ny);
        ctx.lineTo(x + nx - as * Math.cos(ang - 0.6), y + ny - as * Math.sin(ang - 0.6));
        ctx.moveTo(x + nx, y + ny);
        ctx.lineTo(x + nx - as * Math.cos(ang + 0.6), y + ny - as * Math.sin(ang + 0.6));
        ctx.stroke();
      }
    }
  }

  ctx.font = "10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillText(`Strength: ${strength}  Decay: ${decay}`, 20, h - 12);
}
