import { NextResponse } from "next/server";
import { deflateRawSync } from "zlib";
import { isMermaidSource, sanitizeSvg } from "@/lib/mermaid-security";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!isMermaidSource(code)) {
    return NextResponse.json({ error: "invalid_mermaid_source" }, { status: 400 });
  }

  try {
    const compressed = deflateRawSync(code);
    const base64 = compressed.toString("base64");
    const urlSafe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    const url = `https://kroki.io/mermaid/svg/${urlSafe}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!res.ok) {
      return NextResponse.json({ error: "kroki_error", status: res.status }, { status: 502 });
    }

    const svg = sanitizeSvg(await res.text());
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "kroki_failed", detail: String(e) }, { status: 502 });
  }
}
