import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

interface ManimRequest {
  type: "graph" | "projectile" | "wave" | "pendulum" | "electric-field";
  params: Record<string, number>;
  quality?: "low" | "medium" | "high";
}

const SCENES_DIR = path.join(process.cwd(), "manim-scenes");
const PUBLIC_RENDER_DIR = path.join(process.cwd(), "public", "simulations");
const CACHE_ROOT = path.join(PUBLIC_RENDER_DIR, "cache");

function getCacheKey(type: string, params: Record<string, number>): string {
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}_${v}`)
    .join("__");
  return `${type}__${paramStr}`;
}

function runPython(args: string[], cwd: string, timeoutMs: number = 180000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const proc = spawn(pythonCmd, args, {
      cwd,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Render timed out after " + (timeoutMs / 1000) + "s"));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      else reject(new Error(`Python exit ${code}: ${stderr.substring(0, 500)}`));
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function findMp4Files(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMp4Files(fullPath));
    } else if (entry.name.endsWith(".mp4")) {
      results.push(fullPath);
    }
  }
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body: ManimRequest = await request.json();
    const { type, params = {}, quality = "medium" } = body;

    if (!type) {
      return NextResponse.json({ status: "error", error: "Missing simulation type" }, { status: 400 });
    }

    const cacheKey = getCacheKey(type, params);
    const cacheDir = path.join(CACHE_ROOT, cacheKey);
    const cachedMp4 = path.join(cacheDir, "output.mp4");

    if (fs.existsSync(cachedMp4)) {
      return NextResponse.json({
        status: "success",
        videoPath: `/simulations/cache/${cacheKey}/output.mp4`,
        cached: true,
      });
    }

    // Clean old cache dir if it exists (from a failed run)
    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.mkdirSync(PUBLIC_RENDER_DIR, { recursive: true });

    // Step 1: Generate the Manim scene script via render.py
    const renderScript = path.join(SCENES_DIR, "render.py");
    if (!fs.existsSync(renderScript)) {
      return NextResponse.json({ status: "error", error: "Manim render.py not found at " + renderScript }, { status: 500 });
    }

    const scriptArgs: string[] = [renderScript, "--type", type, "--output", cacheDir, "--quality", quality];
    for (const [key, value] of Object.entries(params)) {
      scriptArgs.push(`--${key}`, String(value));
    }

    let sceneInfo: { status: string; scene_class?: string; error?: string };
    try {
      const { stdout } = await runPython(scriptArgs, SCENES_DIR, 15000);
      sceneInfo = JSON.parse(stdout);
    } catch (err: any) {
      return NextResponse.json({
        status: "error",
        error: "Failed to generate scene: " + (err.message || "Unknown error"),
      }, { status: 500 });
    }

    if (sceneInfo.status !== "script_written" || !sceneInfo.scene_class) {
      return NextResponse.json({
        status: "error",
        error: sceneInfo.error || "Failed to generate scene script",
      }, { status: 500 });
    }

    // Step 2: Render with Manim
    const qualityFlag = quality === "low" ? "-ql" : quality === "high" ? "-qh" : "-qm";
    const scenePath = path.join(cacheDir, "scene.py");

    const manimArgs = ["-m", "manim", "render", qualityFlag, "--format=mp4", scenePath, sceneInfo.scene_class];

    try {
      const { stderr } = await runPython(manimArgs, cacheDir, 180000);
      // Manim logs progress to stderr, that's normal
    } catch (err: any) {
      return NextResponse.json({
        status: "error",
        error: "Manim render failed: " + (err.message || "Unknown error"),
        diagnostics: cacheDir,
      }, { status: 500 });
    }

    // Step 3: Find the rendered MP4 (Manim outputs to media/ directory)
    const mp4Files = findMp4Files(cacheDir);

    if (mp4Files.length === 0) {
      return NextResponse.json({
        status: "error",
        error: "Manim completed but produced no MP4 files",
        diagnostics: "Check that FFmpeg is installed and working.",
      }, { status: 500 });
    }

    // Copy the largest MP4 as output.mp4 (Manim sometimes generates partial files)
    const largest = mp4Files.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    if (largest !== cachedMp4) {
      fs.copyFileSync(largest, cachedMp4);
    }

    // Clean up Manim's media directory
    const mediaDir = path.join(cacheDir, "media");
    if (fs.existsSync(mediaDir)) {
      fs.rmSync(mediaDir, { recursive: true, force: true });
    }

    return NextResponse.json({
      status: "success",
      videoPath: `/simulations/cache/${cacheKey}/output.mp4`,
      cached: false,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      error: err.message || "Unknown error",
    }, { status: 500 });
  }
}
