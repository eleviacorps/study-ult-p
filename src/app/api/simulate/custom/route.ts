import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), "public", "simulations", "cache", "custom");

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
      else reject(new Error(stderr.substring(0, 800) || `Exit code ${code}`));
    });

    proc.on("error", (err) => reject(err));
  });
}

function sanitizeSceneCode(code: string): string {
  let cleaned = code
    .replace(/```python\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/^\s*print\(.*\)\s*$/gm, "")
    .trim();

  if (!cleaned.includes("from manim import") && !cleaned.includes("from manim.")) {
    cleaned = "from manim import *\n" + cleaned;
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
    const { prompt, llmConfig } = body;

    if (!prompt || typeof prompt !== "string" || prompt.length < 5) {
      return NextResponse.json({ status: "error", error: "Please describe what you want to visualize (at least 5 characters)." }, { status: 400 });
    }

    const cacheKey = Buffer.from(prompt.substring(0, 80)).toString("base64url");
    const cacheDir = path.join(CACHE_DIR, cacheKey);
    const cachedVideo = path.join(cacheDir, "custom.mp4");

    if (fs.existsSync(cachedVideo)) {
      return NextResponse.json({
        status: "success",
        videoPath: `/simulations/cache/custom/${cacheKey}/custom.mp4`,
        cached: true,
      });
    }

    fs.mkdirSync(cacheDir, { recursive: true });

    const sceneCode = sanitizeSceneCode(prompt);
    const className = extractClassName(sceneCode);

    if (!className) {
      return NextResponse.json({
        status: "error",
        error: "Could not find a Scene class in the generated code. Make sure your code defines a class that extends Scene.",
      }, { status: 400 });
    }

    const scenePath = path.join(cacheDir, "scene.py");
    fs.writeFileSync(scenePath, sceneCode, "utf-8");

    const manimArgs = ["-m", "manim", "-p", "--format", "mp4", "-ql", scenePath, className];

    try {
      await runPython(manimArgs, cacheDir);
    } catch (err: any) {
      const errorLog = path.join(cacheDir, "error.txt");
      fs.writeFileSync(errorLog, err.message, "utf-8");

      return NextResponse.json({
        status: "error",
        error: "Manim failed to render the scene. Check that your code is valid Manim Python.",
        details: err.message.substring(0, 500),
        code: sceneCode.substring(0, 1000),
      }, { status: 500 });
    }

    const videoFiles = fs.readdirSync(cacheDir).filter((f) => f.endsWith(".mp4"));
    if (videoFiles.length > 0) {
      const srcVideo = path.join(cacheDir, videoFiles[0]);
      const destVideo = path.join(cacheDir, "custom.mp4");
      if (srcVideo !== destVideo) {
        if (fs.existsSync(destVideo)) fs.unlinkSync(destVideo);
        fs.renameSync(srcVideo, destVideo);
      }

      const cleanups = fs.readdirSync(cacheDir).filter((f) => !f.endsWith(".mp4") && !f.endsWith(".py") && f !== "error.txt");
      for (const f of cleanups) {
        fs.rmSync(path.join(cacheDir, f), { recursive: true, force: true });
      }

      return NextResponse.json({
        status: "success",
        videoPath: `/simulations/cache/custom/${cacheKey}/custom.mp4`,
        cached: false,
      });
    }

    return NextResponse.json({
      status: "error",
      error: "Manim ran but produced no video. Check your scene code for errors.",
      code: sceneCode.substring(0, 500),
    }, { status: 500 });

  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      error: err.message || "Unknown error",
    }, { status: 500 });
  }
}
