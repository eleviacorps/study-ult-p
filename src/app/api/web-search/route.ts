import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = (body.query as string) || "";
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // Try DuckDuckGo HTML search (works server-side, no CORS)
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const html = await res.text();

    // Parse result snippets from DuckDuckGo HTML response
    const results: { title: string; link: string; snippet: string }[] = [];
    const resultBlocks = html.match(/<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi) || [];

    for (const block of resultBlocks.slice(0, 8)) {
      const titleMatch = block.match(/<a[^>]*rel="nofollow"[^>]*>([\s\S]*?)<\/a>/i);
      const linkMatch = block.match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/i);
      const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
      if (titleMatch || snippetMatch) {
        results.push({
          title: titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "",
          link: linkMatch ? linkMatch[1] : "",
          snippet: snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "",
        });
      }
    }

    // Fallback: extract from raw HTML if structured parsing yielded nothing
    if (results.length === 0) {
      const snippets = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)]
        .slice(0, 5)
        .map((s) => s[1].replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      return NextResponse.json({ query, results: snippets.map((s) => ({ title: "", link: "", snippet: s })), source: "duckduckgo-html-fallback" });
    }

    return NextResponse.json({ query, results, source: "duckduckgo-html" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), query: "" }, { status: 500 });
  }
}
