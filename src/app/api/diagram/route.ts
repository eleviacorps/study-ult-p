import { NextResponse } from "next/server";
import { deflateSync } from "node:zlib";
import { isMermaidSource, sanitizeSvg } from "@/lib/mermaid-security";
import { logRequest } from "@/lib/server-log";

const KROKI_BASE = "https://kroki.io";

function encodeDeflateBase64(source: string): string {
  const compressed = deflateSync(Buffer.from(source, "utf-8"), { level: 9 });
  return compressed.toString("base64url");
}

export async function POST(request: Request) {
  const log = logRequest("POST /api/diagram", null);
  try {
    const body = await request.json().catch(() => ({}));
    const source = typeof body.source === "string" ? body.source.trim() : "";

    if (!isMermaidSource(source)) {
      await log.warn(400, "invalid_mermaid_source");
      return NextResponse.json({ error: "invalid_mermaid_source" }, { status: 400 });
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
      return NextResponse.json({ error: "kroki_render_failed", detail: svg.slice(0, 500) }, { status: res.status });
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
