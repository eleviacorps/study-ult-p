/// <reference lib="webworker" />

import { queueDocument, processDocumentQueue, searchDocuments, getDocument, pendingIndexCount, getIndexTelemetry, resetIndexTelemetry } from "./rag-store";

interface ToolDef {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface AgentStep {
  turn: number;
  toolCalls: { name: string; args: Record<string, unknown>; result: string }[];
  response: string;
  phase: string;
}

type AgentConfig = Record<string, never>;

interface StartMessage {
  type: "start";
  config: AgentConfig;
  messages: Record<string, unknown>[];
  tools: ToolDef[];
  vaultNotes: { path: string; content: string }[];
  chapterName: string;
  chapterPath: string;
  examVars: Record<string, string>;
}

interface AbortMessage {
  type: "abort";
}

type WorkerInMessage = StartMessage | AbortMessage;

interface WorkerProgressUpdate {
  type: "progress";
  messages: Record<string, unknown>[];
  steps: AgentStep[];
  turn: number;
}

interface WorkerDoneUpdate {
  type: "done";
  messages: Record<string, unknown>[];
  steps: AgentStep[];
  turn: number;
  workspace: [string, string][];
}

interface WorkerErrorUpdate {
  type: "error";
  error: string;
}

type WorkerOutMessage = WorkerProgressUpdate | WorkerDoneUpdate | WorkerErrorUpdate;

let workspace = new Map<string, string>();
let abortFlag = false;
let ragChapterPath = "";

// ── Loop guards ──
let _parseFailCount = 0;
let _consecutiveSameFile = 0;
let _lastFilePath = "";
let _lastToolName = "";
let _lastToolArgsJsonHash = "";
let _readCache = new Map<string, string>();

const MAX_CONSECUTIVE_PARSE_FAILS = 3;
const MAX_CONSECUTIVE_SAME_ACTION = 4;

// ── Retrieval state tracking — prevents loops and redundant searches ──

let lastRetrievalQuery = "";
let lastRetrievalTurn = -1;
let lastRetrievalHash = "";

function buildRetrievalQuery(chapterName: string, chapterPath: string, turn: number, recentToolCalls: { name: string; args: Record<string, unknown> }[]): string {
  if (turn === 0) return `${chapterName} overview and key concepts`;
  if (turn === lastRetrievalTurn) return lastRetrievalQuery;

  // Build from recent tool activity — not from assistant prose
  const recentPaths: string[] = [];
  const recentTypes = new Set<string>();
  for (const tc of recentToolCalls.slice(-5)) {
    if (tc.name === "write_file") {
      const p = (tc.args.path as string) || "";
      if (p.includes("/notes/")) recentTypes.add("notes");
      else if (p.includes("/questions/")) recentTypes.add("questions");
      else if (p.includes("/flashcards/")) recentTypes.add("flashcards");
      else if (p.includes("/quizzes/")) recentTypes.add("quizzes");
      recentPaths.push(p.split("/").pop()?.replace(".md", "") || "");
    }
  }

  const types = recentTypes.size > 0 ? [...recentTypes].join(", ") : "study materials";
  const topics = recentPaths.slice(-3).join(", ");

  if (topics) return `${chapterName} ${topics} ${types}`;
  return `${chapterName} ${types}`;
}

function retrievalQueryHash(query: string): string {
  return query.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}

// ── Indexing queue processing ──

let lastIndexProcessTurn = -1;

async function processIndexBatch(): Promise<void> {
  const result = await processDocumentQueue();
  if (result.indexed > 0 || result.skipped > 0) {
    console.log(`[Agent] indexed ${result.indexed}/${result.indexed + result.skipped} docs in ${result.timeMs}ms`);
  }
}

// ── Vault seeding ──

async function seedVectorStore(vaultNotes: { path: string; content: string }[], chapterPath: string): Promise<void> {
  const normChapterPath = normalizePath(chapterPath);
  let queuedCount = 0;
  for (const n of vaultNotes) {
    const normPath = normalizePath(n.path);
    // Match by path segment: chapter "Electrostatics" matches "Physics/Electrostatics/notes/x.md"
    // or "Electrostatics/notes/x.md"
    if (normPath.split("/").includes(normChapterPath)) {
      const type = n.path.includes("/questions/") ? "questions" : n.path.includes("/notes/") ? "notes" : "other";
      queueDocument(n.path, n.content, chapterPath, type);
      queuedCount++;
    }
  }
  console.log(`[Agent] seeding vault: ${queuedCount}/${vaultNotes.length} docs match chapter "${chapterPath}"`);

  // Drain the entire queue — process batches until nothing remains
  let stallGuard = 0;
  while (pendingIndexCount() > 0) {
    const result = await processDocumentQueue();
    if (result.indexed === 0 && result.skipped === 0) {
      stallGuard++;
      if (stallGuard >= 3) {
        console.warn(`[Agent] queue drain stalled: ${pendingIndexCount()} items stuck`);
        break;
      }
    } else {
      stallGuard = 0;
    }
  }
  const tel = getIndexTelemetry();
  console.log(`[Agent] seeded ${tel.docsIndexed} vault docs (${tel.chunksIndexed} chunks, ${tel.skippedSameHash} skipped, ${tel.embeddingCalls} embed calls)`);
  resetIndexTelemetry();
}

// ── Structured retrieval injection ──

async function injectRagContext(
  msgs: Record<string, unknown>[],
  chapter: string,
  chapterName: string,
  turn: number,
  recentToolCalls: { name: string; args: Record<string, unknown> }[],
): Promise<void> {
  const query = buildRetrievalQuery(chapterName, chapter, turn, recentToolCalls);
  const qHash = retrievalQueryHash(query);

  // Skip if query is essentially the same as the last one and same turn
  if (qHash === lastRetrievalHash && turn === lastRetrievalTurn) return;

  lastRetrievalQuery = query;
  lastRetrievalHash = qHash;
  lastRetrievalTurn = turn;

  const results = await searchDocuments(query, chapter, 3);
  if (results.length === 0) return;

  const context = results.map((r) => `--- ${r.path} ---\n${r.excerpt}`).join("\n\n");

  const sysMsg = msgs.find((m) => m.role === "system");
  if (sysMsg && typeof sysMsg.content === "string") {
    let base = sysMsg.content;
    base = base.replace(/\n\n\[RAG context\][\s\S]*$/, "");
    sysMsg.content = base + `\n\n[RAG context]\n${context}`;
  }
}

// ── Agent turn ──

async function runAgentTurn(
  messages: Record<string, unknown>[],
  tools: ToolDef[],
  handler: (name: string, args: Record<string, unknown>) => Promise<string>,
  config: AgentConfig,
): Promise<{ newMessages: Record<string, unknown>[]; steps: AgentStep[]; finished: boolean; content: string }> {
  void config;

  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  if (!choice) throw new Error("No response from API");

  const msg = choice.message || {};
  const msgContent = msg.content || "";
  const reasoningContent: string | undefined = msg.reasoning_content;
  const toolCalls: ToolCall[] = msg.tool_calls || [];

  const step: AgentStep = {
    turn: 0,
    toolCalls: [],
    response: msgContent || reasoningContent || "",
    phase: "processing",
  };

  const assistantMsg: Record<string, unknown> = { role: "assistant" };
  assistantMsg.content = msgContent || null;
  if (reasoningContent) assistantMsg.reasoning_content = reasoningContent;
  if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls;

  if (toolCalls.length > 0) {
    const newMsgs = [...messages, assistantMsg];
    for (const tc of toolCalls) {
      if (abortFlag) break;
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        _parseFailCount++;
        if (_parseFailCount >= MAX_CONSECUTIVE_PARSE_FAILS) {
          throw new Error(`Too many malformed tool calls (${_parseFailCount} consecutive parse failures)`);
        }
        const errBody = JSON.stringify({ error: `Invalid JSON in arguments for ${tc.function.name}` });
        step.toolCalls.push({ name: tc.function.name, args: {}, result: errBody });
        newMsgs.push({ role: "tool", tool_call_id: tc.id, content: errBody });
        continue;
      }
      _parseFailCount = 0;
      const result = await handler(tc.function.name, args);
      newMsgs.push({ role: "tool", tool_call_id: tc.id, content: result });
      step.toolCalls.push({ name: tc.function.name, args, result: result.substring(0, 500) });
    }
    // Compact write_file arguments in the assistant message to stop context bloat
    for (const tc2 of toolCalls) {
      if (tc2.function.name !== "write_file") continue;
      try {
        const a = JSON.parse(tc2.function.arguments);
        const content = a.content as string;
        const excerpt = (content || "").replace(/\n/g, " ").substring(0, 150).trim();
        a.content = `[FILE STORED — path: ${a.path}, bytes: ${(content || "").length}, excerpt: ${excerpt}...]`;
        tc2.function.arguments = JSON.stringify(a);
      } catch { /* leave as-is if compact fails */ }
    }
    return { newMessages: newMsgs, steps: [step], finished: false, content: step.response };
  }

  return {
    newMessages: [...messages, assistantMsg],
    steps: [step],
    finished: true,
    content: step.response,
  };
}

// ── Tool handler ──

async function toolHandler(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "write_file": {
      const path = args.path as string;
      const content = args.content as string;
      workspace.set(path, content);
      _readCache.delete(path); // invalidate cached read
      const type = path.includes("/questions/") ? "questions" : path.includes("/notes/") ? "notes" : path.includes("/flashcards/") ? "flashcards" : path.includes("/quizzes/") ? "quizzes" : path.includes("/revision/") ? "revision" : "other";
      // Queue for batch indexing — does NOT block the agent
      queueDocument(path, content, ragChapterPath, type);
      return JSON.stringify({ success: true, path, bytes: content.length });
    }

    case "read_file": {
      const path = args.path as string;
      const needsFull = args.full === true;

      // Per-path read cache — avoid re-reading same file repeatedly
      const cached = _readCache.get(path);
      if (cached !== undefined && !needsFull) return cached;

      let content = workspace.get(path);
      if (!content) {
        // Fallback: try RAG (files indexed but not in current workspace)
        try {
          const ragContent = await getDocument(path);
          if (ragContent) {
            workspace.set(path, ragContent);
            content = ragContent;
          }
        } catch { /* ignore */ }
      }

      if (content) {
        let result: string;
        if (needsFull) {
          result = JSON.stringify({ path, content, size: content.length });
        } else {
          const excerpt = content.replace(/\n/g, " ").substring(0, 300).trim();
          result = JSON.stringify({ path, size: content.length, excerpt, mode: "compact" });
          _readCache.set(path, result);
        }
        return result;
      }

      return JSON.stringify({ error: "File not found", path });
    }

    case "list_workspace": {
      const entries = Array.from(workspace.keys()).map((p) => ({
        name: p,
        type: p.includes("/") ? "file" : "directory",
      }));
      return JSON.stringify({ entries });
    }

    case "assess_quality": {
      const chapterPath = (args.chapterPath as string) || "";
      const detailed = args.detailed === true;
      const allFiles = Array.from(workspace.keys()).filter((p) => p.endsWith(".md"));
      const chapterFiles = allFiles.filter((p) => p.startsWith(chapterPath));
      const summary: Record<string, unknown> = { chapter: chapterPath, mode: detailed ? "detailed" : "compact" };

      const coreMd = workspace.get(`${chapterPath}/core.md`);
      if (coreMd) {
        const topicLinks = [...coreMd.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
        summary.topicsInCore = topicLinks.length;
        if (detailed) summary.topicsList = topicLinks;
      } else {
        summary.topicsInCore = 0;
        summary.missingCore = true;
      }

      const noteFiles = chapterFiles.filter((p) => p.includes("/notes/"));
      summary.noteCount = noteFiles.length;
      const notesShort: { path: string; lines: number }[] = [];
      for (const nf of noteFiles) {
        const content = workspace.get(nf) || "";
        const lines = content.split("\n").length;
        if (lines < 400) notesShort.push({ path: nf, lines });
      }
      if (detailed) summary.notesShort = notesShort.slice(0, 10);
      summary.notesShortCount = notesShort.length;

      const PLACEHOLDER_PATTERNS = [
        /coming\s+soon/i, /add\s+more/i, /todo/i,
        /placeholder/i, /\(\+?\d+\s*questions?\s*more?\)/i, /more\s+questions?/i,
      ];
      const placeholders: { file: string; line: number; text: string }[] = [];
      for (const f of chapterFiles) {
        const content = workspace.get(f) || "";
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          for (const pat of PLACEHOLDER_PATTERNS) {
            if (pat.test(lines[i]) && lines[i].trim()) {
              placeholders.push({ file: f, line: i + 1, text: lines[i].trim().substring(0, 80) });
              break;
            }
          }
        }
      }
      if (detailed) summary.placeholders = placeholders.slice(0, 20);
      summary.placeholderCount = placeholders.length;

      const readCount = (file: string, pattern: RegExp): number => {
        const c = workspace.get(file) || "";
        return (c.match(pattern) || []).length;
      };
      const qCount = readCount(`${chapterPath}/questions/100_questions.md`, /## Q\d+\./g);
      const mcqCount = readCount(`${chapterPath}/questions/100_mcqs.md`, /### Q\d+\./g);
      const flashCount = readCount(`${chapterPath}/flashcards/100_flashcards.md`, /## FC\d+\./g);
      const quizCount = readCount(`${chapterPath}/quizzes/100_quizzes.md`, /### Q\d+\./g);
      summary.questionCount = qCount;
      summary.questionCountOk = qCount >= 100;
      summary.mcqCount = mcqCount;
      summary.mcqCountOk = mcqCount >= 100;
      summary.flashcardCount = flashCount;
      summary.flashcardCountOk = flashCount >= 100;
      summary.quizCount = quizCount;
      summary.quizCountOk = quizCount >= 100;

      const brokenLinks: string[] = [];
      const existingPaths = new Set(chapterFiles);
      for (const f of chapterFiles) {
        const content = workspace.get(f) || "";
        const links = [...content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
        for (const link of links) {
          if (link.includes("/") && !link.endsWith(".md")) {
            const targetMd = `${link}.md`;
            if (!existingPaths.has(targetMd) && !existingPaths.has(link)) {
              brokenLinks.push(`${f} → [[${link}]]`);
            }
          }
        }
      }
      if (detailed) summary.brokenWikilinks = brokenLinks.slice(0, 20);
      summary.brokenLinkCount = brokenLinks.length;

      let hasCallouts = false, hasLatex = false, hasTables = false;
      for (const f of chapterFiles) {
        const content = workspace.get(f) || "";
        if (/\[![\w-]+\]/.test(content)) hasCallouts = true;
        if (/\$\$/.test(content)) hasLatex = true;
        if (/\|.*\|.*\|/.test(content)) hasTables = true;
      }
      summary.formatting = { callouts: hasCallouts, latex: hasLatex, tables: hasTables };

      const issues: string[] = [];
      if (notesShort.length > 0) issues.push(`${notesShort.length} notes under 400 lines`);
      if (placeholders.length > 0) issues.push(`${placeholders.length} placeholder texts found`);
      if (!summary.questionCountOk) issues.push(`Questions: ${summary.questionCount}/100`);
      if (!summary.mcqCountOk) issues.push(`MCQs: ${summary.mcqCount}/100`);
      if (!summary.flashcardCountOk) issues.push(`Flashcards: ${summary.flashcardCount}/100`);
      if (!summary.quizCountOk) issues.push(`Quizzes: ${summary.quizCount}/100`);
      if (brokenLinks.length > 0) issues.push(`${brokenLinks.length} broken wikilinks`);
      summary.issues = issues.slice(0, detailed ? 50 : 10);
      summary.totalIssues = issues.length;
      summary.passed = issues.length === 0;

      return JSON.stringify(summary);
    }

    case "final_report":
      return JSON.stringify({ type: "final_report", ...args });

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

// ── Main loop ──

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  if (msg.type === "abort") {
    abortFlag = true;
    return;
  }

  if (msg.type !== "start") return;

  abortFlag = false;

  const { config, messages: initialMessages, tools, vaultNotes, chapterName, chapterPath } = msg;

  // Seed workspace with vault notes for reference
  workspace = new Map<string, string>();
  for (const n of vaultNotes) {
    workspace.set(n.path, n.content);
  }

  ragChapterPath = chapterPath;

  // Reset loop guards for this run
  _parseFailCount = 0;
  _consecutiveSameFile = 0;
  _lastFilePath = "";
  _lastToolName = "";
  _lastToolArgsJsonHash = "";
  _readCache.clear();

  const MAX_TURNS = 150;
  const messages = structuredClone(initialMessages);
  let currentTurn = 0;

  // Seed vault documents into RAG (batched, non-blocking after this)
  console.log("[Agent] seeding vault into RAG...");
  await seedVectorStore(vaultNotes, chapterPath);

  // Track all tool calls across the run for query construction
  const allToolCalls: { turn: number; name: string; args: Record<string, unknown> }[] = [];

  function getChapterFiles(): [string, string][] {
    const files: [string, string][] = [];
    for (const [path, content] of workspace.entries()) {
      if (path.startsWith(chapterPath) && path.endsWith(".md")) {
        files.push([path, content]);
      }
    }
    return files;
  }

  while (currentTurn < MAX_TURNS) {
    if (abortFlag) {
      // Flush any pending index writes before finishing
      await processIndexBatch();
      self.postMessage({ type: "done", messages, steps: [], turn: currentTurn, workspace: getChapterFiles() } );
      return;
    }

    // Build retrieval query from structured state, not assistant prose
    await injectRagContext(messages, chapterPath, chapterName, currentTurn, allToolCalls);

    // Payload budget check — reject oversized conversations before sending to LLM
    const payloadEstimate = JSON.stringify({ messages, tools }).length;
    if (payloadEstimate > 200_000) {
      console.warn(`[Agent] Payload ${(payloadEstimate / 1024).toFixed(0)}KB exceeds 200KB budget, forcing window truncation`);
      const truncated = [messages[0], messages[1], ...messages.slice(-4)];
      messages.length = 0;
      messages.push(...truncated);
    }

    try {
      const result = await runAgentTurn(messages, tools, toolHandler, config);
      messages.length = 0;
      messages.push(...result.newMessages);

      // Track tool calls for query construction + loop detection
      const thisTurnCalls = result.steps.flatMap((s) => s.toolCalls);
      for (const tc of thisTurnCalls) {
        allToolCalls.push({ turn: currentTurn, name: tc.name, args: tc.args });
      }

      // Detect repeated actions on the same file
      for (const tc of thisTurnCalls) {
        if (tc.name === "read_file" || tc.name === "write_file") {
          const path = (tc.args.path as string) || "";
          if (path && path === _lastFilePath && tc.name === _lastToolName) {
            _consecutiveSameFile++;
            if (_consecutiveSameFile >= MAX_CONSECUTIVE_SAME_ACTION) {
              throw new Error(`Loop detected: repeated "${tc.name}" on "${path}" ${_consecutiveSameFile + 1} consecutive times`);
            }
          } else if (path) {
            _consecutiveSameFile = 0;
            _lastFilePath = path;
            _lastToolName = tc.name;
          }
        }
      }

      // Telemetry: log turn info with payload size
      const turnPayloadKB = Math.round(JSON.stringify({ messages }).length / 1024);
      console.log(`[Agent] Turn ${currentTurn}: ${thisTurnCalls.length} tool calls, ${messages.length} msgs (~${turnPayloadKB}KB), ${pendingIndexCount()} pending queue`);

      if (result.finished) {
        // Flush pending index writes before finishing
        await processIndexBatch();
        const tel = getIndexTelemetry();
        console.log(`[Agent] done — ${tel.docsIndexed} docs, ${tel.chunksIndexed} chunks, ${tel.embeddingCalls} embed calls, ${tel.searchCalls} searches (${tel.cacheHits} cache hits, ${tel.cacheMisses} misses)`);
        self.postMessage({ type: "done", messages, steps: result.steps, turn: currentTurn + 1, workspace: getChapterFiles() } );
        return;
      }

      currentTurn++;

      // Sliding window: preserve complete tool_call↔tool chains
      if (messages.length > 8) {
        const tail: Record<string, unknown>[] = [];
        let pendingTools = 0;
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          tail.unshift(m);
          if (m.role === "tool") {
            pendingTools++;
          } else if (m.role === "assistant" && m.tool_calls) {
            const tc = (m.tool_calls as unknown[]).length;
            pendingTools = Math.max(0, pendingTools - tc);
          }
          if (tail.length >= 6 && pendingTools === 0 && m.role !== "tool") break;
        }
        messages.length = 0;
        messages.push(initialMessages[0], initialMessages[1], ...tail);
      }

      // Process pending index writes every 5 turns (batched)
      if (currentTurn % 5 === 0 || pendingIndexCount() > 20) {
        await processIndexBatch();
      }

      self.postMessage({ type: "progress", messages, steps: result.steps, turn: currentTurn } satisfies WorkerProgressUpdate);

      if (!result.content || !result.steps.some((s) => s.toolCalls.length > 0)) {
        // Track consecutive idle turns (no tool calls, no content)
        _consecutiveSameFile++;
        if (_consecutiveSameFile >= MAX_CONSECUTIVE_SAME_ACTION) {
          throw new Error(`Loop detected: ${MAX_CONSECUTIVE_SAME_ACTION} consecutive idle turns (no tool calls or content)`);
        }
        messages.push({
          role: "user",
          content: "Continue the work. If you are completely done with all tasks (notes, questions, flashcards, quizzes, revision, verification, placeholders), call the final_report tool with a summary.",
        });
      }
    } catch (err: any) {
      // Attempt to flush index queue even on error
      await processIndexBatch();
      self.postMessage({ type: "error", error: err.message } satisfies WorkerErrorUpdate);
      return;
    }
  }

  // Flush remaining index writes
  await processIndexBatch();

  // Max turns reached
  const fileList: [string, string][] = [];
  for (const [path, content] of workspace.entries()) {
    if (path.startsWith(chapterPath) && path.endsWith(".md")) {
      fileList.push([path, content]);
    }
  }
  self.postMessage({ type: "done", messages, steps: [], turn: currentTurn, workspace: fileList } );
};
