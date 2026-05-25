"use client";

import { useState, useRef, useEffect } from "react";
import { useLlm } from "@/lib/llm-context";
import { Play, Pause, RotateCcw, Loader2, Video, Sparkles, Code, AlertCircle } from "lucide-react";

const MANIM_SYSTEM_PROMPT = `You are a Manim Community Edition expert. Generate ONLY valid Python code using the Manim library. No explanations, no markdown — just raw Python code.

Rules:
- Use "from manim import *"
- Define exactly ONE class that extends Scene
- Use MathTex() for equations with raw strings: MathTex(r"...")
- Use axes.plot() for functions
- Use Dot, Circle, Arrow, VGroup, ParametricFunction as needed
- Keep animation under 10 seconds
- No print() statements

Examples of valid output:

Class FunctionPlot(Scene):
    def construct(self):
        axes = Axes(x_range=[-3, 3, 1], y_range=[-5, 10, 2], axis_config={"include_tip": False})
        graph = axes.plot(lambda x: x**2, color=BLUE)
        self.play(Create(axes), Create(graph))
        self.wait(1)

When asked, generate the scene code directly.`;

export function CustomSimulation() {
  const { ask, config } = useLlm();
  const [mounted, setMounted] = useState(false);
  const [description, setDescription] = useState("");
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleGenerate = async () => {
    if (!description.trim() || loading) return;
    setLoading(true);
    setError(null);
    setCodePreview(null);
    setVideoPath(null);

    try {
      if (!config.enabled) {
        const res = await fetch("/api/simulate/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: description }),
        });
        const data = await res.json();
        if (data.status === "success") {
          setVideoPath(data.videoPath);
          setCached(data.cached ?? false);
        } else {
          setError(data.error || "Failed to render simulation");
          if (data.code) setCodePreview(data.code);
          if (data.details) setError((prev) => prev + "\n" + data.details);
        }
        setLoading(false);
        return;
      }

      const { content } = await ask(
        MANIM_SYSTEM_PROMPT,
        `Create a Manim Community Edition scene for: ${description}`
      );

      const sceneCode = content
        .replace(/```python\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/```/g, "")
        .trim();

      setCodePreview(sceneCode);

      const res = await fetch("/api/simulate/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sceneCode }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setVideoPath(data.videoPath);
        setCached(data.cached ?? false);
      } else {
        setError(data.error || "Failed to render simulation");
        if (data.details) setError((prev) => prev + "\n\n" + data.details);
      }
    } catch (err: any) {
      setError(err.message || "Connection failed");
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

  return (
    <div className="glass p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
        <h3 className="text-xs font-semibold text-white/40">Custom AI Simulation</h3>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder="Describe what to visualize (e.g. 'two sine waves intersecting' or 'a planet orbiting a star')"
          className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.06] text-xs outline-none focus:border-[#8B5CF6]/30"
          style={{ color: "var(--text-primary)" }}
        />
        <button
          onClick={handleGenerate}
          disabled={!description.trim() || loading}
          className="px-4 py-2 bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 text-[#8B5CF6] text-xs hover:bg-[#8B5CF6]/25 disabled:opacity-20 whitespace-nowrap flex items-center gap-1.5"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> Generate</>
          )}
        </button>
      </div>

      <div className="w-full border border-white/[0.04] relative" style={{ minHeight: 300, background: "var(--bg-base)", overflow: "hidden" }}>
        {videoPath ? (
          <video
            ref={videoRef}
            src={videoPath}
            className="w-full"
            style={{ maxHeight: 340 }}
            loop
            onEnded={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#8B5CF6] animate-spin" />
            <p className="text-xs text-white/30">{config.enabled ? "AI writing & rendering..." : "Rendering with Manim..."}</p>
            <p className="text-[10px] text-white/15">This may take 15-30 seconds</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 overflow-y-auto">
            <AlertCircle className="w-6 h-6 text-[#F59E0B] flex-shrink-0" />
            <p className="text-[10px] text-[#F59E0B]/80 text-center max-w-md whitespace-pre-wrap">{error}</p>
            {codePreview && (
              <details className="w-full max-w-md mt-2">
                <summary className="text-[10px] text-white/20 cursor-pointer flex items-center gap-1">
                  <Code className="w-3 h-3" /> Generated code
                </summary>
                <pre className="mt-2 p-2 bg-white/[0.03] border border-white/[0.06] text-[9px] text-white/30 overflow-x-auto max-h-40 whitespace-pre-wrap">
                  {codePreview}
                </pre>
              </details>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Video className="w-10 h-10 text-white/10" />
            <p className="text-xs text-white/20">Describe a simulation above</p>
            <p className="text-[10px] text-white/10">{mounted && config.enabled ? "AI will write the Manim code" : "Paste Manim Python code directly"}</p>
          </div>
        )}
      </div>

      {videoPath && (
        <div className="flex items-center gap-1.5">
          <button
            onClick={togglePlay}
            className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => { videoRef.current && (videoRef.current.currentTime = 0); }}
            className="p-1.5 bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {cached && (
            <span className="text-[9px] px-1.5 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
              cached
            </span>
          )}
        </div>
      )}
    </div>
  );
}
