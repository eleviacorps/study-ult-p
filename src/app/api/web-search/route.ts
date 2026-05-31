import { NextResponse } from "next/server";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

// ─── DuckDuckGo lite (table-based) ────────────────────────────────────
function parseLiteTable(html: string): SearchResult[] {
  const results: SearchResult[] = [];
  const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];
  for (const table of tables) {
    const rows = [...table.matchAll(/<tr[^>]*>[\s\S]*?<\/tr>/gi)];
    let title = "", link = "", snippet = "";
    for (const row of rows) {
      const text = row[0].replace(/<[^>]+>/g, "").trim();
      const href = row[0].match(/href="(https?:\/\/[^"]+)"/i);
      if (href && text.length > 10 && !text.includes("Previous")) {
        if (href[1].includes("duckduckgo.com")) continue;
        title = text;
        link = href[1];
      } else if (text.length > 30 && title && !snippet) {
        snippet = text;
      }
    }
    if (title && link) results.push({ title, link, snippet: snippet.slice(0, 400) });
  }
  return results;
}

// ─── DuckDuckGo html (link-based) ─────────────────────────────────────
function parseDdgHtml(html: string): SearchResult[] {
  const anchors = [...html.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*rel="nofollow"[^>]*>([\s\S]*?)<\/a>/gi)];
  const results: SearchResult[] = [];

  for (const a of anchors) {
    const href = a[1];
    const rawTitle = a[2].replace(/<[^>]+>/g, "").trim();
    if (!rawTitle || rawTitle.length < 10) continue;
    if (/duckduckgo\.com/.test(href)) continue;

    const after = html.slice((a.index || 0) + a[0].length, (a.index || 0) + a[0].length + 2000);
    const snippetMatch = after.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a/i);
    const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    results.push({ title: rawTitle, link: href, snippet });
  }

  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

// ─── Wikipedia OpenSearch API (free, no key needed) ───────────────────
async function searchWikipedia(query: string): Promise<SearchResult[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=8&namespace=0&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = await res.json();
  // data[0] = query, data[1] = titles[], data[2] = snippets[], data[3] = links[]
  if (!Array.isArray(data) || data.length < 4) return [];
  const results: SearchResult[] = [];
  for (let i = 0; i < data[1].length; i++) {
    results.push({
      title: data[1][i],
      link: data[3][i] || "",
      snippet: data[2][i] || "",
    });
  }
  return results;
}

// ─── DuckDuckGo fetch ──────────────────────────────────────────────────
async function fetchDdg(url: string): Promise<{ html: string; status: number }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
  });
  return { html: await res.text(), status: res.status };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = (body.query as string) || "";
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const encoded = encodeURIComponent(query);
    let results: SearchResult[] = [];
    let backend = "";

    // Backend 1: DuckDuckGo lite
    if (results.length === 0) {
      try {
        const { html } = await fetchDdg(`https://lite.duckduckgo.com/lite/?q=${encoded}`);
        results = parseLiteTable(html);
        if (results.length > 0) backend = "ddg-lite";
      } catch {}
    }

    // Backend 2: DuckDuckGo html
    if (results.length === 0) {
      try {
        const { html } = await fetchDdg(`https://html.duckduckgo.com/html/?q=${encoded}`);
        results = parseDdgHtml(html);
        if (results.length > 0) backend = "ddg-html";
      } catch {}
    }

    // Backend 3: Wikipedia
    if (results.length === 0) {
      try {
        results = await searchWikipedia(query);
        if (results.length > 0) backend = "wikipedia";
      } catch {}
    }

    // Backend 4: Raw text extraction (last resort)
    if (results.length === 0) {
      try {
        const { html } = await fetchDdg(`https://html.duckduckgo.com/html/?q=${encoded}`);
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, "\n")
          .split(/\n{3,}/)
          .map((b) => b.replace(/\s+/g, " ").trim())
          .filter((b) => b.length > 60 && b.length < 600 && /[A-Z]/.test(b) && /[a-z]/.test(b) && !/^\s*[{<]/.test(b) && !b.includes("duckduckgo.com"));
        for (const block of text.slice(0, 5)) {
          const title = block.slice(0, 80);
          results.push({ title, link: "", snippet: block });
        }
        if (results.length > 0) backend = "raw";
      } catch {}
    }

    return NextResponse.json({
      query,
      results,
      backend,
      source: backend,
      count: results.length,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), query: "", results: [] }, { status: 500 });
  }
}