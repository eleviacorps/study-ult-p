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

    // Strategy 1: result__a / result__snippet link pairs (modern DDG)
    const titleMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const snippetMatches = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];

    for (let i = 0; i < Math.min(titleMatches.length, 8); i++) {
      results.push({
        title: titleMatches[i][2].replace(/<[^>]+>/g, "").trim(),
        link: titleMatches[i][1],
        snippet: snippetMatches[i] ? snippetMatches[i][1].replace(/<[^>]+>/g, "").trim() : "",
      });
    }

    // Strategy 2: <div class="result"> blocks (older DDG)
    if (results.length === 0) {
      const resultDivs = [...html.matchAll(/<div[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)];
      for (const block of resultDivs.slice(0, 8)) {
        const title = block[1].match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippet = block[1].match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
        if (title || snippet) {
          results.push({
            title: title ? title[2].replace(/<[^>]+>/g, "").trim() : "",
            link: title ? title[1] : "",
            snippet: snippet ? snippet[1].replace(/<[^>]+>/g, "").trim() : "",
          });
        }
      }
    }

    // Strategy 3: <h2 class="result__title"> links (alternative DDG)
    if (results.length === 0) {
      const h2Links = [...html.matchAll(/<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/gi)];
      const snippetTexts = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (let i = 0; i < Math.min(h2Links.length, 8); i++) {
        results.push({
          title: h2Links[i][2].replace(/<[^>]+>/g, "").trim(),
          link: h2Links[i][1],
          snippet: snippetTexts[i] ? snippetTexts[i][1].replace(/<[^>]+>/g, "").trim() : "",
        });
      }
    }

    // Strategy 4: raw snippet extraction as last resort
    if (results.length === 0) {
      const rawSnippets = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)]
        .slice(0, 5)
        .map((s) => s[1].replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      for (const s of rawSnippets) {
        results.push({ title: "", link: "", snippet: s });
      }
    }

    return NextResponse.json({ query, results, source: "duckduckgo-html" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), query: "" }, { status: 500 });
  }
}
