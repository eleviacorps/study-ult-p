# RAG Architecture — StudyUlt2 Note Agent

## 1. Embedding Model (3-tier fallback)

| Tier | Source | Model | Latency | Quality |
|------|--------|-------|---------|---------|
| **Primary** | `/api/embeddings` route → provider API | Provider embedding model (e.g. `text-embedding-3-small`) | ~100ms network | Best |
| **Fallback 1** | `@xenova/transformers` in Web Worker | `Xenova/all-MiniLM-L6-v2` (384-dim, ONNX) | ~10ms after load | Good |
| **Fallback 2** | In-process TF-IDF | Sparse vector from term frequency × IDF | ~0ms cold | Keyword only |

**Resolution order:**
1. On first `addDocument` call, probe provider embeddings via a small test request.
2. If provider succeeds → store `"provider"` mode in global index record.
3. If provider fails (timeout/404/unauthorized) → load local model in background.
4. If local model fails → switch to TF-IDF.

Once a tier is selected, it is cached for the session. All embeddings are stored as `Float32Array` in IndexedDB.

## 2. Chunking Strategy

- **Algorithm:** Paragraph-aware sliding window
- **Chunk size:** 512 tokens (estimated at ~4 chars/token)
- **Overlap:** 50 tokens
- **Unit:** Paragraph boundaries are respected — a chunk never splits a paragraph

```
Input: "Para A\n\nPara B\n\nPara C ..."
→ Chunk 1: [Para A, Para B]     (480 tokens)
→ Chunk 2: [Para B_50tok, Para C, Para D]  (overlap carries tail of Para B)
→ Chunk 3: ...
```

Each chunk stores:
- `chunkIndex`, `chunkTotal` (positional metadata)
- `startPos`, `endPos` (byte offsets for reconstruction)
- `contentHash` (SHA-256 for dedup)

## 3. Metadata Schema (IndexedDB)

### Store: `chunks` (keyPath: `chunkId`)

```
chunkId: string           → "${path}#${chunkIndex}"
path: string              → e.g. "ch1/notes/kinematics.md"
chapter: string           → e.g. "ch1"
type: "notes" | "questions" | "flashcards" | "quizzes" | "revision" | "other"
chunkIndex: number        → 0-based position
chunkTotal: number        → total chunks for this doc
content: string           → chunk plain text
contentHash: string       → SHA-256 hex digest
embedding: Float32Array   → 384 or 768 dim vector (null in TF-IDF mode)
tokens: string[]          → tokenized terms (TF-IDF fallback)
createdAt: number         → Date.now()
```

**Indexes:**
- `chapter` (unique: false)
- `type` (unique: false)
- `contentHash` (unique: false) — for dedup lookups

### Store: `docs` (keyPath: `path`)

```
path: string
chapter: string
type: string
content: string           → full original content
chunkIds: string[]        → ["${path}#0", "${path}#1", ...]
contentHash: string       → SHA-256 of full content
createdAt: number
updatedAt: number
```

**Indexes:**
- `chapter` (unique: false)

### Store: `index` (keyPath: `id`)

```
id: "global" | "local"
embeddingMode: "provider" | "local" | "tfidf"
totalChunks: number
totalDocs: number
// For TF-IDF fallback:
idf: Record<string, number> | null
```

## 4. Deduplication Strategy

**Per-chunk dedup:**
- Before inserting a chunk, compute SHA-256 hash.
- Query `chunks` store by `contentHash` index.
- If hash exists for the same `chapter` → skip insertion.

**Per-document dedup:**
- Before indexing a document, compute SHA-256 of full content.
- Query `docs` store by `path`.
- If path exists and `contentHash` matches → skip entire doc.
- If path exists but hash differs → delete old chunks, re-index.

**Edge cases:**
- Same content written to different paths → indexed twice (correct — different context).
- Same path written twice with same content → no-op.
- Same path written twice with different content → old chunks purged, new chunks indexed.

## 5. Retrieval Pipeline

```
searchDocuments(query, chapter, limit=5, typeFilter?)
  │
  ├─ 1. Embed query → vector (or TF-IDF if fallback mode)
  │
  ├─ 2. Load all chunks for chapter (filtered by type)
  │
  ├─ 3. Compute cosine similarity between query vector and each chunk vector
  │       cosine(q, d) = dot(q, d) / (|q| × |d|)
  │
  ├─ 4. Deduplicate results by path (keep highest-scoring chunk per file)
  │
  ├─ 5. Sort desc by score, take top-k
  │
  └─ 6. Return { path, excerpt, score }[]
```

**Quality measures:**
- Excerpt length: 300 chars (first 300 of matching chunk)
- Score threshold: results with score ≤ 0 are excluded
- Type filter: optional, filters by `type` field

## 6. Storage Schema

```
Database: studyult-rag (version 2)
├── ObjectStore: chunks (keyPath: chunkId)
│   ├── index: chapter  (key: chapter)
│   ├── index: type     (key: type)
│   └── index: contentHash (key: contentHash)
├── ObjectStore: docs (keyPath: path)
│   └── index: chapter  (key: chapter)
└── ObjectStore: index (keyPath: id)
    └── single record: { id: "global", ... }
```

## 7. Migration Plan (Stages)

### Stage A — Implement rag-store.ts
- [ ] `chunker.ts` with paragraph-aware splitting, overlap, SHA-256 hashing
- [ ] `embeddings.ts` with 3-tier embedding provider
  - [ ] Provider API client (`/api/embeddings` route)
  - [ ] Local model loader (transformers.js)
  - [ ] TF-IDF fallback
- [ ] `rag-store.ts` with IndexedDB schema, CRUD, search
- [ ] Each file independently testable

### Stage B — Verify retrieval quality
- [ ] Manual integration test: seed vault notes, run sample queries
- [ ] Print top-3 results for 5 different query types (topic, question, formula, etc.)
- [ ] Measure indexing time for 50 documents
- [ ] Measure search latency (p50, p95)
- [ ] Verify dedup works (same content twice → single entry)

### Stage C — Integrate with agent-worker
- [ ] Preserve `injectRagContext` but swap implementation to use new `rag-store.ts`
- [ ] Remove `stripToolContent` — RAG is the long-term memory, not a workaround
- [ ] Keep sliding window for conversation flow (short-term memory)
- [ ] Verify agent can recall notes written 20+ turns ago
- [ ] Verify behavior when RAG is empty (graceful degradation)

## 8. Long-term / Short-term Memory Separation

| **Short-term (conversation window)** | **Long-term (RAG store)** |
|--------------------------------------|---------------------------|
| Current task / phase | All generated notes |
| Recent tool calls | Questions, MCQs |
| Active workflow state | Flashcards, Quizzes |
| Last `N` turns of dialogue | Revision sheets |
| LLM's "train of thought" | Vault reference content |
| System prompts | Chapter structure |

**Rule:** Information placed in RAG is never stripped from messages. The sliding window manages short-term memory. RAG manages long-term memory. The two are orthogonal.
