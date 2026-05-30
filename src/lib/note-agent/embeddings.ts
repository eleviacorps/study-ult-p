// ──────────────────────────────────────────
// Embeddings — NVIDIA provider + TF-IDF fallback
// ──────────────────────────────────────────

export type EmbeddingMode = "provider" | "tfidf";

let _mode: EmbeddingMode | "probing" = "probing";
let _modeResolve: ((mode: EmbeddingMode) => void) | null = null;
const _modeReady = new Promise<EmbeddingMode>((resolve) => {
  _modeResolve = resolve;
});

export function getEmbeddingMode(): EmbeddingMode | "probing" {
  return _mode;
}

export function waitForMode(): Promise<EmbeddingMode> {
  return _modeReady;
}

export async function probeEmbeddingProvider(): Promise<EmbeddingMode> {
  if (_mode !== "probing") return _mode;

  try {
    const res = await fetch("/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "probe", input_type: "query" }),
    });
    if (res.ok) {
      _mode = "provider";
      _modeResolve?.("provider");
      return "provider";
    }
  } catch {}
  _mode = "tfidf";
  _modeResolve?.("tfidf");
  return "tfidf";
}

// ── Provider embeddings ──

export async function embedTexts(
  texts: string[],
  inputType: "query" | "passage" = "passage"
): Promise<Float32Array[] | null> {
  const mode = _mode === "probing" ? await waitForMode() : _mode;
  if (mode !== "provider") return null;

  const batchSize = 10;
  const results: Float32Array[] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {
      const res = await fetch("/api/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: batch, input_type: inputType }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.data) return null;
      const sorted = (data.data as { embedding: number[]; index: number }[])
        .sort((a, b) => a.index - b.index);
      for (const d of sorted) {
        results.push(new Float32Array(d.embedding));
      }
    } catch {
      return null;
    }
  }

  return results;
}

// ── Cosine similarity (dense vectors) ──

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ── TF-IDF fallback ──

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","as","is","was","are","were","be","been","being","have","has","had",
  "do","does","did","will","would","can","could","shall","should","may","might",
  "this","that","these","those","it","its","not","no","nor","so","if",
  "about","into","over","after","before","between","under","above","below",
  "up","down","out","off","just","because","than","then","else","also","very",
  "too","much","many","some","any","each","every","both","few","more","most",
  "other","such","only","own","same","here","there","when","where","why","how",
  "which","who","whom","what","whose","all","am","dont","doesnt","isnt","wasnt",
  "arent","werent","hasnt","havent","hadnt","wont","wouldnt","cant","couldnt",
  "shouldnt","mightnt","mustnt","let","get","got","go","goes","going","went",
  "come","came","coming","make","made","making","take","took","taking","know",
  "known","knew","think","thinks","thought","see","seen","saw","use","used",
  "using","like","likes","liked","look","looks","looked","want","wants","wanted",
  "give","gave","given","find","found","tell","told","ask","asked","asks",
  "seem","seems","seemed","need","needs","needed","one","two","three","first",
  "second","last","next","new","old","good","bad","high","low","large","small",
  "long","short","full","empty","true","false","always","never","often","ever",
  "still","yet","already","now","then","even","though","although","while",
  "during","without","within","across","through","along","around","among",
  "between","beyond","except","including","toward","towards","via","per",
  "until","upon","versus","vs",
]);

export type SparseVector = Map<string, number>;

export interface IDFIndex {
  [term: string]: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

export function computeTF(text: string): SparseVector {
  const tokens = tokenize(text);
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [t, c] of tf) tf.set(t, 1 + Math.log10(c));
  return tf;
}

export function computeIDF(documents: string[][]): IDFIndex {
  const N = documents.length;
  const df = new Map<string, number>();
  for (const terms of documents) {
    const seen = new Set(terms);
    for (const t of seen) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf: IDFIndex = {};
  for (const [t, c] of df) idf[t] = Math.log10(N / c);
  return idf;
}

export function computeTFIDF(tf: SparseVector, idf: IDFIndex): SparseVector {
  const vec: SparseVector = new Map();
  for (const [term, tfVal] of tf) {
    const idfVal = idf[term] || 0;
    if (idfVal > 0) vec.set(term, tfVal * idfVal);
  }
  return vec;
}

export function cosineSimilaritySparse(a: SparseVector, b: SparseVector): number {
  let dot = 0, magA = 0, magB = 0;
  for (const v of a.values()) magA += v * v;
  for (const v of b.values()) magB += v * v;
  if (magA === 0 || magB === 0) return 0;
  const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];
  for (const [term, val] of smaller) {
    const other = larger.get(term);
    if (other) dot += val * other;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function extractTokens(text: string): string[] {
  return tokenize(text);
}

// ── Shared utilities ──

export async function computeContentHash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}
