import { NextResponse } from "next/server";

const KROKI_MERMAID_SVG = "https://kroki.io/mermaid/svg";
const MAX_DIAGRAM_BYTES = 12000;
const MERMAID_STARTERS = [
  "mindmap",
  "graph ",
  "flowchart ",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "timeline",
  "gitGraph",
];

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const source = typeof body.source === "string" ? body.source.trim() : "";

    if (!isMermaidSource(source)) {
      return NextResponse.json({ error: "invalid_mermaid_source" }, { status: 400 });
    }

    const res = await fetch(KROKI_MERMAID_SVG, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Accept: "image/svg+xml",
      },
      body: source,
    });

    const svg = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: "kroki_render_failed", detail: svg.slice(0, 500) }, { status: res.status });
    }

    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "unknown_error" }, { status: 500 });
  }
}

function isMermaidSource(source: string): boolean {
  if (!source || new TextEncoder().encode(source).length > MAX_DIAGRAM_BYTES) return false;
  const firstLine = source.split(/\r?\n/).find((line) => line.trim())?.trim() || "";
  return MERMAID_STARTERS.some((starter) => firstLine.startsWith(starter));
}
