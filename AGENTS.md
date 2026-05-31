<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Fix the RAG + note agent pipeline to eliminate 504 timeouts, retrieval loops, per-write embeddings, full-store scans, and unbounded per-turn costs. Implement checkpoint-based embedding batching and structured conversation compaction.

## Constraints & Preferences
- Do NOT redesign the system; only fix remaining critical issues.
- Keep full file content in workspace and RAG; do NOT strip generated notes.
- RAG is long-term memory; the sliding window is short-term memory.
- Indexing must be async, batched, and non-blocking.
- Retrieval must not use assistant output as query.
- Search must not scan the entire corpus on every query.
- Vault seeding must index every document (drain queue fully).
- Embedding API calls limited to 100 req/min, 1000 req/day — batch aggressively by section.
- Use explicit checkpoint signals (section transition from `notes/` → `questions/`), not heuristic "guessing from random writes", to flush section embeddings.
- Skill instructions (43KB `skill.md` + 14KB references) must NOT be truncated — doing so breaks note quality.

## Progress
### Done
1. **Edge Runtime** — `/api/llm` switched from Serverless Function (10s Hobby timeout) to Edge Runtime (30s wall timeout). I/O-bound LLM calls benefit from wall time.
2. **Edge response streaming** — `/api/llm/route.ts` changed from `await res.text()` (buffers full response, keeps wall clock ticking) to `return new Response(res.body, ...)` (pipes provider stream; function returns in ~1-3s instead of 20-25s).
3. **max_tokens reduced** — `65536` → `4096` in all 3 locations (`agent-worker.ts`, `llm-agent.ts`, `/api/llm/route.ts`). Keeps each turn focused on next few tool calls (~500-1500 tokens).
4. **write_file arguments compacted** — full content (~10-30KB) replaced with `[FILE STORED — path, bytes, excerpt]` in the assistant's tool_calls after execution. Full content preserved in workspace + RAG.
5. **read_file returns compact by default** — result is `{path, size, excerpt, mode: "compact"}` (~400 bytes). Optional `full: boolean` for byte-level verification.
6. **assess_quality returns compact by default** — result is counts + first 10 issues (~2KB). Optional `detailed: boolean` for full diagnostics.
7. **Per-path read cache** — `Map<string, string>` caches compact read_file results; invalidated on write_file. Falls back to RAG for indexed files.
8. **Loop detection** — 4 consecutive same-path reads/writes or 4 consecutive idle turns throws descriptive error. `MAX_CONSECUTIVE_SAME_ACTION = 4`; `MAX_CONSECUTIVE_PARSE_FAILS = 3`.
9. **Placeholder bug fixed** — write_file argument stripping removed; read_file ignores `[FILE STORED —` in workspace and falls back to RAG; write_file rejects placeholder content.
10. **`.catch(() => {})` replaced** with `.catch((e) => console.error(...))` on all async calls.
11. **MAX_TURNS raised** from 50 to 150.
12. **Retrieval loops stopped** — `injectRagContext` builds queries from chapter name + tool call paths, never assistant prose. Deduplicated via `retrievalQueryHash()`.
13. **Indexing moved out of write path** — `queueDocument()` (O(1), non-blocking). `processDocumentQueue()` drains up to 20 docs per call.
14. **Full-store scans eliminated** — `searchDocuments` uses `index("chapter").getAll(chapter)` to load only the current chapter's chunks.
15. **Candidate reduction before scoring** — token-overlap prefilter discards chunks sharing zero tokens with the query before cosine similarity.
16. **Retrieval cache** — in-memory Map keyed by normalized query + chapter + type; 10s TTL; busted on `_writeVersion` increment.
17. **Vault seeding drains queue fully** — loops `while (pendingIndexCount() > 0)` with stall guard.
18. **Telemetry counters** — docsIndexed, chunksIndexed, embeddingCalls, searchCalls, cacheHits, cacheMisses, indexTimeMs, searchTimeMs, skippedSameHash, pendingQueue. Per-turn payload KB log.
19. **Checkpoint-based embedding** — store-only phase (chunks with `embedding: null`) + batch-embed via `embedSection()`. Section transition auto-detect triggers `embedSection()`. Idempotent, DB v2→v3 with section index.
20. **Gemini Embedding 2** — model `gemini-embedding-2`, route translates OpenAI↔Gemini format. Single + batch endpoints.
21. **Vault seeding space-vs-underscore fix** — fallback matching normalizes chapter path spaces/underscores.
22. **Structured conversation compaction** (replaces payload truncation) — When >180KB, builds a `[STATE SUMMARY]` message listing all written files (by section: notes/questions/flashcards/quizzes/revision), file counts, last 5 tool actions, and remaining work hints. Replaces all accumulated messages (except system+user) with this single compact summary. Payload drops from ~180KB → ~90KB. No orphaned tool messages, no context loss (files are ground truth in workspace).
23. **read_file placeholder detection** — workspace content starting with `[FILE STORED —` triggers RAG fallback.
24. **Skill context preserved** — 43KB `skill.md` + 14KB references kept intact. Not truncated.
25. **Build passes** — `npm run build` succeeds on every commit.

### Next Steps
1. **Deploy and test** at `/note-agent` — verify compaction fires around turn 10-15, drops payload to ~90KB, agent continues normally reading workspace files.
2. **Verify multiple compaction cycles** — agent should be able to grow → compact → grow → compact repeatedly.
3. **Monitor telemetry** — per-turn payload KB before/after compaction, tool call counts.
4. **Consider compaction threshold tuning** — 180KB works but may need tweaking. The compaction summary is built from workspace state, not LLM analysis, so it costs zero API calls.

## Key Decisions
- **Structured compaction over message truncation** — Instead of dropping the tail of messages (which orphans tool calls and loses context), replace all accumulated tool chains with a single structured state summary. The workspace is the ground truth; the LLM can read any file. No extra LLM call needed. Multiple compaction cycles are safe.
- **Compact tool results by default** (`read_file`, `assess_quality`) — full content available via optional parameters. Runtime budget measure, not knowledge truncation.
- **Checkpoint-based embedding** — separates storage (fast) from embedding (slow, batched, API-costly). Checkpoints align with agent's natural phases (notes → questions → revision).
- **Skill context NOT truncated** — 58KB of skill instructions preserved. Payload managed by compaction rather than modifying instructions.
- **Pipe provider response through Edge function** — `return new Response(res.body, ...)` instead of `await res.text()`. Function returns in ~1-3s (TTFB from provider) instead of waiting for full generation.

## Critical Context
- **Compaction mechanics** (`agent-worker.ts:557-578`): when `payloadEstimate > 180_000`, builds a `[STATE SUMMARY]` user message with file counts by section (notes/questions/flashcards/quizzes/revision), total file count, last 5 tool actions, and hints about what's still needed (e.g., `"Questions file remains to be written."`). Only system + original user message + state summary survive. Multiple compactions are safe — each rebuilds from current workspace state.
- **Default vault** (`vault-data.json`): 31 notes across 4 Physics chapters. Biology notes come from localStorage (`mergeAgentNotes` from prior agent runs), loaded into workspace but not counted in the 31.
- **`write_file` handler**: guards against placeholder content. Stores in workspace + queues store-only via `queueDocument`. Returns `{success, path, bytes}`.
- **`read_file` handler**: if workspace content starts with `[FILE STORED —`, falls back to RAG `getDocument()`. Prevents placeholder leakage.
- **`embedSection(section)`**: batch-embeds all null-embedding chunks for a section. Idempotent.
- **RAG context injection**: appends 3 excerpts (~300 chars each) to system message every turn. Replaces previous via regex.
- Read cache: compact results cached per-path. Cleared on write_file. Falls back to RAG for workspace misses.
- `_writeVersion` increments on every document write, busting retrieval cache globally.
- Embedding quota: 100 req/min, 1000 req/day. Each req embeds up to 10 chunks.

## Relevant Files
- `src/lib/note-agent/agent-worker.ts` — agent loop, compaction (state summary builder), loop guards, write_file/read_file with placeholder detection, section transition auto-detect, embedSection caller.
- `src/lib/note-agent/rag-store.ts` — queueDocument, processDocumentQueue, searchDocuments (chapter-indexed + token-overlap + cache), embedSection, DB v2→v3.
- `src/lib/note-agent/vector-store.ts` — re-exports all rag-store functions.
- `src/lib/note-agent/embeddings.ts` — embedTexts, extractTokens, computeTF/IDF, computeContentHash. Auto-probes Gemini provider on load.
- `src/app/api/embeddings/route.ts` — Gemini-native support, auto-detects provider from base URL.
- `src/lib/load-skill.ts` — loads 43KB skill.md + 5 reference files (14KB). Not truncated.
- `src/lib/llm-agent.ts` — runAgentTurn (max_tokens 4096), NOTE_AGENT_TOOLS.
- `src/app/api/llm/route.ts` — Edge Runtime, stream-through, 500KB request limit.
