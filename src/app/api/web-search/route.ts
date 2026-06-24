import { NextResponse } from "next/server";
import { logRequest } from "@/lib/server-log";

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
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
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

// ─── Garbage detection ─────────────────────────────────────────────────
const GARBAGE_PATTERNS = [
  /please\s+email\s+us/i, /blocked/i, /captcha/i, /rate.limit/i,
  /too\s+many\s+requests/i, /access\s+denied/i, /sorry/i,
  /this\s+page\s+is\s+not\s+available/i, /something\s+went\s+wrong/i,
  /if\s+this\s+persists/i,
];

function isGarbage(s: string): boolean {
  return GARBAGE_PATTERNS.some((p) => p.test(s));
}
async function fetchDdg(url: string, signal?: AbortSignal): Promise<{ html: string; status: number }> {
  const timeoutSignal = AbortSignal.timeout(10_000);
  const combinedSignal = signal && typeof AbortSignal.any === "function"
    ? AbortSignal.any([timeoutSignal, signal])
    : signal || timeoutSignal;
  const res = await fetch(url, {
    signal: combinedSignal,
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
  });
  return { html: await res.text(), status: res.status };
}

export async function POST(request: Request) {
  const log = logRequest("POST /api/web-search", null);
  try {
    const body = await request.json().catch(() => ({}));
    const query = (body.query as string) || "";
    if (!query) {
      await log.warn(400, "missing_query");
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }
    log.setMeta("query", query.slice(0, 80));

    const encoded = encodeURIComponent(query);
    let results: SearchResult[] = [];
    let backend = "";

    // Master timeout for the entire search chain (25s)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      // Backend 1: DuckDuckGo lite (simplest HTML)
      if (results.length === 0) {
        try {
          const { html } = await fetchDdg(`https://lite.duckduckgo.com/lite/?q=${encoded}`, controller.signal);
          results = parseLiteTable(html);
          if (results.length > 0) backend = "ddg-lite";
        } catch (err) {
          console.warn(`[web-search] Backend 1 (ddg-lite) failed:`, err instanceof Error ? err.message : err);
        }
      }

      // Backend 2: DuckDuckGo html (richer results)
      if (results.length === 0) {
        try {
          const { html } = await fetchDdg(`https://html.duckduckgo.com/html/?q=${encoded}`, controller.signal);
          results = parseDdgHtml(html);
          if (results.length > 0) backend = "ddg-html";
        } catch (err) {
          console.warn(`[web-search] Backend 2 (ddg-html) failed:`, err instanceof Error ? err.message : err);
        }
      }

      // Backend 3: Wikipedia (free API, covers all academic topics)
      if (results.length === 0) {
        try {
          results = await searchWikipedia(query);
          if (results.length > 0) backend = "wikipedia";
        } catch (err) {
          console.warn(`[web-search] Backend 3 (wikipedia) failed:`, err instanceof Error ? err.message : err);
        }
      }

      // Backend 4: Raw text extraction (last resort — skip if garbage)
      if (results.length === 0) {
        try {
          const { html } = await fetchDdg(`https://html.duckduckgo.com/html/?q=${encoded}`, controller.signal);
          const text = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, "\n")
            .split(/\n{3,}/)
            .map((b) => b.replace(/\s+/g, " ").trim())
            .filter((b) => b.length > 60 && b.length < 600 && /[A-Z]/.test(b) && /[a-z]/.test(b) && !/^\s*[{<]/.test(b) && !b.includes("duckduckgo.com") && !isGarbage(b));
          for (const block of text.slice(0, 5)) {
            const title = block.slice(0, 80);
            results.push({ title, link: "", snippet: block });
          }
          if (results.length > 0) backend = "raw";
        } catch (err) {
          console.warn(`[web-search] Backend 4 (raw) failed:`, err instanceof Error ? err.message : err);
        }
      }
    } finally {
      clearTimeout(timeout);
    }

    // Filter any garbage that snuck through
    results = results.filter((r) => !isGarbage(r.title) && !isGarbage(r.snippet));

    await log.success(200, `${results.length} results via ${backend}`);
    return NextResponse.json({
      query,
      results,
      backend,
      source: backend,
      count: results.length,
    });
  } catch (err) {
    await log.error("web_search_failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), query: "", results: [] }, { status: 500 });
  }
}