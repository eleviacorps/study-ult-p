<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Fix the RAG + note agent pipeline to eliminate 504 timeouts, retrieval loops, per-write embeddings, full-store scans, and unbounded per-turn costs. Implement checkpoint-based embedding batching.

## Constraints & Preferences
- Do NOT redesign the system; only fix remaining critical issues.
- Keep full file content in workspace and RAG; do NOT strip generated notes.
- RAG is long-term memory; the sliding window is short-term memory.
- Indexing must be async, batched, and non-blocking.
- Retrieval must not use assistant output as query.
- Search must not scan the entire corpus on every query.
- Vault seeding must index every document (drain queue fully).
- Embedding API calls limited to 100 req/min, 1000 req/day — batch aggressively by section.
- Use explicit checkpoint signals, not heuristic "guessing from random writes", to flush section embeddings.

## Progress
### Done
1. **Edge Runtime** — `/api/llm` switched from Serverless Function (10s Hobby timeout) to Edge Runtime (30s wall timeout on Hobby; I/O-bound LLM calls benefit from wall time).
2. **Edge response streaming** — `/api/llm/route.ts` changed from `await res.text()` (buffers full provider response, keeps function wall clock ticking) to `return new Response(res.body, ...)` (pipes provider stream through; function returns in ~1-3s instead of 20-25s). Both streaming and non-streaming paths use the same pipe-through approach.
3. **max_tokens reduced** — `65536` → `4096` in all 3 locations (`agent-worker.ts`, `llm-agent.ts`, `/api/llm/route.ts`). Each turn only needs to decide the next few tool calls (~500-1500 tokens); 65K budget let the LLM ramble into payload/timeout territory.
4. **Payload budget enforcement** — worker checks `JSON.stringify({messages, tools}).length` before every LLM call; >200KB forces aggressive window truncation (system + user + last 4 messages). `/api/llm` route rejects requests >500KB with 413.
5. **write_file arguments compacted** — full content (~10-30KB) replaced with `[FILE STORED — path, bytes, excerpt]` in the assistant message after execution. Full content preserved in workspace + RAG. Done in `runAgentTurn` post-processing loop.
6. **read_file returns compact by default** — result is `{path, size, excerpt, mode: "compact"}` (~400 bytes) instead of full content. Added optional `full: boolean` parameter for byte-level verification. Tool definition updated in `NOTE_AGENT_TOOLS` in `llm-agent.ts`.
7. **assess_quality returns compact by default** — result is counts + first 10 issues (~2KB) instead of full diagnostic payload (~50KB+). Added optional `detailed: boolean` parameter for full diagnostics. Tool definition updated.
8. **Read cache per-path** — in-memory `Map<string, string>` caches read_file results; invalidated on write_file to the same path. Falls back to RAG (`getDocument()`) for vault files indexed but not in workspace.
9. **Loop detection** — 4 consecutive same-path reads/writes or 4 consecutive idle turns (no tool calls) throws descriptive error instead of cascading into timeout. `MAX_CONSECUTIVE_SAME_ACTION = 4`; also `MAX_CONSECUTIVE_PARSE_FAILS = 3` for malformed JSON.
10. **Vault seeding path matching fixed** — `normPath.split("/").includes(normChapterPath)` instead of `n.path.startsWith(chapterPath)`. Catches subject-qualified vault paths like `Physics/Electrostatics/notes/x.md` when chapterPath is `Electrostatics`. Logs `queuedCount/total` for visibility.
11. **Placeholder bug fixed** — removed the `write_file` argument stripping block from `runAgentTurn`. LLM no longer sees `[stored in RAG — N bytes]` and will not copy it as file content.
12. **`.catch(() => {})` replaced** with `.catch((e) => console.error(...))` on `addDocument` in `toolHandler`.
13. **MAX_TURNS raised** from 50 to 150.
14. **Retrieval loops stopped** — `injectRagContext` builds structured queries from chapter name + recent tool call paths/types, never from last assistant prose. Queries deduplicated via `retrievalQueryHash()`.
15. **Indexing moved out of write path** — `write_file` handler calls `queueDocument()` (O(1), non-blocking). `processDocumentQueue()` batches up to 20 docs per call.
16. **Full-store scans eliminated** — `searchDocuments` uses `index("chapter").getAll(chapter)` to load only the current chapter's chunks.
17. **Candidate reduction before scoring** — token-overlap prefilter discards chunks sharing zero tokens with the query before cosine similarity scoring.
18. **Retrieval cache** — in-memory Map keyed by normalized query + chapter + type; 10s TTL; busted on `_writeVersion` increment.
19. **Vault seeding drains queue fully** — `seedVectorStore` loops `while (pendingIndexCount() > 0) { await processDocumentQueue(); }` with stall guard.
20. **Telemetry counters** — `getIndexTelemetry()` returns `docsIndexed`, `chunksIndexed`, `embeddingCalls`, `searchCalls`, `cacheHits`, `cacheMisses`, `indexTimeMs`, `searchTimeMs`, `skippedSameHash`, `pendingQueue`. Per-turn log includes tool call count, message count, estimated payload KB, pending queue size.
21. **Build passes** — `npm run build` succeeds on all commits.
22. **Checkpoint-based embedding system** — `addDocument` split into store-only phase (chunks with `embedding: null`) and batch-embed phase via `embedSection()`. `write_file` queues content store-only; `processDocumentQueue` stores without API calls. Section transition auto-detect triggers `embedSection("notes")` → `embedSection("questions")` → `embedSection("revision")` as the agent moves through phases. `embedSection` is idempotent — previously-embedded chunks are skipped. Vault seeding embeds immediately (`embedImmediately=true`). In-memory `_pendingPathsBySection` map tracks which paths need embedding. Functions added: `embedSection(section)`, `getPendingEmbedSummary()`, `resetPendingEmbeds()`. DB version bumped to 3 for section index. All re-exported via `vector-store.ts`.

### Next Steps
1. **Deploy and test** at `/note-agent` — verify no 504 errors, no placeholder content, full vault indexing, section-based embedding calls (not per-write), cache hits on repeated queries.
2. **Monitor telemetry** in browser console: `[RAG] candidate reduction: X → Y chunks`, `[Agent] seeded N vault docs`, cache hit/miss, section embed counts, per-turn payload KB.
3. **Watch for migration:** existing IndexedDB databases at version 2 will be auto-migrated to version 3 (adding `section` index on chunks store).

## Key Decisions
- **Pipe provider response through Edge function** — `return new Response(res.body, ...)` instead of `await res.text()`. Function returns in ~1-3s (time to first byte from provider) instead of waiting for full 20-25s generation. The remaining tokens stream through Edge runtime infrastructure without counting against the 30s wall limit.
- **max_tokens 4096** — tight enough to prevent rambling, loose enough for reasoning + tool calls. If the model exceeds it, the turn ends cleanly and continues in the next turn (no content loss).
- **Compact tool results by default** (`read_file`, `assess_quality`) — full content available via optional `full: true` / `detailed: true` parameters. This is a runtime budget measure, not knowledge truncation. Full content lives in workspace + RAG.
- **Checkpoint-based embedding** — separates storage (fast, immediate) from embedding (slow, batched, API-costly). Checkpoints align with the agent's natural workflow phases (notes → questions → revision).
- **In-memory pending-embed tracking** — `_pendingPathsBySection` map avoids DB schema migration; reset on worker restart.
- **Edge Runtime on Vercel Hobby** — 5s CPU limit, 30s wall timeout. LLM `fetch()` is I/O-bound so wall time is the effective limit.

## Critical Context
- **Embedding quota:** 100 req/min, 1000 req/day. Each req can embed up to 10 chunks (batched by `embedTexts`). Checkpoint-based embedding uses 1-3 calls per section instead of 1 call per write.
- **`write_file` handler** stores content in `workspace` + `queueDocument()` (store-only, no API call). Returns short JSON result. Section transition auto-detect fires `embedSection()` fire-and-forget for the previous section.
- **`seedVectorStore`** uses `embedImmediately=true` — vault docs must be immediately searchable for retrieval queries during the agent run.
- **`embedSection(section)`** calls `embedTexts` in batches of 10, writes embeddings back to IndexedDB. Idempotent — skips chunks with non-null embedding.
- **DB migration:** existing DBs at version 2 auto-migrate to version 3, adding a `section` index on the chunks store for efficient `embedSection` lookups.
- **`_writeVersion`** increments on every document write, busting retrieval cache globally.
- **`retrievalQueryHash()`** deduplicates identical queries across turns; `buildRetrievalQuery()` uses only tool call activity (paths, types) — never assistant `content`.
- **`searchDocuments`** loads chunks via `chapter` index, applies type filter, then token-overlap prefilter, then cosine similarity scoring.
- **`tokens[]`** field is always populated (set during store phase, no API call needed — computed from text via `extractTokens`).

## Relevant Files
- `src/lib/note-agent/agent-worker.ts` — agent loop, loop guards, max_tokens 4096, write_file/read_file compaction, read cache, section transition auto-detect, `embedSection` caller on checkpoint/abort/done/error.
- `src/lib/note-agent/rag-store.ts` — `queueDocument`, `processDocumentQueue`, `searchDocuments` (chapter-indexed + token-overlap + cache), `addDocument` (store-only or embed-on-write), `embedSection` (batch-embed all null-embedding chunks in a section), `getPendingEmbedSummary`, `resetPendingEmbeds`, `_pendingPathsBySection` tracking, telemetry counters, DB upgrade v2→v3.
- `src/lib/note-agent/vector-store.ts` — re-exports all rag-store functions including `embedSection`, `getPendingEmbedSummary`, `resetPendingEmbeds`.
- `src/lib/note-agent/embeddings.ts` — `embedTexts`, `extractTokens`, `computeTF`, `computeIDF`, `computeContentHash`.
- `src/app/api/llm/route.ts` — Edge Runtime, stream-through provider response, max_tokens 4096 cap, 500KB request limit.
- `src/lib/llm-agent.ts` — `runAgentTurn` (max_tokens 4096), `NOTE_AGENT_TOOLS` (updated read_file, assess_quality parameters).
