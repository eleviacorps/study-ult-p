import type { AgentStep, AgentConfig, ToolDef } from "@/lib/llm-agent";

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export class AgentAbortError extends Error {
  constructor() { super("Aborted"); this.name = "AgentAbortError"; }
}

export interface AgentEngineCallbacks {
  onProgress: (state: { messages: Record<string, unknown>[]; steps: AgentStep[]; turn: number }) => void;
  onDone: (state: { messages: Record<string, unknown>[]; steps: AgentStep[]; turn: number; workspace: [string, string][] }) => void;
  onError: (error: string) => void;
  isAborted: () => boolean;
}

export interface AgentEngineParams {
  config: AgentConfig;
  messages: Record<string, unknown>[];
  tools: ToolDef[];
  vaultNotes: { path: string; content: string }[];
  chapterName: string;
  chapterPath: string;
  callbacks: AgentEngineCallbacks;
}

// ── Schema validation (opencode-style) ──

const TOOL_SCHEMAS: Record<string, { properties: Record<string, { type: string; description?: string }>; required: string[] }> = {
  write_file: {
    properties: { path: { type: "string" }, content: { type: "string" } },
    required: ["path", "content"],
  },
  read_file: {
    properties: { path: { type: "string" }, full: { type: "boolean" } },
    required: ["path"],
  },
  list_workspace: {
    properties: {},
    required: [],
  },
  assess_quality: {
    properties: { chapterPath: { type: "string" }, detailed: { type: "boolean" } },
    required: ["chapterPath"],
  },
  final_report: {
    properties: { summary: { type: "string" }, filesCreated: { type: "array" }, filesModified: { type: "array" }, issuesFixed: { type: "array" } },
    required: ["summary", "filesCreated", "filesModified", "issuesFixed"],
  },
  search_web: {
    properties: { query: { type: "string" } },
    required: ["query"],
  },
  neet_bank_search: {
    properties: { subject: { type: "string" }, chapter: { type: "string" }, year: { type: "string" }, limit: { type: "number" }, random: { type: "boolean" } },
    required: ["subject", "chapter"],
  },
};

const MAX_TOOL_RESULT_BYTES = 50 * 1024;
const MAX_CONSECUTIVE_PARSE_FAILS = 3;
const MAX_WRITE_FAILS = 2;
const MAX_CONSECUTIVE_SAME_ACTION = 3;
const COMPACTION_TAIL_TURNS = 1;
const MAX_TURNS = 150;
const FULL_READ_CACHE_TTL = 30_000;

function validateToolArgs(name: string, args: Record<string, unknown>): string | null {
  const schema = TOOL_SCHEMAS[name];
  if (!schema) return null;
  for (const field of schema.required) {
    if (args[field] === undefined || args[field] === null) {
      return `Missing required parameter "${field}" for ${name}`;
    }
  }
  for (const [key, def] of Object.entries(schema.properties)) {
    if (args[key] === undefined) continue;
    if (def.type === "string" && typeof args[key] !== "string") {
      return `Parameter "${key}" for ${name} must be a string, got ${typeof args[key]}`;
    }
    if (def.type === "boolean" && typeof args[key] !== "boolean") {
      return `Parameter "${key}" for ${name} must be boolean, got ${typeof args[key]}`;
    }
    if (def.type === "array" && !Array.isArray(args[key])) {
      return `Parameter "${key}" for ${name} must be an array, got ${typeof args[key]}`;
    }
  }
  return null;
}

function formatToolError(name: string, detail: string): string {
  const schema = TOOL_SCHEMAS[name];
  let msg = `The ${name} tool was called with invalid arguments: ${detail}.\n`;
  if (schema) {
    const params = Object.entries(schema.properties)
      .map(([k, v]) => `  "${k}" (${v.type})${schema.required.includes(k) ? " — required" : " — optional"}`)
      .join("\n");
    msg += `Expected parameters:\n${params}\n`;
  }
  msg += "Please rewrite the input so it satisfies the expected schema.";
  return JSON.stringify({ error: msg, _hint: "fix_args" });
}

function truncateToolResult(result: string): string {
  if (result.length <= MAX_TOOL_RESULT_BYTES) return result;
  return result.substring(0, MAX_TOOL_RESULT_BYTES) + `\n... [truncated at ${MAX_TOOL_RESULT_BYTES} bytes; full content in workspace]`;
}

function autoFillWriteFileArgs(args: Record<string, unknown>, msgContent: string, reasoningContent: string | undefined): boolean {
  const text = reasoningContent || msgContent || "";
  if (!text) return false;
  let filled = false;
  if (!args.path && !args.content) {
    // Both missing: extract path from first file path mention, content from rest
    const extMd = extractMarkdown(text);
    const extPath = extractFilePath(text);
    if (extPath && extMd) { args.path = extPath; args.content = extMd; filled = true; }
    else if (extMd) { args.content = extMd; filled = true; }
    else if (extPath) { args.path = extPath; filled = true; }
  } else if (args.path && !args.content) {
    const md = extractMarkdown(text);
    if (md) { args.content = md; filled = true; }
  } else if (args.content && !args.path) {
    const p = extractFilePath(text);
    if (p) { args.path = p; filled = true; }
  }
  return filled;
}

function extractMarkdown(text: string): string | null {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    // Match any markdown structure: headings, thematic breaks, blockquotes, callouts, tables, lists
    if (/^(#{1,6}\s|>|\[!|[\-\*]\s|\d+\.\s|\|\s*[-:]+)|^-{3,}$|^```/.test(trimmed)) {
      start = i;
      break;
    }
    // Also markdown wikilinks
    if (/\[\[[^\]]+\]\]/.test(trimmed) && trimmed.length > 20) {
      start = i;
      break;
    }
  }
  if (start === -1) {
    // No markdown found — return the whole text if it's substantial
    if (text.length > 100) return text.trim();
    return null;
  }
  return lines.slice(start).join("\n").trim();
}

function extractFilePath(text: string): string | null {
  const m = text.match(/([\w][\w/]*\.md)/);
  return m ? m[1] : null;
}

// ── Compaction helpers ──

function findTailStartIndex(msgs: Record<string, unknown>[], turns: number): number {
  let found = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.role === "assistant" && Array.isArray(msgs[i]?.tool_calls) && (msgs[i]?.tool_calls as unknown[]).length > 0) {
      found++;
      if (found >= turns) return i;
    }
  }
  return -1;
}

function pruneToolOutputs(msgs: Record<string, unknown>[], protectedTools: Set<string>): void {
  for (const msg of msgs) {
    if (msg?.role !== "tool") continue;
    const name = typeof msg.name === "string" ? msg.name : "";
    if (protectedTools.has(name)) continue;
    if (typeof msg.content === "string" && msg.content.length > 500) {
      msg.content = "[Old tool result content cleared]";
    }
  }
}

async function generateCompactionSummary(systemContent: string, originalUserContent: string, fileSummary: string, lastActions: string, currentTurn: number): Promise<string> {
  const compactionMessages: Record<string, unknown>[] = [
    { role: "system" as const, content: `You are a context compaction assistant for a note-generation system. Summarize the progress into a structured anchor document. Focus ONLY on what still matters. The newest turns may be kept verbatim outside your summary, so cover only the older context.

Output format (use exactly these sections):

## Goal
- [single-sentence task summary]

## Constraints & Preferences
- [relevant constraints or "(none)"]

## Progress
### Done
- [completed work or "(none)"]
### In Progress
- [current work or "(none)"]
### Blocked
- [blockers or "(none)"]

## Key Decisions
- [decisions made or "(none)"]

## Next Steps
- [ordered next actions]

## Critical Context
- [important facts, file paths, exam vars]

## Relevant Files
- [key files written so far]` },
    { role: "user" as const, content: `Original task: ${originalUserContent}

Current workspace state:
${fileSummary}

Last 5 tool actions: ${lastActions}

Current turn: ${currentTurn}

Generate a compact structured summary of progress so far. Focus on what's been done and what remains.` },
  ];
  try {
    const res = await fetch("/api/llm", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: compactionMessages, stream: true, max_tokens: 2048, temperature: 0.3 }),
    });
    if (!res.ok) return "";
    const reader = res.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let buffer = "", content = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]" || !payload) continue;
        try { const delta = JSON.parse(payload).choices?.[0]?.delta; if (delta?.content) content += delta.content; } catch {}
      }
    }
    return content;
  } catch { return ""; }
}

// ── SSE streaming parser ──

async function parseStreamingResponse(res: Response): Promise<{
  message: Record<string, unknown>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  truncated?: boolean;
  truncatedToolInfo?: { name: string; partialArgs: string };
}> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const contentParts: string[] = [];
  const reasoningParts: string[] = [];
  const toolCalls: Record<number, { id: string; type: string; function: { name: string; arguments: string } }> = {};
  let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined;
  let finishReason: string | undefined;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6).trim();
        if (payload === "[DONE]") continue;
        let chunk: any;
        try { chunk = JSON.parse(payload); } catch { continue; }
        if (chunk.usage) {
          usage = { prompt_tokens: chunk.usage.prompt_tokens ?? 0, completion_tokens: chunk.usage.completion_tokens ?? 0, total_tokens: chunk.usage.total_tokens ?? 0 };
        }
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta;
        if (!delta) continue;
        if (delta.content) contentParts.push(delta.content);
        if (delta.reasoning_content) reasoningParts.push(delta.reasoning_content);
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls[idx]) {
              toolCalls[idx] = { id: tc.id || "", type: "function", function: { name: tc.function?.name || "", arguments: tc.function?.arguments || "" } };
            } else {
              if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
              if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
              if (tc.id) toolCalls[idx].id = tc.id;
            }
          }
        }
      }
    }
  } catch (err) {
    if (contentParts.length === 0 && Object.keys(toolCalls).length === 0) throw err;
  }
  const content = contentParts.join("") || null;
  const message: Record<string, unknown> = { role: "assistant", content };
  if (reasoningParts.length > 0) message.reasoning_content = reasoningParts.join("");
  let truncatedToolCalls = false;
  if (Object.keys(toolCalls).length > 0) {
    if (finishReason === "length" || !finishReason) {
      const validToolCalls: Record<number, typeof toolCalls[0]> = {};
      for (const [k, tc] of Object.entries(toolCalls)) {
        try { JSON.parse(tc.function.arguments); validToolCalls[Number(k)] = tc; }
        catch { truncatedToolCalls = true; }
      }
      if (Object.keys(validToolCalls).length > 0) {
        message.tool_calls = Object.keys(validToolCalls).sort((a, b) => Number(a) - Number(b)).map((k) => validToolCalls[Number(k)]);
      } else if (truncatedToolCalls && content === null) { }
    } else {
      message.tool_calls = Object.keys(toolCalls).sort((a, b) => Number(a) - Number(b)).map((k) => toolCalls[Number(k)]);
    }
  }
  // Capture truncated tool call info for the continuation message
  let truncatedToolInfo: { name: string; partialArgs: string } | undefined;
  if (truncatedToolCalls) {
    for (const tc of Object.values(toolCalls)) {
      if (tc.function?.name && tc.function?.arguments) {
        try { JSON.parse(tc.function.arguments); } catch {
          truncatedToolInfo = { name: tc.function.name, partialArgs: tc.function.arguments };
          break;
        }
      }
    }
  }
  return { message, usage, truncated: truncatedToolCalls, truncatedToolInfo };
}

// ── Agent turn ──

async function runAgentTurn(messages: Record<string, unknown>[], tools: ToolDef[], handler: (name: string, args: Record<string, unknown>) => Promise<string>, config: AgentConfig, isAborted: () => boolean, attempt = 1): Promise<{
  newMessages: Record<string, unknown>[]; steps: AgentStep[]; finished: boolean; content: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  void config;
  const abortController = new AbortController();
  const abortCheck = setInterval(() => { if (isAborted()) abortController.abort(); }, 500);
  let result;
  try {
    result = await runAgentTurnInner(messages, tools, handler, attempt, abortController.signal);
    return result;
  } finally {
    clearInterval(abortCheck);
  }
}

async function runAgentTurnInner(messages: Record<string, unknown>[], tools: ToolDef[], handler: (name: string, args: Record<string, unknown>) => Promise<string>, attempt = 1, signal?: AbortSignal): Promise<{
  newMessages: Record<string, unknown>[]; steps: AgentStep[]; finished: boolean; content: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  const res = await fetch("/api/llm", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, tools: tools.length > 0 ? tools : undefined, tool_choice: tools.length > 0 ? "auto" : undefined, max_tokens: 65536, stream: true }),
    signal,
  });
  if (res.status === 504 && attempt < 3) {
    const backoff = 2000 * attempt;
    await new Promise((r) => setTimeout(r, backoff));
    return runAgentTurnInner(messages, tools, handler, attempt + 1, signal);
  }
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${err}`);
  }
  const { message: msg, usage, truncated, truncatedToolInfo } = await parseStreamingResponse(res);
  const msgContent = (msg.content as string) || "";
  const reasoningContent = msg.reasoning_content as string | undefined;
  const toolCalls = (msg.tool_calls as ToolCall[]) || [];
  if (truncated && toolCalls.length === 0) {
    // Extract file path from the truncated tool call's partial arguments
    let truncatedPath = "";
    if (truncatedToolInfo?.partialArgs) {
      const pathMatch = truncatedToolInfo.partialArgs.match(/"path"\s*:\s*"([^"]+)"/);
      if (pathMatch) truncatedPath = pathMatch[1];
    }
    const pathHint = truncatedPath
      ? ` The file "${truncatedPath}" was being written when truncation occurred. Use write_file with the COMPLETE content to finish writing it.`
      : truncatedToolInfo
        ? ` The ${truncatedToolInfo.name} tool call was truncated. Retry with complete arguments.`
        : "";
    const continuation: Record<string, unknown> = {
      role: "user",
      content: `[Output exceeded token limit. Continue immediately with your next action — do NOT explain, plan, or recap. Just output the next tool call.]${pathHint}`,
    };
    return { newMessages: [...messages, continuation], steps: [], finished: false, content: "(truncated)", usage };
  }
  const step: AgentStep = { turn: 0, toolCalls: [], response: msgContent || reasoningContent || "", phase: "processing" };
  const assistantMsg: Record<string, unknown> = { role: "assistant" };
  assistantMsg.content = msgContent || null;
  if (reasoningContent) assistantMsg.reasoning_content = reasoningContent;
  if (toolCalls.length > 0) assistantMsg.tool_calls = toolCalls;
  if (toolCalls.length > 0) {
    const newMsgs = [...messages, assistantMsg];
    for (const tc of toolCalls) {
      let args: Record<string, unknown>;
      try { args = JSON.parse(tc.function.arguments); } catch {
        const errBody = JSON.stringify({ error: `Invalid JSON in arguments for ${tc.function.name}` });
        step.toolCalls.push({ name: tc.function.name, args: {}, result: errBody });
        newMsgs.push({ role: "tool", tool_call_id: tc.id, content: errBody });
        continue;
      }
      if (tc.function.name === "write_file") {
        const hadPath = !!args.path;
        const hadContent = !!args.content;
        if (!hadPath || !hadContent) {
          autoFillWriteFileArgs(args, msgContent, reasoningContent);
        }
      }
      const validationError = validateToolArgs(tc.function.name, args);
      if (validationError) {
        if (tc.function.name === "write_file") {
          _writeFailCount++;
          if (_writeFailCount >= MAX_WRITE_FAILS && !_writeFailInjected) {
            _writeFailInjected = true;
            const errBody = JSON.stringify({ error: "write_file retry limit reached — see next user message" });
            newMsgs.push({ role: "tool", tool_call_id: tc.id, content: errBody });
            const reminder: Record<string, unknown> = { role: "user", content: "[REMINDER: write_file requires both \"path\" (string) and \"content\" (string) parameters. The content must be the full file content. If you already wrote the content file before, use read_file to check it instead of trying to rewrite it.]" };
            newMsgs.push(reminder);
            step.toolCalls.push({ name: tc.function.name, args: {}, result: errBody });
            continue;
          }
        }
        const errBody = formatToolError(tc.function.name, validationError);
        step.toolCalls.push({ name: tc.function.name, args: {}, result: errBody });
        newMsgs.push({ role: "tool", tool_call_id: tc.id, content: errBody });
        continue;
      }
      _writeFailCount = 0;
      const raw = await handler(tc.function.name, args);
      const result = truncateToolResult(raw);
      newMsgs.push({ role: "tool", tool_call_id: tc.id, content: result });
      step.toolCalls.push({ name: tc.function.name, args, result: result.substring(0, 500) });
    }
    for (const tc2 of toolCalls) {
      if (tc2.function.name !== "write_file") continue;
      try { const a = JSON.parse(tc2.function.arguments); if (typeof a.content === "string" && a.content.length > 200) { a.content = a.content.substring(0, 200) + "\n... [content truncated in history, but full content was written successfully]"; tc2.function.arguments = JSON.stringify(a); } } catch {}
    }
    return { newMessages: newMsgs, steps: [step], finished: false, content: step.response, usage };
  }
  return { newMessages: [...messages, assistantMsg], steps: [step], finished: true, content: step.response, usage };
}

const GARBAGE_RESULTS = [/please\s+email\s+us/i, /blocked/i, /captcha/i, /rate.limit/i, /too\s+many\s+requests/i, /access\s+denied/i, /if\s+this\s+persists/i];

function isResultGarbage(text: string): boolean {
  return GARBAGE_RESULTS.some((p) => p.test(text));
}

// ── Tool handler ──

function makeToolHandler(workspace: Map<string, string>) {
  const _readCache = new Map<string, string>();
  const _fullReadCache = new Map<string, { result: string; timestamp: number }>();

  return {
    handler: async (name: string, args: Record<string, unknown>): Promise<string> => {
      switch (name) {
        case "write_file": {
          const path = args.path as string;
          const content = args.content as string | undefined;
          if (!content) return JSON.stringify({ error: "Missing content", path });
          if (content.startsWith("[FILE STORED —")) {
            return JSON.stringify({ error: "Cannot write placeholder as content", path });
          }
          // Allow continuation after truncation: if the file exists and the new content
          // extends the existing content (e.g. the agent was truncated mid-write),
          // replace it with the full new content. This prevents write_file loops where
          // the agent keeps trying to overwrite a truncated file.
          const existing = workspace.get(path);
          if (existing) {
            // If new content doesn't start like existing, it's a different file — reject
            if (!content.startsWith(existing.substring(0, Math.min(100, existing.length)))) {
              return JSON.stringify({ error: `File already exists in workspace: "${path}". Use read_file to check it instead of rewriting.`, path });
            }
            // If new content isn't longer, not making progress — reject
            if (content.length <= existing.length) {
              return JSON.stringify({ error: `File already exists and wouldn't be improved: "${path}".`, path });
            }
            // New content is longer and starts the same — continuation after truncation, allowed
          }
          workspace.set(path, content);
          _readCache.delete(path);
          _fullReadCache.delete(path);
          return JSON.stringify({ success: true, path, bytes: content.length, continuation: !!existing });
        }

        case "read_file": {
          const path = args.path as string;
          const needsFull = args.full === true;
          if (needsFull) {
            const cached = _fullReadCache.get(path);
            if (cached && Date.now() - cached.timestamp < FULL_READ_CACHE_TTL) return cached.result;
          }
          if (!needsFull) {
            const cached = _readCache.get(path);
            if (cached !== undefined) return cached;
          }
          let content = workspace.get(path);
          if (content && content.startsWith("[FILE STORED —")) content = undefined;
          if (!content) {
            // workspace is the authoritative store — files not present here don't exist
          }
          if (content) {
            let result: string;
            if (needsFull) {
              const truncated = content.length > MAX_TOOL_RESULT_BYTES;
              const body = truncated ? content.substring(0, MAX_TOOL_RESULT_BYTES) : content;
              result = JSON.stringify({ path, content: body, size: content.length, mode: "full", truncated });
              _fullReadCache.set(path, { result, timestamp: Date.now() });
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
          const entries = Array.from(workspace.keys()).map((p) => {
            const c = workspace.get(p) || "";
            return { name: p, type: p.includes("/") ? "file" : "directory", size: c.length, lines: c ? c.split("\n").length : 0 };
          });
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
          } else { summary.topicsInCore = 0; summary.missingCore = true; }
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
          const PLACEHOLDER_PATTERNS = [/coming\s+soon/i, /add\s+more/i, /todo/i, /placeholder/i, /\(\+?\d+\s*questions?\s*more?\)/i, /more\s+questions?/i];
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
          summary.questionCount = readCount(`${chapterPath}/questions/100_questions.md`, /## Q\d+\./g);
          summary.questionCountOk = (summary.questionCount as number) >= 100;
          summary.mcqCount = readCount(`${chapterPath}/questions/100_mcqs.md`, /## Q\d+\./g);
          summary.mcqCountOk = (summary.mcqCount as number) >= 100;
          summary.flashcardCount = readCount(`${chapterPath}/flashcards/100_flashcards.md`, /## FC\d+\./g);
          summary.flashcardCountOk = (summary.flashcardCount as number) >= 100;
          summary.quizCount = readCount(`${chapterPath}/quizzes/100_quizzes.md`, /### Q\d+\./g);
          summary.quizCountOk = (summary.quizCount as number) >= 100;

          // ── Question type diversity check ──
          // Count non-numerical question types in both questions and MCQs files
          const questionFiles = [
            `${chapterPath}/questions/100_questions.md`,
            `${chapterPath}/questions/100_mcqs.md`,
          ];
          let assertionReasonCount = 0;    // **Type:** Assertion-Reason
          let matchingCount = 0;            // **Type:** Matching
          let comprehensionCount = 0;       // **Type:** Comprehension or Passage
          let statementBasedCount = 0;      // **Type:** Statement-Based or Statement
          let totalNonNumerical = 0;
          let totalQuestions = 0;
          for (const qf of questionFiles) {
            const content = workspace.get(qf) || "";
            // Count total questions via ## Q headings
            const qs = (content.match(/## Q\d+\./g) || []).length;
            totalQuestions += qs;
            // Count specific types via **Type:** metadata field
            const types = content.match(/\*\*Type:\*\*\s*(.+)/g) || [];
            for (const t of types) {
              const typeVal = t.replace(/\*\*Type:\*\*\s*/i, "").trim().toLowerCase();
              if (typeVal.includes("assertion") || typeVal.includes("assertion-reason")) assertionReasonCount++;
              else if (typeVal.includes("match") || typeVal.includes("matrix")) matchingCount++;
              else if (typeVal.includes("comprehension") || typeVal.includes("passage")) comprehensionCount++;
              else if (typeVal.includes("statement") || typeVal.includes("true/false") || typeVal.includes("t/f")) statementBasedCount++;
            }
            // Also check for patterns in the content even without explicit Type field
            // Look for the assertion-reason options pattern
            if (/Both A and R are true/.test(content)) assertionReasonCount += 0.5; // partial match bonus
            // Look for matching/column patterns
            if (/Column I/.test(content) || /Column II/.test(content) || /Match the following/i.test(content)) matchingCount += 0.5;
            // Look for passage/comprehension patterns
            if (/### Passage:/.test(content) || /## Passage/.test(content)) comprehensionCount += 0.5;
          }
          summary.questionTypeCheck = {
            totalQuestions,
            assertionReason: assertionReasonCount,
            matching: matchingCount,
            comprehension: comprehensionCount,
            statementBased: statementBasedCount,
            nonNumerical: assertionReasonCount + matchingCount + comprehensionCount + statementBasedCount,
            nonNumericalPct: totalQuestions > 0 ? Math.round(((assertionReasonCount + matchingCount + comprehensionCount + statementBasedCount) / totalQuestions) * 100) : 0,
          };
          if (detailed) {
            if ((summary.questionTypeCheck as any).nonNumericalPct < 40) {
              summary.issues = [...(summary.issues as string[] || []), `Only ${(summary.questionTypeCheck as any).nonNumericalPct}% non-numerical questions — need at least 40% (assertion-reason, matching, comprehension, statement-based)`];
            }
            if (assertionReasonCount < 5) {
              summary.issues = [...(summary.issues as string[] || []), `Only ${assertionReasonCount} assertion-reason questions — need at least 5`];
            }
            if (comprehensionCount < 3) {
              summary.issues = [...(summary.issues as string[] || []), `Only ${comprehensionCount} passage/comprehension questions — need at least 3`];
            }
            if (matchingCount < 2) {
              summary.issues = [...(summary.issues as string[] || []), `Only ${matchingCount} matching questions — need at least 2`];
            }
          }
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
        case "search_web": {
          const query = (args.query as string) || "";
          if (!query) return JSON.stringify({ error: "Missing query" });
          try {
            const res = await fetch("/api/web-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }), signal: AbortSignal.timeout(15_000) });
            if (!res.ok) { const err = await res.text().catch(() => ""); return JSON.stringify({ error: `Search API error (${res.status}): ${err}`, query }); }
            const data = await res.json();
            const results: { title?: string; snippet?: string }[] = data.results || [];
            if (results.length === 0) {
              _emptySearchCount++;
              if (_emptySearchCount >= 3) {
                _emptySearchCount = 0;
                return JSON.stringify({ query, results: [], warning: "No results found for 3 consecutive searches. Web search is unreliable for this topic. Proceed using the LLM's knowledge — do NOT call search_web again." });
              }
              return JSON.stringify({ query, results: [], warning: "No results found. Try a more specific query or proceed using your knowledge." });
            }
            // Filter out garbage results
            const cleanResults = results.filter((r) => {
              const text = `${r.title || ""} ${r.snippet || ""}`;
              return !isResultGarbage(text);
            });
            if (cleanResults.length === 0) {
              _emptySearchCount++;
              return JSON.stringify({ query, results: [], warning: "Search returned only error pages. Proceed using your knowledge." });
            }
            _emptySearchCount = 0;
            return JSON.stringify({ query, results: cleanResults.map((r: { title?: string; snippet?: string }) => `${r.title || ""}${r.title ? ": " : ""}${r.snippet || ""}`.trim()).filter(Boolean), count: cleanResults.length });
          } catch (err) {
            return JSON.stringify({ error: `Web search failed: ${err instanceof Error ? err.message : String(err)}`, query });
          }
        }
        case "neet_bank_search": {
          const subject = (args.subject as string) || "";
          const chapter = (args.chapter as string) || "";
          const year = (args.year as string) || "";
          const limit = Math.min(Number(args.limit) || 50, 200);
          const random = args.random === true;
          try {
            const params = new URLSearchParams({ subject, chapter });
            if (year) params.set("year", year);
            if (random) params.set("random", "true");
            params.set("limit", String(limit));
            const res = await fetch(`/api/neet-bank?${params.toString()}`, {
              signal: AbortSignal.timeout(10_000),
            });
            if (!res.ok) {
              const err = await res.text().catch(() => "");
              return JSON.stringify({ error: `neet_bank_search failed (${res.status})`, detail: err });
            }
            const data = await res.json();
            const questions: any[] = data.questions || [];
            // Compute type & difficulty distribution summary
            if (questions.length === 0) {
              return JSON.stringify({
                questions: [], total: 0, subject, chapter,
                _distribution: { totalQuestions: 0, typeDistribution: [], difficultyDistribution: [] },
                _instruction: "No NEET bank questions found for this chapter. Proceed using your knowledge. Remember: at least 40% of questions MUST be non-numerical types (assertion-reason, matching, comprehension, statement-based). Also include 15-20% multi-concept questions that combine 2+ topics/formulas.",
              });
            }
            const typeCounts: Record<string, number> = {};
            const difficultyCounts: Record<string, number> = {};
            let typeExamples: Record<string, string[]> = {};
            for (const q of questions) {
              const t = (q.type || "unknown").toLowerCase();
              typeCounts[t] = (typeCounts[t] || 0) + 1;
              const d = (q.difficulty || "unknown").toLowerCase();
              difficultyCounts[d] = (difficultyCounts[d] || 0) + 1;
              // Collect up to 2 example question_text snippets per type
              if (!typeExamples[t]) typeExamples[t] = [];
              if (typeExamples[t].length < 2 && q.question_text) {
                typeExamples[t].push(q.question_text.substring(0, 150));
              }
            }
            const summary = {
              totalQuestions: questions.length,
              typeDistribution: Object.entries(typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => ({
                  type,
                  count,
                  pct: Math.round((count / questions.length) * 100) + "%",
                  examples: typeExamples[type] || [],
                })),
              difficultyDistribution: Object.entries(difficultyCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([diff, count]) => ({ difficulty: diff, count, pct: Math.round((count / questions.length) * 100) + "%" })),
            };
            return JSON.stringify({
              questions,
              total: questions.length,
              subject,
              chapter,
              _distribution: summary,
              _instruction: "ANALYZE the typeDistribution above before generating your questions. Your generated question set MUST have a similar or greater proportion of non-numerical types (assertion-reason, matching, comprehension, statement-based). Match the difficulty distribution as well. Also include 15-20% multi-concept questions that combine 2+ topics/formulas in a single question (e.g. Coulomb's Law + Gauss's Law, or kinematics + force analysis).",
            });
          } catch (err) {
            return JSON.stringify({ error: `neet_bank_search error: ${err instanceof Error ? err.message : String(err)}` });
          }
        }
        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    },
  };
}

// Module-level state for search_web guard
let _emptySearchCount = 0;

// Module-level state for write_file retry tracker across turns
let _writeFailCount = 0;
let _writeFailInjected = false;

export async function runAgentEngine(params: AgentEngineParams): Promise<void> {
  const { config, vaultNotes, chapterName, chapterPath, callbacks } = params;
  let messages = structuredClone(params.messages);
  const tools = params.tools;

  // Reset per-run state
  _writeFailCount = 0;
  _writeFailInjected = false;
  _emptySearchCount = 0;

  // Seed workspace with vault notes
  const workspace = new Map<string, string>();
  for (const n of vaultNotes) {
    if (n.content && n.content.startsWith("[FILE STORED —")) continue;
    workspace.set(n.path, n.content);
  }
  for (const [p, c] of workspace.entries()) {
    if (c.startsWith("[FILE STORED —")) workspace.delete(p);
  }

  // RAG system removed — embeddings are pre-generated locally and pushed to Supabase.

  const allToolCalls: { turn: number; name: string; args: Record<string, unknown> }[] = [];
  let currentTurn = 0;
  let lastPromptTokens = 0;
  let lastFilePath = "";
  let lastToolName = "";
  let consecutiveSameFile = 0;
  let consecutiveIdleTurns = 0;

  const { handler: toolHandlerFn } = makeToolHandler(workspace);

  function getChapterFiles(): [string, string][] {
    const files: [string, string][] = [];
    for (const [path, content] of workspace.entries()) {
      if (path.startsWith(chapterPath) && path.endsWith(".md")) files.push([path, content]);
    }
    return files;
  }

  while (currentTurn < MAX_TURNS) {
    if (callbacks.isAborted()) {
      callbacks.onDone({ messages, steps: [], turn: currentTurn, workspace: getChapterFiles() });
      return;
    }

    // Compaction at 1M tokens
    if (lastPromptTokens > 1_000_000) {
      const systemMsg = messages[0];
      const userMsg = messages[1];
      const originalUserContent = typeof userMsg?.content === "string" ? userMsg.content : "";
      const allFiles: string[] = [];
      for (const [p] of workspace.entries()) {
        if (p.startsWith(chapterPath) && p.endsWith(".md")) allFiles.push(p);
      }
      allFiles.sort();
      const notes = allFiles.filter((f) => f.includes("/notes/"));
      const questions = allFiles.filter((f) => f.includes("/questions/"));
      const flashcards = allFiles.filter((f) => f.includes("/flashcards/"));
      const quizzes = allFiles.filter((f) => f.includes("/quizzes/"));
      const revision = allFiles.filter((f) => f.includes("/revision/"));
      const lastActions = allToolCalls.slice(-5).map((tc) => `${tc.name}(${Object.keys(tc.args).join(",")})`).join("; ");
      const fileDetails = allFiles.map((p) => { const c = workspace.get(p) || ""; return `${p} (${c.length} bytes, ${c.split("\n").length} lines)`; }).join("\n");
      const fileSummary = `Files written: ${allFiles.length} total (${notes.length} notes, ${questions.length} questions, ${flashcards.length} flashcards, ${quizzes.length} quizzes, ${revision.length} revision)\n\nFile details:\n${fileDetails || "(none)"}\n\nIMPORTANT: You already know the content of these files from reading them. Do NOT re-read them unless you need to verify specific details.`;
      lastPromptTokens = 0;
      const tailStart = findTailStartIndex(messages, COMPACTION_TAIL_TURNS);
      const tailMsgs = tailStart >= 0 ? messages.slice(tailStart) : [];
      const oldMsgs = tailStart >= 0 ? messages.slice(0, tailStart) : messages;
      pruneToolOutputs(oldMsgs, new Set(["skill"]));
      const summary = await generateCompactionSummary(
        typeof systemMsg?.content === "string" ? systemMsg.content : "",
        originalUserContent, fileSummary, lastActions, currentTurn,
      );
      messages.length = 0;
      if (summary) {
        messages.push(systemMsg, userMsg, { role: "user", content: summary }, ...tailMsgs);
      } else {
        messages.push(systemMsg, userMsg, { role: "user", content: `[STATE SUMMARY — turn ${currentTurn}]\n${fileSummary}\nLast actions: ${lastActions || "none"}\nContinue with the next task. Do NOT re-read files you already have — use the file details above to decide what to do next.` }, ...tailMsgs);
      }
    }

    try {
      const result = await runAgentTurn(messages, tools, toolHandlerFn, config, () => callbacks.isAborted());
      messages.length = 0;
      messages.push(...result.newMessages);

      const thisTurnCalls = result.steps.flatMap((s) => s.toolCalls);
      for (const tc of thisTurnCalls) {
        allToolCalls.push({ turn: currentTurn, name: tc.name, args: tc.args });
      }

      // Loop detection
      for (const tc of thisTurnCalls) {
        if (tc.name === "read_file" || tc.name === "write_file") {
          const path = (tc.args.path as string) || "";
          if (path && path === lastFilePath && tc.name === lastToolName) {
            consecutiveSameFile++;
            if (consecutiveSameFile >= MAX_CONSECUTIVE_SAME_ACTION) {
              throw new Error(`Loop detected: repeated "${tc.name}" on "${path}" ${consecutiveSameFile + 1} consecutive times`);
            }
          } else if (path) {
            consecutiveSameFile = 0;
            lastFilePath = path;
            lastToolName = tc.name;
          }
        }
      }

      if (result.usage?.prompt_tokens) lastPromptTokens = result.usage.prompt_tokens;

      if (result.finished) {
        callbacks.onDone({ messages, steps: result.steps, turn: currentTurn + 1, workspace: getChapterFiles() });
        return;
      }

      currentTurn++;

      // Sliding window (high threshold — compaction at 1M handles trimming)
      if (messages.length > 80) {
        const tail: Record<string, unknown>[] = [];
        let pendingTools = 0;
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          tail.unshift(m);
          if (m.role === "tool") pendingTools++;
          else if (m.role === "assistant" && m.tool_calls) {
            pendingTools = Math.max(0, pendingTools - (m.tool_calls as unknown[]).length);
          }
          if (tail.length >= 6 && pendingTools === 0 && m.role !== "tool") break;
        }
        messages.length = 0;
        messages.push(messages[0], messages[1], ...tail);
      }

      callbacks.onProgress({ messages, steps: result.steps, turn: currentTurn });

      if (!result.content || !result.steps.some((s) => s.toolCalls.length > 0)) {
        consecutiveIdleTurns++;
        if (consecutiveIdleTurns >= MAX_CONSECUTIVE_SAME_ACTION) {
          throw new Error(`Loop detected: ${MAX_CONSECUTIVE_SAME_ACTION} consecutive idle turns (no tool calls or content)`);
        }
        messages.push({ role: "user", content: "Continue the work. If you are completely done with all tasks (notes, questions, flashcards, quizzes, revision, verification, placeholders), call the final_report tool with a summary." });
      } else {
        consecutiveIdleTurns = 0;
      }
    } catch (err: any) {
      callbacks.onError(err.message);
      return;
    }
  }

  // Max turns reached
  callbacks.onDone({ messages, steps: [], turn: currentTurn, workspace: getChapterFiles() });
}


