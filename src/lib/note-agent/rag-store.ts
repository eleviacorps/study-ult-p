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
  chunkIndex: number;
  chunkTotal: number;
  content: string;
  contentHash: string;
  // One of these is populated based on mode:
  embedding: Float32Array | null;      // provider mode
  vector: [string, number][] | null;   // TF-IDF mode
  tokens: string[];                    // always populated (TF-IDF fallback)
}

interface DocRecord {
  path: string;
  chapter: string;
  type: string;
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

// ── Constants ──

const DB_NAME = "studyult-rag";
const DB_VERSION = 2;
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
        s.createIndex("contentHash", "contentHash", { unique: false });
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

/** Synchronous batch put — does NOT await individual requests. Awaits transaction only. */
function putAll(store: IDBObjectStore, values: unknown[]): void {
  for (const v of values) store.put(v);
}

/** Synchronous batch delete — does NOT await individual requests. Awaits transaction only. */
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

function storeGetAllKeys(store: IDBObjectStore, query?: IDBValidKey): Promise<IDBValidKey[]> {
  return new Promise((resolve) => {
    const req = query !== undefined ? store.getAllKeys(query) : store.getAllKeys();
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
    // Mode changed — clear and re-index needed (handled lazily)
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

// ── Embedded IDF cache (TF-IDF mode) ──

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
  const all = await (() => {
    const tx = db.transaction(STORE_CHUNKS, "readonly");
    return storeGetAll<ChunkEntry>(tx.objectStore(STORE_CHUNKS));
  })();
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

// ── CRUD ──

export async function addDocument(
  path: string,
  content: string,
  chapter: string,
  type: string
): Promise<void> {
  if (!content.trim()) return;

  const mode = getEmbeddingMode();
  if (mode === "probing") await waitForMode();
  const resolvedMode = getEmbeddingMode() as EmbeddingMode;

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
      return;
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
    if (chunks.length === 0) { db.close(); return; }

    // ── Embed (no DB work here — safe) ──
    const chunkTexts = chunks.map((c) => c.content);
    let embeddings: Float32Array[] | null = null;
    let tfVectors: SparseVector[] | null = null;

    if (resolvedMode === "provider") {
      embeddings = await embedTexts(chunkTexts, "passage");
      if (!embeddings) tfVectors = chunkTexts.map((t) => computeTF(t));
    } else {
      tfVectors = chunkTexts.map((t) => computeTF(t));
    }

    // ── Build chunk entries (async hash, no DB) ──
    const chunkEntries: ChunkEntry[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      chunkEntries.push({
        chunkId: `${path}#${chunk.index}`,
        path,
        chapter,
        type,
        chunkIndex: chunk.index,
        chunkTotal: chunk.total,
        content: chunk.content,
        contentHash: await computeContentHash(chunk.content),
        embedding: embeddings?.[i] || null,
        vector: tfVectors ? Array.from(tfVectors[i].entries()) : null,
        tokens: extractTokens(chunk.content),
      });
    }

    // ── Single write transaction — all puts synchronous ──
    const now = Date.now();
    const idxRec = await loadIndexRecord();
    const tx = db.transaction([STORE_CHUNKS, STORE_DOCS, STORE_INDEX], "readwrite");
    putAll(tx.objectStore(STORE_CHUNKS), chunkEntries);
    tx.objectStore(STORE_DOCS).put({
      path, chapter, type, content, contentHash,
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

    // ── Async post-processing ──
    if (resolvedMode === "tfidf" || !embeddings) {
      rebuildIDF().catch(() => {});
    }
  } catch (err) {
    db.close();
    console.error("[RAG] addDocument error:", err);
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

export async function searchDocuments(
  query: string,
  chapter: string,
  limit = 5,
  typeFilter?: string
): Promise<{ path: string; excerpt: string; score: number }[]> {
  try {
    if (!query.trim()) return [];

    const mode = getEmbeddingMode();
    if (mode === "probing") await waitForMode();
    const resolvedMode = getEmbeddingMode() as EmbeddingMode;

    // ── Load relevant chunks ──
    const db = await openDB();
    const tx = db.transaction(STORE_CHUNKS, "readonly");
    const all = await storeGetAll<ChunkEntry>(tx.objectStore(STORE_CHUNKS));
    db.close();

    if (all.length === 0) return [];

    let filtered = all.filter((c) => c.chapter === chapter);
    if (typeFilter) filtered = filtered.filter((c) => c.type === typeFilter);
    if (filtered.length === 0) return [];

    // ── Embed query ──
    let queryVec: Float32Array | null = null;
    let querySparse: SparseVector | null = null;

    if (resolvedMode === "provider") {
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

    return Array.from(best.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ path, excerpt, score }) => ({ path, excerpt, score }));
  } catch (err) {
    console.error("[RAG] searchDocuments error:", err);
    return [];
  }
}

export async function searchDocumentsByContent(
  query: string,
  chapter: string,
  limit = 5,
  typeFilter?: string
): Promise<{ path: string; excerpt: string; score: number }[]> {
  return searchDocuments(query, chapter, limit, typeFilter);
}

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

    rebuildIDF().catch(() => {});
  } catch (err) {
    console.error("[RAG] deleteDocument error:", err);
  }
}

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
