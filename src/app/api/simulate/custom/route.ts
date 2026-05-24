import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "public", "simulations", "cache", "custom");

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
      else reject(new Error(`Python exit ${code}: ${stderr.substring(0, 600)}`));
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
    if (entry.isDirectory() && entry.name !== "media") {
      results.push(...findMp4Files(fullPath));
    } else if (entry.name.endsWith(".mp4")) {
      results.push(fullPath);
    }
  }
  return results;
}

function sanitizeSceneCode(code: string): string {
  let cleaned = code
    .replace(/```python\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  if (!cleaned.includes("from manim import") && !cleaned.includes("from manim.")) {
    cleaned = "from manim import *\n\n" + cleaned;
  }

  return cleaned;
}

function extractClassName(code: string): string {
  const match = code.match(/class\s+(\w+)\s*\(\s*Scene\s*\)/);
  return match ? match[1] : "CustomScene";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || prompt.length < 10) {
      return NextResponse.json({ status: "error", error: "Please provide valid Manim Python code (at least 10 characters)." }, { status: 400 });
    }

    const cacheKey = Buffer.from(prompt.substring(0, 100)).toString("base64url").replace(/[^a-zA-Z0-9]/g, "_");
    const cacheDir = path.join(CACHE_DIR, cacheKey);
    const cachedMp4 = path.join(cacheDir, "custom.mp4");

    if (fs.existsSync(cachedMp4)) {
      return NextResponse.json({
        status: "success",
        videoPath: `/simulations/cache/custom/${cacheKey}/custom.mp4`,
        cached: true,
      });
    }

    if (fs.existsSync(cacheDir)) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
    }
    fs.mkdirSync(cacheDir, { recursive: true });

    const sceneCode = sanitizeSceneCode(prompt);
    const className = extractClassName(sceneCode);

    const scenePath = path.join(cacheDir, "scene.py");
    fs.writeFileSync(scenePath, sceneCode, "utf-8");

    const manimArgs = ["-m", "manim", "render", "-ql", "--format=mp4", scenePath, className];

    try {
      await runPython(manimArgs, cacheDir, 120000);
    } catch (err: any) {
      return NextResponse.json({
        status: "error",
        error: "Manim render failed: " + (err.message || "Unknown error"),
        code: sceneCode.substring(0, 800),
      }, { status: 500 });
    }

    const mp4Files = findMp4Files(cacheDir);
    if (mp4Files.length === 0) {
      return NextResponse.json({
        status: "error",
        error: "Manim ran but produced no video. Check your scene code.",
        code: sceneCode.substring(0, 500),
      }, { status: 500 });
    }

    const largest = mp4Files.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    if (largest !== cachedMp4) {
      fs.copyFileSync(largest, cachedMp4);
    }

    const mediaDir = path.join(cacheDir, "media");
    if (fs.existsSync(mediaDir)) {
      fs.rmSync(mediaDir, { recursive: true, force: true });
    }

    return NextResponse.json({
      status: "success",
      videoPath: `/simulations/cache/custom/${cacheKey}/custom.mp4`,
      cached: false,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      error: err.message || "Unknown error",
    }, { status: 500 });
  }
}
