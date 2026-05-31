<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Fix 504 timeouts and the core.md rewrite loop in the note agent. Implement SSE streaming to eliminate 504s, add write-once file rules to stop the core.md loop, and raise max_tokens to 16384 so notes fit in one turn.

## Constraints & Preferences
- Do NOT remove Supabase auth from `/api/llm/route.ts` — needed for security.
- Keep full file content in workspace and RAG; do NOT strip generated notes.
- Skill instructions (43KB skill.md + 14KB references) must NOT be truncated.
- Vercel Edge Function has 60s wall timeout on Hobby plan.
- The user wants a free alternative (Cloudflare Workers Free/Unbound) if Vercel's timeout persists.

## Progress
### Done
1. **SSE streaming** — agent-worker.ts `runAgentTurn` sends `stream: true`. New `parseStreamingResponse()` reads SSE chunks from `res.body.getReader()`, reconstructs content + tool_calls + reasoning_content from delta events. TTFB drops from ~30s → ~1s. The edge function returns at TTFB, eliminating 504s.
2. **Token-based compaction** — tracks `lastPromptTokens` from `usage.prompt_tokens` per turn, compacts at `COMPACT_TOKEN_THRESHOLD = 800_000` (80% of 1M context). Builds `[STATE SUMMARY]` user message with file counts by section, last 5 tool actions, remaining-work hints. Resets counter after compaction. No extra LLM call.
3. **Token logging** — `[Tokens] prompt=X completion=Y total=Z` logged inside `runAgentTurn`.
4. **504 retry** — status 504 triggers retry with 2s/4s backoff, up to 3 attempts. Each attempt is a fresh edge function invocation.
5. **Auth kept** — reverted the try-catch removal of Supabase auth.
6. **Provider timeout removed** — reverted the 20s AbortController. Edge function's 60s wall limit is the safety net.
7. **max_tokens raised** — 4096 → 16384 in both `agent-worker.ts` (body) and `route.ts` (cap). A 400+ line note fits in one turn.
8. **write_file compaction deletes content** — instead of replacing with `[FILE STORED — ...]`, now `delete a.content`. LLM cannot copy a placeholder into a new write call.
9. **Placeholder guard** — read_file detects content starting with `[FILE STORED —` and falls back to RAG. write_file rejects placeholder content. Startup scan cleans corrupted entries.
10. **mode: "full"** — read_file with `full: true` includes `"mode": "full"` in the JSON result.
11. **Core.md rewrite guard** — write_file handler checks if path ends with `core.md` and already exists in workspace; if so, returns error instructing to read it and move to creating notes.
12. **Write-once + No-Planning rules** added to `skill.md` — a `RULES THAT OVERRIDE EVERYTHING BELOW` section at the top of the skill file instructs: write each file exactly once, use priority order (core.md → notes → questions → MCQs → flashcards → quizzes → revision), never plan or redesign existing files, produce exactly one new file per turn.

### In Progress
- **Testing** — need to deploy and verify the agent writes core.md once, progresses to notes, and does not loop.

### Next Steps
1. **Deploy and test** at `/note-agent` — verify core.md is written once, agent progresses to notes, no rewrite loop.
2. **Verify SSE streaming** — no 504s, agent completes full generation.
3. **Monitor compaction** — should fire rarely (800K token threshold is high).
4. **If loops persist** — add a worker-side `_writtenFiles Set<string>` in write_file handler that rejects rewrites to any path that has already been written once.

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
