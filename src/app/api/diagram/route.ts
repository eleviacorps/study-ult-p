import { NextResponse } from "next/server";
import { deflateRawSync } from "node:zlib";
import { isMermaidSource, sanitizeSvg, MERMAID_STARTERS } from "@/lib/mermaid-security";
import { logRequest } from "@/lib/server-log";

const KROKI_BASE = "https://kroki.io";

function encodeDeflateBase64(source: string): string {
  const compressed = deflateRawSync(Buffer.from(source, "utf-8"), { level: 9 });
  return compressed.toString("base64url");
}

export async function POST(request: Request) {
  const log = logRequest("POST /api/diagram", null);
  try {
    const body = await request.json().catch(() => ({}));
    const source = typeof body.source === "string" ? body.source.trim() : "";

    if (!source) {
      await log.warn(400, "empty_mermaid_source");
      return NextResponse.json({ error: "empty_mermaid_source", detail: "No diagram source provided." }, { status: 400 });
    }

    if (!isMermaidSource(source)) {
      await log.warn(400, "invalid_mermaid_source");
      // Detect whether the source starts with a known diagram keyword but isn't formatted correctly
      const firstLine = source.split(/\r?\n/).find((l: string) => l.trim())?.trim() || "";
      // Check if content exists inside ```mermaid fences
      const fenceMatch = source.match(/```mermaid\s*\n([\s\S]*?)\n```/);
      if (fenceMatch) {
        return NextResponse.json({
          error: "invalid_mermaid_source",
          detail: "Remove the ```mermaid wrapper — send only the raw diagram source.",
          _hint: "strip_fence",
        }, { status: 400 });
      }
      // If first line is empty or not a recognized keyword, give helpful message
      if (firstLine && !MERMAID_STARTERS.some((s: string) => firstLine.startsWith(s))) {
        return NextResponse.json({
          error: "unsupported_diagram_type",
          detail: `"${firstLine}" is not a supported Mermaid diagram type. Try: graph, sequenceDiagram, classDiagram, mindmap, gitGraph, or pie.`,
        }, { status: 400 });
      }
      return NextResponse.json({
        error: "invalid_mermaid_source",
        detail: "The diagram source could not be recognized as valid Mermaid syntax.",
      }, { status: 400 });
    }

    const encoded = encodeDeflateBase64(source);
    const url = `${KROKI_BASE}/mermaid/svg/${encoded}`;

    let res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
      res = await fetch(`${KROKI_BASE}/mermaid/svg`, {
        method: "POST",
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        body: source,
        signal: AbortSignal.timeout(15000),
      });
    }

    const svg = await res.text();
    if (!res.ok) {
      // Extract meaningful error from Kroki response — often an HTML page with "Syntax error in:"
      const krokiError = svg
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);
      const detail = process.env.NODE_ENV === "development"
        ? krokiError
        : "Diagram rendering failed. Please check your syntax.";
      return NextResponse.json({ error: "kroki_render_failed", detail }, { status: 422 });
    }

    await log.success(200, "diagram rendered via kroki");
    return new Response(sanitizeSvg(svg), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    await log.error("diagram_render_failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}
