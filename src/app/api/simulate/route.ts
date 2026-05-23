import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

interface ManimRequest {
  type: "graph" | "projectile" | "wave" | "pendulum" | "electric-field";
  params: Record<string, number>;
  quality?: "low" | "medium" | "high";
}

interface RenderResult {
  status: "success" | "script_written" | "error";
  videoPath?: string;
  error?: string;
  sceneClass?: string;
}

const SCENES_DIR = path.join(process.cwd(), "manim-scenes");
const RENDER_DIR = path.join(process.cwd(), "public", "simulations");
const CACHE_DIR = path.join(process.cwd(), "public", "simulations", "cache");

function getCacheKey(type: string, params: Record<string, number>): string {
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}_${v}`)
    .join("__");
  return `${type}__${paramStr}`;
}

function runPython(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const proc = spawn(pythonCmd, args, { cwd, env: { ...process.env, PYTHONUNBUFFERED: "1" } });
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(new Error(`Python exited with code ${code}: ${stderr.substring(0, 500)}`));
    });

    proc.on("error", (err) => reject(err));
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ManimRequest = await request.json();
    const { type, params = {}, quality = "medium" } = body;

    if (!type) {
      return NextResponse.json({ status: "error", error: "Missing simulation type" }, { status: 400 });
    }

    const cacheKey = getCacheKey(type, params);
    const cacheDir = path.join(CACHE_DIR, cacheKey);
    const cachedVideo = path.join(cacheDir, `${type}.mp4`);

    if (fs.existsSync(cachedVideo)) {
      return NextResponse.json({
        status: "success",
        videoPath: `/simulations/cache/${cacheKey}/${type}.mp4`,
        cached: true,
      });
    }

    fs.mkdirSync(RENDER_DIR, { recursive: true });
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.mkdirSync(cacheDir, { recursive: true });

    const renderScript = path.join(SCENES_DIR, "render.py");
    if (!fs.existsSync(renderScript)) {
      return NextResponse.json({ status: "error", error: "Manim render script not found" }, { status: 500 });
    }

    const scriptArgs: string[] = [
      renderScript,
      "--type", type,
      "--output", cacheDir,
      "--quality", quality,
    ];

    for (const [key, value] of Object.entries(params)) {
      scriptArgs.push(`--${key}`, String(value));
    }

    const { stdout } = await runPython(scriptArgs, SCENES_DIR);

    let sceneInfo: RenderResult;
    try {
      sceneInfo = JSON.parse(stdout);
    } catch {
      sceneInfo = JSON.parse(stdout.split("\n").filter((l) => l.startsWith("{")).pop() || stdout);
    }

    if (!sceneInfo?.sceneClass) {
      return NextResponse.json({ status: "error", error: "Failed to generate scene script" }, { status: 500 });
    }

    const manimArgs = ["-m", "manim", "-p", "--format", "mp4", "-ql", path.join(cacheDir, "scene.py"), sceneInfo.sceneClass];
    if (quality === "medium") manimArgs[5] = "-qm";
    else if (quality === "high") manimArgs[5] = "-qh";

    let renderError = "";
    try {
      await runPython(manimArgs, cacheDir);
    } catch (err: any) {
      renderError = err.message;
    }

    const videoFiles = fs.readdirSync(cacheDir).filter((f) => f.endsWith(".mp4"));
    if (videoFiles.length > 0) {
      const srcVideo = path.join(cacheDir, videoFiles[0]);
      const destVideo = path.join(cacheDir, `${type}.mp4`);
      if (srcVideo !== destVideo) {
        if (fs.existsSync(destVideo)) fs.unlinkSync(destVideo);
        fs.renameSync(srcVideo, destVideo);
      }

      const cleanups = fs.readdirSync(cacheDir).filter((f) => !f.endsWith(".mp4") && !f.endsWith(".py"));
      for (const f of cleanups) {
        fs.rmSync(path.join(cacheDir, f), { recursive: true, force: true });
      }

      return NextResponse.json({
        status: "success",
        videoPath: `/simulations/cache/${cacheKey}/${type}.mp4`,
        cached: false,
        warnings: renderError ? [renderError] : undefined,
      });
    }

    return NextResponse.json({
      status: "error",
      error: "Manim rendering failed. " + (renderError || "No output video found. Make sure Manim is installed: pip install manim"),
    }, { status: 500 });

  } catch (err: any) {
    console.error("Manim render error:", err);
    return NextResponse.json({
      status: "error",
      error: err.message || "Failed to render simulation",
    }, { status: 500 });
  }
}
