<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Goal
Fix 504 timeouts, the core.md rewrite loop, 413 request-too-large errors, and read-file loops. Implement SSE streaming to eliminate 504s, add write-once file rules, disable RAG to stop payload bloat, fix assess_quality regex to stop read loops, and use 1M token compaction.

## Constraints & Preferences
- Do NOT remove Supabase auth from `/api/llm/route.ts` — needed for security.
- Keep full file content in workspace and RAG; do NOT strip generated notes.
- Skill instructions (43KB skill.md + 14KB references) must NOT be truncated.
- Vercel Edge Function has 60s wall timeout on Hobby plan and 500KB request limit.
- RAG disabled because injected excerpts bloat the system message past the 500KB limit over many turns.
- DeepSeek supports 1M token context — compaction fires at 1M prompt tokens.
- No subject/core.md — only chapter-level core.md is generated.

## Progress
### Done
1. **SSE streaming** — agent-worker.ts `runAgentTurn` sends `stream: true`. `parseStreamingResponse()` reads SSE chunks from `res.body.getReader()`, reconstructs content + tool_calls + reasoning_content from delta events. TTFB drops from ~30s → ~1s.
2. **LLM-powered compaction** — calls `/api/llm` with `stream: false` and compaction-specific system prompt requesting 7-section structured output. Falls back to file-count summary if LLM call fails.
3. **Tail preservation** — `COMPACTION_TAIL_TURNS = 1`. Preserves last 1 assistant+tool pair during compaction.
4. **Tool output pruning** — replaces tool result content >500 chars with `"[Old tool result content cleared]"` on non-tail messages. Protected tools (skill) never pruned.
5. **Core.md rewrite guard** — write_file handler returns error if path ends with `core.md` and already exists in workspace.
6. **write_file content compaction** — uses `delete a.content` instead of `[FILE STORED — ...]` placeholder. Stops LLM copying placeholder into new write calls.
7. **Placeholder guard** — read_file falls back to RAG on `[FILE STORED —` content. write_file rejects placeholder content. Startup cleans corrupted entries.
8. **Finish-reason detection** — `parseStreamingResponse()` tracks `choice.finish_reason`. On `"length"`, drops truncated tool calls with invalid JSON args.
9. **Continuation prompt on truncation** — when all tool calls dropped by `finish_reason: "length"`, injects continuation prompt as user message.
10. **Doom loop threshold** — `MAX_CONSECUTIVE_SAME_ACTION = 3`.
11. **Schema-based argument validation** — `TOOL_SCHEMAS` maps each tool to required params and types. `validateToolArgs()` checks before execution.
12. **formatToolError with schema details** — error messages include full parameter list (name, type, required/optional) plus `_hint: "fix_args"`.
13. **Automatic output truncation** — `truncateToolResult()` caps all tool results at 50KB.
14. **Execution context tracking** — `_toolCallSequence` counter + `_toolExecLog` array records `{seq, name, id, args, startedAt, durationMs, truncated}` for every tool call.
15. **list_workspace with file metadata** — returns `size` (bytes) and `lines` (line count) per file.
16. **read_file full-read cache** — `_fullReadCache` stores full reads keyed by path, evicted after 30s TTL. Invalidated on write_file.
17. **write_file auto-fill** — `autoFillWriteFileArgs()` extracts markdown from assistant's reasoning text when DeepSeek drops `content` from tool call args.
18. **write_file cross-turn failure tracker** — `_writeFailCount` persists across turns. After 2 consecutive failures, injects `[REMINDER: ...]` with tool response + user message. All run counters reset at start.
19. **search_web tool** — added to `NOTE_AGENT_TOOLS`. Proxies through `/api/web-search` server route to avoid CORS. Empty-result guard: after 3 consecutive empty results, returns stop signal.
20. **Web search proxy** — `src/app/api/web-search/route.ts` fetches DuckDuckGo server-side. Parser rewritten with 4 fallback strategies: `result__a/snippet` pairs → `class="result"` divs → `h2.result__title` links → raw snippet extraction.
21. **Exam difficulty guidelines** — skill.md updated with NEET UG, JEE Main, CUET, CBSE/Boards, SAT, AP, IB, GCSE, A-Level difficulty profiles.
22. **Shared Worker persistence** — converted from `Worker` to `SharedWorker` + fallback to DedicatedWorker. On page reconnection, worker sends latest state.
23. **Token-based compaction at 1M** — removed byte-based 220KB and token-based 265K. Compaction fires when `lastPromptTokens > 1_000_000` (for 1M context model).
24. **MCQ count regex fixed** — was `/### Q/` (H3) but template uses `## Q` (H2). This was the root cause of the 100_mcqs.md read loop: assess_quality always returned mcqCount=0, LLM kept re-reading to verify.
25. **Sliding window relaxed** — threshold increased from 8 to 80 messages. No longer aggressively drops context. Compaction at 1M handles context trimming.
26. **All run counters reset at start** — `_writeFailCount`, `_writeFailInjected`, `_emptySearchCount`, `_fullReadCache.clear()` added to start handler.
27. **Subject core.md removed** — Step 2B (Subject Core.md Template) deleted from skill.md. Only chapter-level core.md is generated. Prevents Biology/core.md rewrite loop.
28. **Write-then-assess flow** — skill.md Priority Order restructured: Phase 1 (write all files: core.md → notes → concept map → questions → MCQs → flashcards → quizzes → revision), Phase 2 (assess once at end with detailed=true, fix issues, final_report). No assess_quality during writing phase.
29. **Search_web instruction limited** — skill.md now says "call search_web ONCE. If empty, proceed using your knowledge — do NOT retry."
30. **Vault Creation Order simplified** — no subject folder/core.md creation, only chapter-level files.

### In Progress
- **Opencode-style tool calling** — schema validation, output truncation, execution context all implemented. Permission gating and task tool pending.

### Blocked
- **Web search unreliable** — DuckDuckGo sometimes returns empty results even with the fix. LLM falls back to its own knowledge.
- **write_file content issue** — DeepSeek sometimes generates completely empty tool calls (`Write {}`) with no content in reasoning text either. Auto-fill + reminder + cross-turn detection are mitigations.

## Key Decisions
- **Token-based compaction at 1M** — DeepSeek supports 1M context, so compaction fires near the limit. Removed both byte-based 220KB and earlier 265K token thresholds.
- **Sliding window at 80** — Compaction handles context management; sliding window is just a safety net for extreme message counts. High threshold prevents premature context loss.
- **MCQ regex fix as read-loop root cause** — The assess_quality function counted MCQs with `/### Q/` but the template produces `## Q`. Zero count caused the LLM to re-read the file every turn, creating an infinite read loop. Fixing the regex breaks the loop.
- **No subject core.md** — Prevents the LLM from writing Biology/core.md during Biology chapter generation. Only the chapter core.md is needed for single-chapter work.
- **Write-then-assess pipeline** — Prevents interleaved write/read/assess/fix cycles. All files are generated first, then assessed once. Assessment identifies all issues, then fixes are applied.
- **4-strategy DuckDuckGo parser** — DDG changes HTML structure frequently. Multiple extraction strategies increase resilience. If all fail, the empty-result guard stops retrying after 3 attempts.
- **All run counters reset** — Prevents state leakage between consecutive agent runs. Particularly important for write_file failure tracker and search_web empty counter.

## Critical Context
- **Compaction mechanics** (`agent-worker.ts:1100-1161`): when `lastPromptTokens > 1_000_000`, calls the LLM with a structured compaction prompt (7 sections). Falls back to file-count summary. Preserves last 1 turn as tail. Prunes tool outputs >500 chars. Rebuilds messages as: system + original user + summary + tail.
- **MCQ regex** (`agent-worker.ts:922`): `/## Q\d+\./g` matches `## Q1.` (H2). Template uses `## Q[X].` format. Questions use same H2 pattern. Quizzes use `### Q` (H3) — correct.
- **Default vault** (`vault-data.json`): 31 notes across 4 Physics chapters. Biology notes come from localStorage (`mergeAgentNotes` from prior agent runs).
- **`write_file` handler**: guards against placeholder content and core.md rewrite. Stores in workspace + queues store-only via `queueDocument`.
- **`read_file` handler**: falls back to RAG on placeholder content. Full-read cache with 30s TTL. Compact read cache per-path.
- **`embedSection(section)`**: batch-embeds all null-embedding chunks for a section. Idempotent.
- **RAG context injection**: commented out (disabled). Code kept for future re-enable.
- **Search_web empty guard**: 3 consecutive empty results → stops further search_web calls for the run. Counter resets on any non-empty result.
- **Embedding quota**: 100 req/min, 1000 req/day. Each req embeds up to 10 chunks.
- **Mobile support**: Shared Workers work on Chrome for Android. The app tab must stay open during generation.
- **`delete a.content`**: write_file arguments have content deleted after execution. LLM sees `{"path":"..."}` with no content, preventing copy-chain.

## Relevant Files
- `src/lib/note-agent/agent-worker.ts` — agent loop, compaction (1M token threshold, LLM-powered + tail 1), loop guards, write_file/read_file with placeholder detection, section transition auto-detect, embedSection caller, schema validation + truncation + execution context, search_web handler with empty guard, sliding window (80 threshold), all run counters.
- `src/lib/note-agent/agent-bridge.ts` — creates SharedWorker (fallback to Worker), port-based messaging, handles reconnection, persists state to IndexedDB.
- `src/lib/llm-agent.ts` — `NOTE_AGENT_TOOLS` defines all 7 tools. `getAgentSystemPrompt()` generates system message.
- `public/skills/study-ult/skill.md` — 43KB skill file. Write-once + No-Planning + No Subject Core.md rules. Write-then-assess flow. Search_web limiter. Exam difficulty guidelines.
- `src/app/api/web-search/route.ts` — DuckDuckGo HTML search proxy with 4-strategy parser. Returns title/link/snippet.
- `src/app/api/llm/route.ts` — Edge Runtime, auth check, 500KB payload cap, 32768 max_tokens cap, streaming passthrough.
- `AGENTS.md` — this file full progress log, key decisions, critical context.
