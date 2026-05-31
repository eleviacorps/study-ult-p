import { chunkDocument, type Chunk } from "./chunker";
import {
  getEmbeddingMode, waitForMode,
  embedTexts, cosineSimilarity,
  computeTF, computeIDF, computeTFIDF, cosineSimilaritySparse,
  computeContentHash, extractTokens,
  type EmbeddingMode, type SparseVector, type IDFIndex,
} from "./embeddings";

// ── Types ──

interface ChunkEntry {
  chunkId: string;
  path: string;
  chapter: string;
  type: string;
  section: string;
  chunkIndex: number;
  chunkTotal: number;
  content: string;
  contentHash: string;
  embedding: Float32Array | null;
  vector: [string, number][] | null;
  tokens: string[];
}

interface DocRecord {
  path: string;
  chapter: string;
  type: string;
  section?: string;
  content: string;
  contentHash: string;
  chunkIds: string[];
  createdAt: number;
  updatedAt: number;
}

interface IndexRecord {
  id: string;
  embeddingMode: EmbeddingMode;
  totalChunks: number;
  totalDocs: number;
  idf: IDFIndex | null;
}

// ── Pending index queue ──

interface QueuedDoc {
  path: string;
  content: string;
  chapter: string;
  type: string;
  section: string;
  embedImmediately: boolean;
}

let _indexQueue: QueuedDoc[] = [];
let _processingQueue = false;

// ── Pending section embeds (in-memory, tracked per agent run) ──
let _pendingPathsBySection = new Map<string, Set<string>>(); // section → Set<path>

// ── Retrieval cache ──

interface CacheEntry {
  results: { path: string; excerpt: string; score: number }[];
  timestamp: number;
  _writeVersion: number;
}
let _retrievalCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10_000; // 10 seconds
let _writeVersion = 0; // incremented on each document write, busts cache

// ── Telemetry counters ──

let _docsIndexed = 0;
let _chunksIndexed = 0;
let _chunksStoredNoEmbed = 0;
let _embeddingCalls = 0;
let _sectionEmbedCalls = 0;
let _sectionEmbeddedChunks = 0;
let _sectionEmbedSkipped = 0;
let _searchCalls = 0;
let _cacheHits = 0;
let _cacheMisses = 0;
let _indexTimeMs = 0;
let _embedTimeMs = 0;
let _searchTimeMs = 0;
let _skippedSameHash = 0;

export function getIndexTelemetry() {
  const out = {
    docsIndexed: _docsIndexed,
    chunksIndexed: _chunksIndexed,
    chunksStoredNoEmbed: _chunksStoredNoEmbed,
    embeddingCalls: _embeddingCalls,
    sectionEmbedCalls: _sectionEmbedCalls,
    sectionEmbeddedChunks: _sectionEmbeddedChunks,
    sectionEmbedSkipped: _sectionEmbedSkipped,
    searchCalls: _searchCalls,
    cacheHits: _cacheHits,
    cacheMisses: _cacheMisses,
    indexTimeMs: _indexTimeMs,
    embedTimeMs: _embedTimeMs,
    searchTimeMs: _searchTimeMs,
    skippedSameHash: _skippedSameHash,
    pendingQueue: _indexQueue.length,
  };
  return out;
}

export function resetIndexTelemetry() {
  _docsIndexed = 0;
  _chunksIndexed = 0;
  _chunksStoredNoEmbed = 0;
  _embeddingCalls = 0;
  _sectionEmbedCalls = 0;
  _sectionEmbeddedChunks = 0;
  _sectionEmbedSkipped = 0;
  _searchCalls = 0;
  _cacheHits = 0;
  _cacheMisses = 0;
  _indexTimeMs = 0;
  _embedTimeMs = 0;
  _searchTimeMs = 0;
  _skippedSameHash = 0;
}

// ── Constants ──

const DB_NAME = "studyult-rag";
const DB_VERSION = 3;
const STORE_CHUNKS = "chunks";
const STORE_DOCS = "docs";
const STORE_INDEX = "index";

const MAX_CHUNK_TOKENS = 512;
const OVERLAP_TOKENS = 50;

// ── IndexedDB helpers ──

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        const s = db.createObjectStore(STORE_CHUNKS, { keyPath: "chunkId" });
        s.createIndex("chapter", "chapter", { unique: false });
        s.createIndex("type", "type", { unique: false });
        s.createIndex("section", "section", { unique: false });
        s.createIndex("contentHash", "contentHash", { unique: false });
      }
      // Add section index on upgrade for existing stores (v2→v3 migration)
      if (db.objectStoreNames.contains(STORE_CHUNKS)) {
        const s = req.transaction!.objectStore(STORE_CHUNKS);
        if (!s.indexNames.contains("section")) {
          s.createIndex("section", "section", { unique: false });
        }
      }
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const s = db.createObjectStore(STORE_DOCS, { keyPath: "path" });
        s.createIndex("chapter", "chapter", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_INDEX)) {
        db.createObjectStore(STORE_INDEX, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function storeGet<T>(store: IDBObjectStore, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putAll(store: IDBObjectStore, values: unknown[]): void {
  for (const v of values) store.put(v);
}

function deleteAll(store: IDBObjectStore, keys: string[]): void {
  for (const k of keys) store.delete(k);
}

function storeGetAll<T>(store: IDBObjectStore, query?: IDBValidKey): Promise<T[]> {
  return new Promise((resolve) => {
    const req = query !== undefined ? store.getAll(query) : store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

/** Get all entries from an index (e.g., chapter index). Bounded. */
function indexGetAll<T>(index: IDBIndex, query?: IDBValidKey): Promise<T[]> {
  return new Promise((resolve) => {
    const req = query !== undefined ? index.getAll(query) : index.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

function txComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error("transaction aborted"));
  });
}

// ── Initialization ──

let _initialized = false;

export async function initRagStore(): Promise<EmbeddingMode> {
  if (_initialized) return getEmbeddingMode() as EmbeddingMode;
  _initialized = true;
  const db = await openDB();
  const tx = db.transaction(STORE_INDEX, "readonly");
  const store = tx.objectStore(STORE_INDEX);
  const idx = await storeGet<IndexRecord>(store, "global");
  db.close();

  const mode = await waitForMode();

  if (idx && idx.embeddingMode !== mode) {
    await saveIndexRecord({ id: "global", embeddingMode: mode, totalChunks: 0, totalDocs: 0, idf: null });
  } else if (!idx) {
    await saveIndexRecord({ id: "global", embeddingMode: mode, totalChunks: 0, totalDocs: 0, idf: null });
  }

  return mode;
}

async function loadIndexRecord(): Promise<IndexRecord | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_INDEX, "readonly");
  const store = tx.objectStore(STORE_INDEX);
  const rec = await storeGet<IndexRecord>(store, "global");
  db.close();
  return rec || null;
}

async function saveIndexRecord(rec: IndexRecord): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_INDEX, "readwrite");
  tx.objectStore(STORE_INDEX).put(rec);
  await txComplete(tx);
  db.close();
}

// ── Background queue: queueDocument + processDocumentQueue ──

export function queueDocument(path: string, content: string, chapter: string, type: string, section?: string, embedImmediately = false): void {
  if (!content.trim()) return;
  const sec = section || inferSectionFromPath(path, type);
  _indexQueue.push({ path, content, chapter, type, section: sec, embedImmediately });
}

function inferSectionFromPath(path: string, type: string): string {
  if (path.includes("/notes/")) return "notes";
  if (path.includes("/questions/")) return "questions";
  if (path.includes("/revision/")) return "revision";
  if (path.includes("/flashcards/")) return "other";
  if (path.includes("/quizzes/")) return "other";
  if (type === "notes" || type === "questions") return type;
  return "other";
}

export function pendingIndexCount(): number {
  return _indexQueue.length;
}

export async function processDocumentQueue(): Promise<{
  indexed: number;
  skipped: number;
  timeMs: number;
}> {
  if (_processingQueue) return { indexed: 0, skipped: 0, timeMs: 0 };
  if (_indexQueue.length === 0) return { indexed: 0, skipped: 0, timeMs: 0 };

  _processingQueue = true;
  const start = performance.now();
  let indexed = 0;
  let skipped = 0;

  const batch = _indexQueue.splice(0, Math.min(_indexQueue.length, 20));

  for (const doc of batch) {
    const ok = await addDocument(doc.path, doc.content, doc.chapter, doc.type, doc.section, doc.embedImmediately);
    if (ok === "skipped") skipped++;
    else if (ok === "indexed" || ok === "stored") indexed++;
  }

  const timeMs = Math.round(performance.now() - start);
  _indexTimeMs += timeMs;
  _processingQueue = false;

  return { indexed, skipped, timeMs };
}

// ── CRUD ──

/** Returns "indexed", "stored" (no embed), "skipped" (same hash), or "failed" */
async function addDocument(
  path: string,
  content: string,
  chapter: string,
  type: string,
  section?: string,
  embedImmediately = true
): Promise<"indexed" | "stored" | "skipped" | "failed"> {
  if (!content.trim()) return "failed";

  const resolvedMode = (() => {
    const m = getEmbeddingMode();
    if (m === "probing") { /* already awaited by caller */ }
    return m as EmbeddingMode;
  })();

  const db = await openDB();
  try {
    const contentHash = await computeContentHash(content);

    // ── Check existing doc (separate read-only transaction) ──
    const existing = await (() => {
      const tx = db.transaction(STORE_DOCS, "readonly");
      return storeGet<DocRecord>(tx.objectStore(STORE_DOCS), path);
    })();

    if (existing && existing.contentHash === contentHash) {
      db.close();
      _skippedSameHash++;
      return "skipped";
    }

    // ── If content changed, delete old chunks (separate write transaction) ──
    if (existing) {
      const tx = db.transaction([STORE_CHUNKS, STORE_DOCS], "readwrite");
      deleteAll(tx.objectStore(STORE_CHUNKS), existing.chunkIds);
      tx.objectStore(STORE_DOCS).delete(path);
      await txComplete(tx);
    }

    // ── Chunk the document (no DB work here — safe) ──
    const chunks = chunkDocument(content, MAX_CHUNK_TOKENS, OVERLAP_TOKENS);
    if (chunks.length === 0) { db.close(); return "failed"; }

    // ── Compute TF vectors locally; embed only if embedImmediately ──
    const chunkTexts = chunks.map((c) => c.content);
    const tfVectors = chunkTexts.map((t) => computeTF(t));
    let embeddings: Float32Array[] | null = null;

    if (embedImmediately && resolvedMode === "provider") {
      _embeddingCalls++;
      embeddings = await embedTexts(chunkTexts, "passage");
    }

    const sec = section || inferSectionFromPath(path, type);

    // ── Build chunk entries ──
    const chunkEntries: ChunkEntry[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      chunkEntries.push({
        chunkId: `${path}#${chunk.index}`,
        path,
        chapter,
        type,
        section: sec,
        chunkIndex: chunk.index,
        chunkTotal: chunk.total,
        content: chunk.content,
        contentHash: await computeContentHash(chunk.content),
        embedding: embeddings?.[i] || null,
        vector: Array.from(tfVectors[i].entries()),
        tokens: extractTokens(chunk.content),
      });
    }

    // ── Single write transaction ──
    const now = Date.now();
    const idxRec = await loadIndexRecord();
    const tx = db.transaction([STORE_CHUNKS, STORE_DOCS, STORE_INDEX], "readwrite");
    putAll(tx.objectStore(STORE_CHUNKS), chunkEntries);
    tx.objectStore(STORE_DOCS).put({
      path, chapter, type, section: sec, content, contentHash,
      chunkIds: chunkEntries.map((c) => c.chunkId),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    tx.objectStore(STORE_INDEX).put({
      id: "global",
      embeddingMode: resolvedMode,
      totalChunks: (idxRec?.totalChunks || 0) + chunks.length,
      totalDocs: (idxRec?.totalDocs || 0) + (existing ? 0 : 1),
      idf: idxRec?.idf || null,
    });
    await txComplete(tx);
    db.close();

    _writeVersion++; // bust retrieval cache

    if (embedImmediately) {
      _docsIndexed++;
      _chunksIndexed += chunks.length;
      console.log(`[RAG] indexed ${path} → ${chunks.length} chunks (${resolvedMode})`);
      if (resolvedMode === "tfidf" || !embeddings) {
        rebuildIDF().catch(() => {});
      }
      return "indexed";
    }

    // Not embedding now — track for later batch embedding
    _chunksStoredNoEmbed += chunks.length;
    if (!_pendingPathsBySection.has(sec)) _pendingPathsBySection.set(sec, new Set());
    _pendingPathsBySection.get(sec)!.add(path);
    console.log(`[RAG] stored ${path} → ${chunks.length} chunks (no embed yet, section: ${sec})`);
    return "stored";
  } catch (err) {
    db.close();
    console.error("[RAG] addDocument error:", err);
    return "failed";
  }
}

export async function getDocument(path: string): Promise<string | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DOCS, "readonly");
    const doc = await storeGet<DocRecord>(tx.objectStore(STORE_DOCS), path);
    db.close();
    return doc?.content || null;
  } catch {
    return null;
  }
}

// ── Search ──

function normalizeQuery(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}

function cacheKey(query: string, chapter: string, typeFilter?: string): string {
  return `${normalizeQuery(query)}|${chapter}|${typeFilter || "*"}`;
}

function getCached(key: string): { path: string; excerpt: string; score: number }[] | null {
  const entry = _retrievalCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    _retrievalCache.delete(key);
    return null;
  }
  // Also bust on index writes
  if (entry._writeVersion !== _writeVersion) {
    _retrievalCache.delete(key);
    return null;
  }
  _cacheHits++;
  return entry.results;
}

function setCache(key: string, results: { path: string; excerpt: string; score: number }[]) {
  _retrievalCache.set(key, { results, timestamp: Date.now(), _writeVersion });
  // Evict oldest if cache grows too large
  if (_retrievalCache.size > 50) {
    const oldest = _retrievalCache.entries().next().value;
    if (oldest) _retrievalCache.delete(oldest[0]);
  }
}

export async function searchDocuments(
  query: string,
  chapter: string,
  limit = 5,
  typeFilter?: string
): Promise<{ path: string; excerpt: string; score: number }[]> {
  const searchStart = performance.now();
  _searchCalls++;

  try {
    if (!query.trim()) return [];

    // ── Check cache ──
    const cKey = cacheKey(query, chapter, typeFilter);
    const cached = getCached(cKey);
    if (cached) {
      _searchTimeMs += Math.round(performance.now() - searchStart);
      return cached;
    }
    _cacheMisses++;

    const mode = getEmbeddingMode();
    if (mode === "probing") await waitForMode();
    const resolvedMode = getEmbeddingMode() as EmbeddingMode;

    // ── Load ONLY chunks for this chapter via the chapter index ──
    const db = await openDB();
    const tx = db.transaction(STORE_CHUNKS, "readonly");
    const chapterIndex = tx.objectStore(STORE_CHUNKS).index("chapter");
    const all = await indexGetAll<ChunkEntry>(chapterIndex, chapter);
    db.close();

    if (all.length === 0) return [];

    let filtered = all;
    if (typeFilter) filtered = filtered.filter((c) => c.type === typeFilter);
    if (filtered.length === 0) return [];

    // ── Candidate reduction: token overlap prefilter before expensive scoring ──
    const queryTokens = new Set(extractTokens(normalizeQuery(query)));
    if (queryTokens.size > 0) {
      const before = filtered.length;
      filtered = filtered.filter((c) => {
        for (const t of c.tokens) {
          if (queryTokens.has(t)) return true;
        }
        return false;
      });
      console.log(`[RAG] candidate reduction: ${before} → ${filtered.length} chunks (${queryTokens.size} query tokens)`);
    }

    // ── Embed query ──
    let queryVec: Float32Array | null = null;
    let querySparse: SparseVector | null = null;

    if (resolvedMode === "provider") {
      _embeddingCalls++;
      const emb = await embedTexts([query], "query");
      if (emb && emb.length > 0) {
        queryVec = emb[0];
      }
    }

    if (!queryVec) {
      const idfData = await loadIDF();
      if (idfData.totalChunks === 0) return [];
      const tf = computeTF(query);
      querySparse = computeTFIDF(tf, idfData.idf);
      if (querySparse.size === 0) return [];
    }

    // ── Score and rank ──
    const scored = filtered.map((chunk) => {
      let score = 0;
      if (queryVec && chunk.embedding) {
        score = cosineSimilarity(queryVec, chunk.embedding);
      } else if (querySparse && chunk.vector) {
        const chunkVec = new Map(chunk.vector);
        score = cosineSimilaritySparse(querySparse, chunkVec);
      }
      return {
        path: chunk.path,
        excerpt: chunk.content.substring(0, 300),
        score,
        chunkIndex: chunk.chunkIndex,
      };
    });

    // ── Dedup by path ──
    const best = new Map<string, (typeof scored)[0]>();
    for (const s of scored) {
      if (s.score <= 0) continue;
      const existing = best.get(s.path);
      if (!existing || s.score > existing.score) best.set(s.path, s);
    }

    const results = Array.from(best.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ path, excerpt, score }) => ({ path, excerpt, score }));

    // ── Cache results ──
    setCache(cKey, results);

    _searchTimeMs += Math.round(performance.now() - searchStart);
    return results;
  } catch (err) {
    console.error("[RAG] searchDocuments error:", err);
    return [];
  }
}

// ── Legacy search alias ──

export async function searchDocumentsByContent(
  query: string,
  chapter: string,
  limit = 5,
  typeFilter?: string
): Promise<{ path: string; excerpt: string; score: number }[]> {
  return searchDocuments(query, chapter, limit, typeFilter);
}

// ── Delete ──

export async function deleteDocument(path: string): Promise<void> {
  try {
    const db = await openDB();
    const doc = await (() => {
      const tx = db.transaction(STORE_DOCS, "readonly");
      return storeGet<DocRecord>(tx.objectStore(STORE_DOCS), path);
    })();

    if (!doc) { db.close(); return; }

    const idxRec = await loadIndexRecord();
    const tx = db.transaction([STORE_CHUNKS, STORE_DOCS, STORE_INDEX], "readwrite");
    deleteAll(tx.objectStore(STORE_CHUNKS), doc.chunkIds);
    tx.objectStore(STORE_DOCS).delete(path);
    tx.objectStore(STORE_INDEX).put({
      id: "global",
      embeddingMode: idxRec?.embeddingMode || "tfidf",
      totalChunks: Math.max(0, (idxRec?.totalChunks || 0) - doc.chunkIds.length),
      totalDocs: Math.max(0, (idxRec?.totalDocs || 0) - 1),
      idf: idxRec?.idf || null,
    });
    await txComplete(tx);
    db.close();

    _writeVersion++;
    rebuildIDF().catch(() => {});
  } catch (err) {
    console.error("[RAG] deleteDocument error:", err);
  }
}

// ── IDF helpers ──

let _idfCache: { idf: IDFIndex; totalChunks: number } | null = null;

async function loadIDF(): Promise<{ idf: IDFIndex; totalChunks: number }> {
  if (_idfCache) return _idfCache;
  const rec = await loadIndexRecord();
  if (rec?.idf) {
    _idfCache = { idf: rec.idf, totalChunks: rec.totalChunks };
    return _idfCache;
  }
  return { idf: {}, totalChunks: 0 };
}

async function rebuildIDF(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHUNKS, "readonly");
  const all = await storeGetAll<ChunkEntry>(tx.objectStore(STORE_CHUNKS));
  db.close();

  const allTokens = all.map((c) => c.tokens);
  const idf = allTokens.length > 0 ? computeIDF(allTokens) : {};
  const totalChunks = allTokens.length;
  _idfCache = { idf, totalChunks };

  const rec = await loadIndexRecord();
  await saveIndexRecord({
    id: "global",
    embeddingMode: (rec?.embeddingMode || "tfidf") as EmbeddingMode,
    totalChunks,
    totalDocs: rec?.totalDocs || 0,
    idf,
  });
}

// ── Other utilities ──

function storeIndexGetAllKeys(index: IDBIndex, query?: IDBValidKey): Promise<IDBValidKey[]> {
  return new Promise((resolve) => {
    const req = query !== undefined ? index.getAllKeys(query) : index.getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

export async function getAllDocumentPaths(chapter: string): Promise<string[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DOCS, "readonly");
    const index = tx.objectStore(STORE_DOCS).index("chapter");
    const paths = await storeIndexGetAllKeys(index, chapter);
    db.close();
    return paths as string[];
  } catch {
    return [];
  }
}

export async function getRAGStats(): Promise<{
  mode: EmbeddingMode;
  totalChunks: number;
  totalDocs: number;
}> {
  try {
    const idx = await loadIndexRecord();
    return {
      mode: idx?.embeddingMode || "tfidf",
      totalChunks: idx?.totalChunks || 0,
      totalDocs: idx?.totalDocs || 0,
    };
  } catch {
    return { mode: "tfidf", totalChunks: 0, totalDocs: 0 };
  }
}

// ── Checkpoint-based embedding ──

/**
 * Batch-embed all chunks in the given section that have null embedding.
 * Idempotent: previously embedded chunks are skipped.
 */
export async function embedSection(section: string): Promise<{ embedded: number; skipped: number }> {
  const mode = getEmbeddingMode();
  if (mode !== "provider") {
    console.log(`[RAG] embedSection: mode is ${mode}, nothing to do`);
    return { embedded: 0, skipped: 0 };
  }

  const db = await openDB();
  let pending: ChunkEntry[];
  try {
    const tx = db.transaction(STORE_CHUNKS, "readonly");
    const sectionIndex = tx.objectStore(STORE_CHUNKS).index("section");
    const all = await indexGetAll<ChunkEntry>(sectionIndex, section);
    pending = all.filter((c) => !c.embedding);
  } finally {
    db.close();
  }

  if (pending.length === 0) return { embedded: 0, skipped: 0 };

  _sectionEmbedCalls++;

  // Batch up to 10 at a time (embedTexts handles the API batch)
  let embedded = 0;
  for (let i = 0; i < pending.length; i += 10) {
    const batch = pending.slice(i, i + 10);
    const texts = batch.map((c) => c.content);
    _embeddingCalls++;
    const embeddings = await embedTexts(texts, "passage");
    if (!embeddings || embeddings.length === 0) {
      console.warn(`[RAG] embedSection: embedTexts returned null, skipped batch`);
      continue;
    }

    const db2 = await openDB();
    try {
      const tx2 = db2.transaction(STORE_CHUNKS, "readwrite");
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const emb = embeddings[j];
        if (!emb) continue;
        tx2.objectStore(STORE_CHUNKS).put({ ...chunk, embedding: emb });
        embedded++;
      }
      await txComplete(tx2);
    } finally {
      db2.close();
    }
  }

  // Clear tracking for this section
  _pendingPathsBySection.delete(section);

  _sectionEmbeddedChunks += embedded;
  console.log(`[RAG] embedSection("${section}"): ${embedded} embedded, ${pending.length - embedded} skipped/failed`);
  return { embedded, skipped: pending.length - embedded };
}

/**
 * Returns the count of unembedded chunks grouped by section.
 */
export async function getPendingEmbedSummary(): Promise<Record<string, number>> {
  const mode = getEmbeddingMode();
  if (mode !== "provider") return {};

  const db = await openDB();
  try {
    const tx = db.transaction(STORE_CHUNKS, "readonly");
    const all = await storeGetAll<ChunkEntry>(tx.objectStore(STORE_CHUNKS));
    db.close();

    const summary: Record<string, number> = {};
    for (const c of all) {
      if (!c.embedding) {
        summary[c.section] = (summary[c.section] || 0) + 1;
      }
    }
    return summary;
  } catch {
    return {};
  }
}

/**
 * Reset pending embed tracking (e.g., on agent start).
 */
export function resetPendingEmbeds(): void {
  _pendingPathsBySection.clear();
  _chunksStoredNoEmbed = 0;
}
