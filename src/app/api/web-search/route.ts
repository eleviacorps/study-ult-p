import { NextResponse } from "next/server";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

async function fetchDdgLite(query: string): Promise<SearchResult[]> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": USER_AGENT },
  });
  const html = await res.text();

  const results: SearchResult[] = [];

  // lite.duckduckgo.com returns <table class="result"> with:
  //   <tr class="result_header">  <td><a href="...">Title</a></td>  </tr>
  //   <tr class="result_snippet"><td>Snippet...</td></tr>
  //   <tr class="result_url">    <td>URL</td>                        </tr>
  const tables = html.match(/<table[^>]*class="result"[^>]*>[\s\S]*?<\/table>/gi) || [];

  for (const table of tables.slice(0, 10)) {
    const headerRow = table.match(/<tr[^>]*class="result_header"[^>]*>[\s\S]*?<\/tr>/i);
    const snippetRow = table.match(/<tr[^>]*class="result_snippet"[^>]*>[\s\S]*?<\/tr>/i);
    if (!headerRow) continue;

    const linkMatch = headerRow[0].match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const title = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, "").trim() : "";
    const link = linkMatch ? linkMatch[1] : "";
    const snippet = snippetRow ? snippetRow[0].replace(/<[^>]+>/g, "").trim() : "";

    if (title) {
      results.push({ title, link, snippet });
    }
  }

  return results;
}

async function fetchDdgHtml(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": USER_AGENT },
  });
  const html = await res.text();

  // Try 4 extraction strategies on html.duckduckgo.com
  const extractors: ((h: string) => SearchResult[])[] = [
    // Strategy 1: result__a + result__snippet pairs
    (h) => {
      const titles = [...h.matchAll(/<a[^>]*class="result__a"[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      const snippets = [...h.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];
      return titles.slice(0, 8).map((m, i) => ({
        title: m[2].replace(/<[^>]+>/g, "").trim(),
        link: m[1],
        snippet: snippets[i] ? snippets[i][1].replace(/<[^>]+>/g, "").trim() : "",
      }));
    },
    // Strategy 2: <div class="result"> blocks
    (h) => {
      const divs = [...h.matchAll(/<div[^>]*class="[^"]*\bresult\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi)];
      return divs.slice(0, 8).map((block) => {
        const a = block[1].match(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const s = block[1].match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
        return {
          title: a ? a[2].replace(/<[^>]+>/g, "").trim() : "",
          link: a ? a[1] : "",
          snippet: s ? s[1].replace(/<[^>]+>/g, "").trim() : "",
        };
      }).filter((r) => r.title);
    },
    // Strategy 3: <h2 class="result__title"> links
    (h) => {
      const h2s = [...h.matchAll(/<h2[^>]*class="result__title"[^>]*>[\s\S]*?<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/gi)];
      const snippets = [...h.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];
      return h2s.slice(0, 8).map((m, i) => ({
        title: m[2].replace(/<[^>]+>/g, "").trim(),
        link: m[1],
        snippet: snippets[i] ? snippets[i][1].replace(/<[^>]+>/g, "").trim() : "",
      }));
    },
    // Strategy 4: raw snippet extraction as last resort
    (h) => {
      const rawSnippets = [...h.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)]
        .slice(0, 5)
        .map((s) => s[1].replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      return rawSnippets.map((snippet) => ({ title: "", link: "", snippet }));
    },
  ];

  for (const extract of extractors) {
    const extracted = extract(html);
    if (extracted.length > 0) return extracted;
  }

  return [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const query = (body.query as string) || "";
    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // Try lite endpoint first (stable HTML), fall back to html endpoint
    let results = await fetchDdgLite(query);
    if (results.length === 0) {
      results = await fetchDdgHtml(query);
    }

    return NextResponse.json({ query, results, source: results.length > 0 ? "duckduckgo" : "empty" });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err), query: "", results: [] }, { status: 500 });
  }
}