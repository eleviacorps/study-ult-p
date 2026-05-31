<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Fix 504 timeouts, the core.md rewrite loop, and 413 request-too-large errors. Implement SSE streaming to eliminate 504s, add write-once file rules to stop the core.md loop, disable RAG to stop payload bloat, and switch compaction from token-based to byte-based to stay under 500KB limit.

## Constraints & Preferences
- Do NOT remove Supabase auth from `/api/llm/route.ts` — needed for security.
- Keep full file content in workspace and RAG; do NOT strip generated notes.
- Skill instructions (43KB skill.md + 14KB references) must NOT be truncated.
- Vercel Edge Function has 60s wall timeout on Hobby plan and 500KB request limit.
- RAG disabled because injected excerpts bloat the system message past the 500KB limit over many turns.
- Compaction is byte-based (not token-based) because the 413 error is about byte size, not token count.

## Progress
### Done
1. **SSE streaming** — agent-worker.ts `runAgentTurn` sends `stream: true`. New `parseStreamingResponse()` reads SSE chunks from `res.body.getReader()`, reconstructs content + tool_calls + reasoning_content from delta events. TTFB drops from ~30s → ~1s. The edge function returns at TTFB, eliminating 504s.
2. **Token-based compaction (replaced)** — was `COMPACT_TOKEN_THRESHOLD = 800_000` (80% of 1M context). Never fired because prompt tokens maxed at ~97K.
3. **Byte-based compaction** — checks `JSON.stringify(messages).length` every turn. Fires at 220KB, well under the 500KB edge limit. Builds `[STATE SUMMARY]` with file counts + last 5 actions + hints. Keeps system + user + summary, drops everything else.
4. **RAG disabled** — `injectRagContext` call commented out in the agent loop. The injected excerpts accumulated in the system message, bloating payload past 500KB. Code kept in file for future re-enable.
5. **max_tokens raised** — 4096 → 32768 in both `agent-worker.ts` (body) and `route.ts` (cap). Gives room for reasoning (~16K) + tool call content (~16K).
6. **write_file compaction deletes content** — `delete a.content` instead of `[FILE STORED — ...]` placeholder.
7. **Placeholder guard** — read_file/write_file detect and reject placeholder content. Startup scan cleans corrupted entries.
8. **Core.md rewrite guard** — write_file rejects path ending with `core.md` if it already exists in workspace.
9. **Write-once + No-Planning rules** — `RULES THAT OVERRIDE EVERYTHING BELOW` section in skill.md.
10. **Finish-reason detection** — `parseStreamingResponse` tracks `choice.finish_reason`; on `"length"`, drops truncated tool calls instead of pushing invalid JSON to handler.
11. **Continuation prompt on truncation** — when all tool calls dropped by `finish_reason: "length"`, injects user continuation prompt instead of killing agent.
12. **Provider timeout removed** — reverted 20s AbortController. Edge function's 60s wall limit is the safety net.
13. **504 retry** — 3 attempts with 2s/4s backoff.
14. **Auth kept** — Supabase auth untouched.

### Test Results (Sexual Reproduction in Flowering Plants chapter)
- **No 504s** — SSE streaming works throughout 85+ turns.
- **No core.md rewrite** — Biology/core.md and chapter core.md written once each.
- **8 notes + 100_questions.md + 100_mcqs.md + 100_flashcards.md + 100_quizzes.md + revision files created** — all indexed into RAG.
- **413 error at turn 85** — payload hit 542KB > 500KB Vercel Edge limit. Cause: compaction threshold was 800K tokens but prompt tokens only reached 97K → compaction never fired → messages accumulated for 85+ turns.
- **embedSection fired correctly** — at section transitions (notes → questions → other → revision), 69 + 63 + 72 + 54 chunks embedded.

### Fix for 413
- Compaction switched from token-based (800K threshold) to byte-based (220KB threshold).
- RAG injection disabled (was adding excerpts to system message every turn).
- Compaction now fires at ~220KB, stays well under 500KB limit.

### Next Steps
1. **Deploy and test** — verify no 413 errors, compaction fires appropriately, agent completes full generation.
2. **Monitor compaction** — should fire every ~40-50 turns, keeping payload around ~220KB.
3. **If RAG needed later** — re-enable `injectRagContext` call but either cap the number of excerpts or reduce their size.

## Key Decisions
- **Structured compaction over message truncation** — Instead of dropping the tail of messages (which orphans tool calls and loses context), replace all accumulated tool chains with a single structured state summary. The workspace is the ground truth; the LLM can read any file. No extra LLM call needed. Multiple compaction cycles are safe.
- **Compact tool results by default** (`read_file`, `assess_quality`) — full content available via optional parameters. Runtime budget measure, not knowledge truncation.
- **Checkpoint-based embedding** — separates storage (fast) from embedding (slow, batched, API-costly). Checkpoints align with agent's natural phases (notes → questions → revision).
- **Skill context NOT truncated** — 58KB of skill instructions preserved. Payload managed by compaction rather than modifying instructions.
- **Pipe provider response through Edge function** — `return new Response(res.body, ...)` instead of `await res.text()`. Function returns in ~1-3s (TTFB from provider) instead of waiting for full generation.
- **delete a.content over [FILE STORED — ...]** — The old compaction replaced content with a placeholder string. The LLM repeatedly copied this placeholder back into new write_file calls, causing guard rejections and agent confusion. Deleting the content field entirely breaks this copy chain.
- **Skill needs "write once" and "no planning" rules** — The current skill's "Analyze Input → Topic Extraction → Vault Structure → Metadata → ... before writing content" flow encourages planning loops. Adding `RULES THAT OVERRIDE EVERYTHING BELOW` at the top of the skill file should break the core.md rewrite loop at the instruction level.

## Critical Context
- **Compaction mechanics** (`agent-worker.ts:557-578`): when `payloadEstimate > 180_000`, builds a `[STATE SUMMARY]` user message with file counts by section (notes/questions/flashcards/quizzes/revision), total file count, last 5 tool actions, and hints about what's still needed (e.g., `"Questions file remains to be written."`). Only system + original user message + state summary survive. Multiple compactions are safe — each rebuilds from current workspace state.
- **Default vault** (`vault-data.json`): 31 notes across 4 Physics chapters. Biology notes come from localStorage (`mergeAgentNotes` from prior agent runs), loaded into workspace but not counted in the 31.
- **`write_file` handler**: guards against placeholder content. Stores in workspace + queues store-only via `queueDocument`. Returns `{success, path, bytes}`.
- **Core.md rewrite guard**: if path ends with `core.md` and already exists in workspace, returns error with `"core.md already exists. Read it, then move to creating notes."`
- **`read_file` handler**: if workspace content starts with `[FILE STORED —`, falls back to RAG `getDocument()`. Prevents placeholder leakage.
- **`embedSection(section)`**: batch-embeds all null-embedding chunks for a section. Idempotent.
- **RAG context injection**: commented out (disabled). 3 excerpts were appended to system message every turn, bloating payload past 500KB. Code kept for future re-enable.
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
