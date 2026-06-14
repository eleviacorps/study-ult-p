# Architect Plan — Fix Truncation Loop (Append-Based Chunking)

> Story: Fix truncation loop in note agent system | Task type: BACKEND | Generated: 2026-06-14

## Overview

The root cause is a mismatch between the truncation recovery instruction ("the engine will append it") and `write_file`'s actual behavior (`workspace.set(path, content)` — full overwrite). The fix adds a proper `append` parameter to `write_file` so the handler can concatenate chunks. The truncation recovery saves partial content to workspace before firing the continuation prompt and instructs the model to use `append: true` for subsequent chunks. The system prompt is updated to teach the model to proactively chunk large files.

## Task Type Confirmed

BACKEND

## Files to Create

None. All changes are modifications to existing files.

## Files to Modify

| File path | What changes |
| --------- | ------------ |
| `src/lib/note-agent/agent-engine.ts` | 1) Add `append` to `TOOL_SCHEMAS.write_file`; 2) Update write_file handler to honor `append` (concatenation, skip guards); 3) Fix truncation recovery to save partial content to workspace; 4) Update the loop-detection skip guard for appends |
| `src/lib/llm-agent.ts` | 1) Add `append` param to `NOTE_AGENT_TOOLS` write_file definition; 2) Update system prompt to teach model proactive chunking with `append: true` |

## Implementation Steps

### Step 1 — Add `append` to TOOL_SCHEMAS in `agent-engine.ts`

**File:** `src/lib/note-agent/agent-engine.ts`
**Lines:** 33-36
**Action:** Add `append` (optional boolean) to the `write_file` schema properties. Remove `append` from `required` since it's optional (defaults to `false`).

**Change:**
```
// OLD (line 33-36):
write_file: {
  properties: { path: { type: "string" }, content: { type: "string" } },
  required: ["path", "content"],
},

// NEW:
write_file: {
  properties: { path: { type: "string" }, content: { type: "string" }, append: { type: "boolean" } },
  required: ["path", "content"],
},
```

**Why:** `TOOL_SCHEMAS` drives both `validateToolArgs` and `formatToolError`. Adding `append` here ensures validation doesn't reject the new parameter. Keeping it out of `required` means existing callers that omit `append` still work (defaults to `false`).

---

### Step 2 — Add `append` to NOTE_AGENT_TOOLS in `llm-agent.ts`

**File:** `src/lib/llm-agent.ts`
**Lines:** 140-150
**Action:** Add `append` parameter to the write_file tool definition in `NOTE_AGENT_TOOLS`.

**Change:**
```
// OLD (line 141-147):
name: "write_file",
description: "Create a NEW file, or CONTINUE writing if the existing content was truncated. If the file already exists and the new content is longer, it will be replaced (continuation after truncation). BOTH parameters 'path' AND 'content' are ALWAYS required.",
parameters: {
  type: "object",
  properties: {
    path: { type: "string", description: "File path (e.g. 'Electrostatics/notes/gauss_law.md'). MANDATORY — you MUST include this." },
    content: { type: "string", description: "Full file content in markdown. MANDATORY — you MUST include this." },
  },
  required: ["path", "content"],
},

// NEW:
name: "write_file",
description: "Create a NEW file, or APPEND to an existing file after a truncation. Use 'append: true' when continuing a file whose content was cut off by the token limit. BOTH parameters 'path' AND 'content' are ALWAYS required. When append is true the new content is concatenated to the existing content.",
parameters: {
  type: "object",
  properties: {
    path: { type: "string", description: "File path (e.g. 'Electrostatics/notes/gauss_law.md'). MANDATORY — you MUST include this." },
    content: { type: "string", description: "File content in markdown. For 'append: true', this is the NEXT CHUNK to add. For new files, this is the complete initial content. MANDATORY — you MUST include this." },
    append: { type: "boolean", description: "Set to true when continuing a file after truncation. The new content will be appended to the existing content. When true, the degradation guard is skipped. Default: false." },
  },
  required: ["path", "content"],
},
```

---

### Step 3 — Update write_file handler to honor `append`

**File:** `src/lib/note-agent/agent-engine.ts`
**Lines:** 498-568 (the `write_file` case inside `makeToolHandler`)
**Action:** 
1. Extract `append` from args at the top of the case
2. When `append: true` and file exists, concatenate content — do NOT check the degradation guard or same-size-class rewrite guard
3. When `append: true` and file does NOT exist, treat it as a fresh write (create the file with just this content)
4. Include `append` in the success response so the agent knows the mode used

**Change — replace the entire `write_file` case (lines 498-568):**

```
case "write_file": {
  const path = args.path as string;
  const content = args.content as string | undefined;
  const appendMode = args.append === true;
  if (!content) return JSON.stringify({ error: "Missing content", path });
  if (content.startsWith("[FILE STORED —")) {
    return JSON.stringify({ error: "Cannot write placeholder as content", path });
  }
  
  const existing = workspace.get(path);
  
  // ── APPEND MODE ──
  if (appendMode) {
    if (existing) {
      // Concatenate: preserve existing content, add new content
      const separator = existing.endsWith("\n") ? "" : "\n";
      workspace.set(path, existing + separator + content);
    } else {
      // File doesn't exist yet — this is the first chunk
      workspace.set(path, content);
    }
    _readCache.delete(path);
    _fullReadCache.delete(path);
    const finalContent = workspace.get(path) || content;
    return JSON.stringify({
      success: true,
      path,
      append: true,
      bytes: finalContent.length,
      lines: finalContent.split("\n").length,
      totalLines: finalContent.split("\n").length,
      _note: "Content appended successfully. Continue with the NEXT chunk if more content remains, or proceed to the next file.",
    });
  }
  
  // ── NORMAL (OVERWRITE) MODE — existing guards apply ──
  if (existing) {
    const newStartsWithHeading = /^#{1,6}\s/m.test(content);
    const existingStartsWithHeading = /^#{1,6}\s/m.test(existing);
    const sameContent = content === existing;
    // Block exact duplicates
    if (sameContent) {
      return JSON.stringify({ error: `Identical content already in workspace: "${path}". File is unchanged.`, path });
    }
    // Block degradation: new content is shorter AND existing is already
    // a good note (has heading, 1500+ bytes) AND new doesn't have a heading
    if (!newStartsWithHeading && existingStartsWithHeading && existing.length >= 1500 && content.length < existing.length) {
      return JSON.stringify({ error: `File already exists with good content (${existing.length} bytes, ${existing.split("\n").length} lines): "${path}". Use read_file to inspect it.`, path });
    }
    // Same-size-class rewrite guard: skip ONLY when append === true
    const existingLines = existing.split("\n").length;
    const newLines = content.split("\n").length;
    if (existingStartsWithHeading && existingLines >= 300 && newLines < existingLines * 1.2) {
      return JSON.stringify({
        error: `File already exists with ${existingLines} lines. New content (${newLines} lines) is not a significant improvement. Move to the next file.`,
        path,
        existing_lines: existingLines,
        suggestion: "If you need to add more content, use read_file first to see what exists, then write a version at least 20% longer. Otherwise proceed to the next topic.",
      });
    }
    // Otherwise allow: this handles corrupted files, short existing,
    // continuation chunks, and longer replacement notes.
  }
  workspace.set(path, content);
  _readCache.delete(path);
  _fullReadCache.delete(path);
  return JSON.stringify({
    success: true,
    path,
    append: false,
    bytes: content.length,
    lines: content.split("\n").length,
    overwrite: !!existing,
  });
}
```

**Key design decisions:**
- The append mode block comes BEFORE the normal mode, returning early. This avoids any guard interaction.
- For append mode when file exists, we add a `\n` separator only if the existing content doesn't already end with one — prevents double-spacing or merged lines.
- The success response includes `totalLines` so the agent knows the accumulated size.
- The append mode success includes `_note` instructing the model to continue if more content remains.

---

### Step 4 — Fix the truncation recovery to save partial content

**File:** `src/lib/note-agent/agent-engine.ts`
**Lines:** 395-426 (the truncated tool call recovery block inside `runAgentTurnInner`)
**Action:** 
1. Extract partial arguments from `truncatedToolInfo` for `write_file` calls
2. Try to extract partial `content` from the truncated JSON arguments
3. Save the partial content to workspace via the handler directly (which requires the handler function)
4. Update the instruction to use `append: true`

**Dependency:** This step requires Step 3 (the handler now supports `append`). The handler function is the `handler` parameter of `runAgentTurnInner`.

**Change — replace the block at lines 395-426:**

```
if (truncated && toolCalls.length === 0) {
  // Extract partial path and content from truncated write_file calls
  let truncatedPath = "";
  let truncatedToolName = "";
  let partialContent = "";
  if (truncatedToolInfo?.partialArgs) {
    const pathMatch = truncatedToolInfo.partialArgs.match(/"path"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (pathMatch) truncatedPath = pathMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    
    // Extract partial content from truncated JSON
    // Try to find a "content" key with a string value (may be cut off mid-string)
    const contentMatch = truncatedToolInfo.partialArgs.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)$/);
    if (contentMatch) {
      partialContent = contentMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
    
    truncatedToolName = truncatedToolInfo.name || "";
  }

  // SAVE partial content to workspace BEFORE telling the agent to continue
  // This way, if the agent's next write_file also truncates, the first chunk
  // is already persisted and won't be lost.
  let partialSaved = false;
  if (truncatedToolName === "write_file" && truncatedPath && partialContent) {
    try {
      // Use the handler directly to save partial content
      const saveResult = await handler("write_file", { path: truncatedPath, content: partialContent });
      const parsed = JSON.parse(saveResult);
      partialSaved = parsed.success === true;
    } catch {
      // If saving partial content fails, proceed without it —
      // the continuation prompt will still tell the agent to retry.
    }
  }

  let hint = "";
  if (truncatedToolName === "write_file" && truncatedPath) {
    if (partialSaved) {
      hint = ` The file "${truncatedPath}" was partially written (saved ${partialContent.length} bytes). Call write_file again with append=true, the SAME path, and the NEXT CHUNK of content continuing from where you left off. Do NOT repeat content already written.`;
    } else {
      hint = ` The file "${truncatedPath}" was partially written. Call write_file again with append=true, the SAME path, and the NEXT CHUNK of content starting from where you left off — the engine will append it. Do NOT start the file over from the beginning.`;
    }
  } else if (truncatedToolInfo) {
    hint = ` The ${truncatedToolInfo.name} tool call was cut off. Retry with the complete arguments.`;
  }

  const continuation: Record<string, unknown> = {
    role: "user",
    content: `[Output exceeded token limit. Continue immediately with your next action — do NOT explain, plan, or recap. Just output the next tool call.]${hint}`,
  };
  // FIX Bug 9: a truncation is not an idle turn. Return a non-empty content
  // marker so the idle-turn counter is not incremented.
  return { newMessages: [...messages, continuation], steps: [], finished: false, content: "(truncated — continuing)", usage };
}
```

**Why this matters:** Previously, the partial content was never saved. Only the instruction was given. If the next `write_file` also truncated, the agent would start each attempt with no saved progress, creating an infinite loop.

---

### Step 5 — Update system prompt to teach proactive chunking

**File:** `src/lib/llm-agent.ts`
**Lines:** 290-333 (the `getAgentSystemPrompt` function)
**Action:** Add instructions about chunking large files with `append: true`.

**Change — append to the RULES section (before the closing backtick at line 332):**

```
=== CHUNKING LARGE FILES ===
- If a file would be very long (400+ lines), write it in chunks:
  1. write_file(path="...", content="first ~150 lines", append=false)
  2. write_file(path="...", content="next ~150 lines", append=true)
  3. write_file(path="...", content="remaining lines", append=true)
- This prevents truncation from the 65536 max_tokens limit.
- If you receive a truncation notice, use append=true to continue the file.
- Do NOT restart a file from scratch after receiving a truncation notice.
```

Also update the existing note in the WORKFLOW OVERVIEW about `write_file` (line 299):

**Change — line 299:**
```
// OLD:
- write_file now handles both NEW files and CONTINUATIONS after truncation. If the file exists and your new content is longer, it replaces the truncated version.

// NEW:
- write_file supports 'append: true' for continuing truncated files. For large files (400+ lines), proactively write in ~150-line chunks using append=true for chunks after the first. When 'append: true', the new content is concatenated to existing content instead of replacing it.
```

---

### Step 6 — Optional: adjust the loop-detection skip for `append` writes

**File:** `src/lib/note-agent/agent-engine.ts`
**Lines:** 1101-1128 (loop detection in `runAgentEngine`)
**Action:** When `append: true` writes are detected, allow more consecutive same-path writes since the chunking pattern is expected to produce 3-4 consecutive `write_file` calls on the same path.

**Change — after line 1101, add an early reset when the write includes `append: true`:**

```
for (const tc of thisTurnCalls) {
  if (tc.name === "read_file" || tc.name === "write_file") {
    const path = (tc.args.path as string) || "";
    // Append-mode writes are expected to be chained (chunking pattern)
    if (tc.name === "write_file" && tc.args.append === true) {
      consecutiveSameFile = 0;
      if (path) {
        lastFilePath = path;
        lastToolName = tc.name;
      }
      continue; // skip loop detection for appends
    }
    if (path && path === lastFilePath && tc.name === lastToolName) {
      // ... rest of existing loop detection
```

**Why:** Without this, the chunking pattern (write → write with append → write with append on same path) would trip `MAX_CONSECUTIVE_SAME_ACTION` after 3 writes. Since append-mode writes are intentionally sequential, they should be exempt from loop detection.

---

## Data Flow

```
1. Agent decides to write a 400+ line note
   │
   ├─ [BEFORE FIX] Tries all 400 lines in 1 write_file → hits 65536 max_tokens
   │  → truncation recovery says "engine will append"
   │  → agent retries all 400 lines from scratch → hits limit again → LOOP
   │
   └─ [AFTER FIX] Agent writes first ~150 lines with append=false
      → success
      → Agent writes next ~150 lines with append=true, same path
      → Handler concatenates: workspace.set(path, existing + "\n" + chunk)
      → Agent writes remaining lines with append=true
      → Handler concatenates again → complete file in workspace

2. If any single chunk still truncates:
   → parseStreamingResponse detects finish_reason="length"
   → truncatedToolInfo contains partial JSON args
   → Handler saves partial content to workspace via handler("write_file", {path, content})
   → Continuation prompt tells agent "append=true, NEXT CHUNK only"
   → Agent retries with only the remaining content, append=true
   → No loop because partial content was already persisted
```

## Test Plan

### Unit tests (conceptual — run via `node --test` or Jest):

1. **TOOL_SCHEMAS validation:** Verify `validateToolArgs("write_file", {path, content})` returns `null` (valid). Verify `validateToolArgs("write_file", {path, content, append: true})` returns `null` (valid with append). Verify `validateToolArgs("write_file", {path: "/x.md"})` returns error (missing content).

2. **write_file handler — append mode:** Call handler with `{path: "test.md", content: "part1", append: false}`, verify workspace has "part1". Call with `{path: "test.md", content: "part2", append: true}`, verify workspace has "part1\npart2". Call with `{path: "test.md", content: "part3", append: true}`, verify workspace has "part1\npart2\npart3".

3. **write_file handler — append to nonexistent file:** Call with `{path: "new.md", content: "first", append: true}`, verify workspace has "first" (treated as first chunk).

4. **write_file handler — append skips guards:** Existing file has 350 lines with heading. Call with `append: true, content: "extra\n"`. Verify it succeeds (guard at line 540 would normally reject a 2-line append to a 350-line file, but append mode skips it).

5. **Truncation recovery — partial content saved:** Simulate `truncatedToolInfo` with `{name: "write_file", partialArgs: '{"path": "test.md", "content": "partial'}`. Verify handler is called with `{path: "test.md", content: "partial"}` and workspace has "partial".

6. **Loop detection — append mode exempt:** simulate 4 consecutive `write_file` calls on same path with `append: true`. Verify no loop error thrown.

### Integration tests:

1. **End-to-end chunking test:** Send a messages array where the agent's first response contains a write_file call with 500+ lines of content. Verify the parseStreamingResponse detects truncation, saves partial content, fires continuation prompt with `append: true` instruction, and the next turn appends correctly.

2. **Guard bypass test:** Workspace has an existing 350-line file with heading. Send write_file call with `append: true` and a 2-line chunk. Verify the handler accepts it (does not return degradation error).

### Edge cases to test:

- Append to file that doesn't end in `\n` — verify proper separator
- Multiple append chunks (3+ consecutive) — verify all concatenated
- Empty content with `append: true` — should be rejected (missing content)
- `append: true` with no existing file — treated as first chunk
- Truncation recovery where partial JSON has no `"content"` key — should still fire hint without saving partial
- Loop detection sees mixed `append: true` and `append: false` calls on same path — only non-append should trigger loop detection

## Architecture Notes

**No deviations from standard patterns.** All changes follow existing code conventions:
- Schema validation via `TOOL_SCHEMAS` (existing pattern)
- Tool definitions via `NOTE_AGENT_TOOLS` (existing pattern)
- Handler pattern via `makeToolHandler` switch-case (existing pattern)
- Recovery via `runAgentTurnInner` truncation block (existing pattern, just enhanced)

**Known risks:**
1. **Partial JSON extraction is fragile.** The regex `/"content"\s*:\s*"((?:[^"\\]|\\.)*)$` depends on the truncation happening mid-string-value for `content`. If the truncation happens earlier (e.g., mid-`path` value), `partialContent` will be empty and the save will be skipped gracefully. The `if (partialContent)` guard handles this.
2. **DeepSeek may still ignore `append: true`.** The truncation recovery hints and system prompt both instruct it, but if DeepSeek ignores the instruction, the loop detection (Step 6) at MAX_CONSECUTIVE_SAME_ACTION will still terminate the run.
3. **The append separator assumes a newline.** If the existing content ends with `\n` and the new chunk starts with a heading, this works correctly. If the existing content ends mid-sentence (rare — most chunks are markdown sections), the `\n` separator still produces valid output.

**Performance considerations:**
- Appends use string concatenation — for 3-4 chunks at ~150 lines each, this is negligible (< 100KB total per file)
- The workspace Map stores whole content anyway, so concatenation doesn't change memory characteristics
- The partial save during truncation is a single write to workspace — no performance concern

## Security Checklist

- [x] No hardcoded secrets or credentials — no changes touch auth or secrets
- [x] Input validation implemented at system boundaries — `validateToolArgs` already validates `append` as optional boolean
- [x] Auth/permission checks in place — no changes to `/api/llm/route.ts` auth
- [x] No sensitive data logged — all changes use the existing logging pattern

## Definition of Done

- [ ] Step 1: `TOOL_SCHEMAS.write_file` has `append: boolean` property (optional)
- [ ] Step 2: `NOTE_AGENT_TOOLS` write_file has `append` parameter in schema and updated description
- [ ] Step 3: write_file handler honors `append: true` — concatenates, skips guards, returns correct response
- [ ] Step 4: Truncation recovery saves partial content to workspace before continuation prompt
- [ ] Step 5: System prompt teaches proactive chunking with `append: true`
- [ ] Step 6: Loop detection exempts `append: true` writes from same-path tracking
- [ ] All tests from test plan written and passing
- [ ] No TODOs, commented-out code, or debug logs
- [ ] Code follows all rules in AGENTS.md
- [ ] Security checklist passed
