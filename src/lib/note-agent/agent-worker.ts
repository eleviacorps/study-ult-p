/// <reference lib="webworker" />

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

function sanitizePath(name: string): string {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-/]/g, "").replace(/_+/g, "_");
}

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
      max_tokens: 65536,
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
      const args = JSON.parse(tc.function.arguments);
      const result = await handler(tc.function.name, args);
      newMsgs.push({ role: "tool", tool_call_id: tc.id, content: result });
      step.toolCalls.push({ name: tc.function.name, args, result: result.substring(0, 500) });
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

async function toolHandler(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "write_file": {
      const path = args.path as string;
      const content = args.content as string;
      workspace.set(path, content);
      return JSON.stringify({ success: true, path, bytes: content.length });
    }

    case "read_file": {
      const path = args.path as string;
      const content = workspace.get(path);
      if (content) return JSON.stringify({ path, content, size: content.length });
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
      const allFiles = Array.from(workspace.keys()).filter((p) => p.endsWith(".md"));
      const chapterFiles = allFiles.filter((p) => p.startsWith(chapterPath));
      const results: Record<string, unknown> = {};

      const coreMd = workspace.get(`${chapterPath}/core.md`);
      if (coreMd) {
        const topicLinks = [...coreMd.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
        results.topicsInCore = topicLinks.length;
        results.topicsList = topicLinks;
      } else {
        results.topicsInCore = 0;
        results.topicsList = [];
        results.missingCore = true;
      }

      const noteFiles = chapterFiles.filter((p) => p.includes("/notes/"));
      results.noteCount = noteFiles.length;
      const notesShort: { path: string; lines: number }[] = [];
      for (const nf of noteFiles) {
        const content = workspace.get(nf) || "";
        const lines = content.split("\n").length;
        if (lines < 400) notesShort.push({ path: nf, lines });
      }
      results.notesShort = notesShort;

      const PLACEHOLDER_PATTERNS = [
        /coming\s+soon/i,
        /add\s+more/i,
        /todo/i,
        /placeholder/i,
        /\(\+?\d+\s*questions?\s*more?\)/i,
        /more\s+questions?/i,
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
      results.placeholders = placeholders;

      const qFile = workspace.get(`${chapterPath}/questions/100_questions.md`);
      if (qFile) {
        const qCount = (qFile.match(/## Q\d+\./g) || []).length;
        results.questionCount = qCount;
        results.questionCountOk = qCount >= 100;
      } else {
        results.questionCount = 0;
        results.questionCountOk = false;
      }

      const mcqFile = workspace.get(`${chapterPath}/questions/100_mcqs.md`);
      if (mcqFile) {
        const mcqCount = (mcqFile.match(/### Q\d+\./g) || []).length;
        results.mcqCount = mcqCount;
        results.mcqCountOk = mcqCount >= 100;
      } else {
        results.mcqCount = 0;
        results.mcqCountOk = false;
      }

      const flashFile = workspace.get(`${chapterPath}/flashcards/100_flashcards.md`);
      if (flashFile) {
        const flashCount = (flashFile.match(/## FC\d+\./g) || []).length;
        results.flashcardCount = flashCount;
        results.flashcardCountOk = flashCount >= 100;
      } else {
        results.flashcardCount = 0;
        results.flashcardCountOk = false;
      }

      const quizFile = workspace.get(`${chapterPath}/quizzes/100_quizzes.md`);
      if (quizFile) {
        const quizCount = (quizFile.match(/### Q\d+\./g) || []).length;
        results.quizCount = quizCount;
        results.quizCountOk = quizCount >= 100;
      } else {
        results.quizCount = 0;
        results.quizCountOk = false;
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
      results.brokenWikilinks = brokenLinks;

      let hasCallouts = false;
      let hasLatex = false;
      let hasTables = false;
      for (const f of chapterFiles) {
        const content = workspace.get(f) || "";
        if (/\[![\w-]+\]/.test(content)) hasCallouts = true;
        if (/\$\$/.test(content)) hasLatex = true;
        if (/\|.*\|.*\|/.test(content)) hasTables = true;
      }
      results.formatting = { callouts: hasCallouts, latex: hasLatex, tables: hasTables };

      const issues: string[] = [];
      if (notesShort.length > 0) issues.push(`${notesShort.length} notes under 400 lines`);
      if (placeholders.length > 0) issues.push(`${placeholders.length} placeholder texts found`);
      if (!results.questionCountOk) issues.push(`Questions: ${results.questionCount}/100`);
      if (!results.mcqCountOk) issues.push(`MCQs: ${results.mcqCount}/100`);
      if (!results.flashcardCountOk) issues.push(`Flashcards: ${results.flashcardCount}/100`);
      if (!results.quizCountOk) issues.push(`Quizzes: ${results.quizCount}/100`);
      if (brokenLinks.length > 0) issues.push(`${brokenLinks.length} broken wikilinks`);
      results.issues = issues;
      results.passed = issues.length === 0;

      return JSON.stringify({ chapter: chapterPath, ...results });
    }

    case "final_report":
      return JSON.stringify({ type: "final_report", ...args });

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

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

  const MAX_TURNS = 50;
  const messages = structuredClone(initialMessages);
  let currentTurn = 0;

  while (currentTurn < MAX_TURNS) {
    if (abortFlag) {
      const fileList: [string, string][] = [];
      for (const [path, content] of workspace.entries()) {
        if (path.startsWith(chapterPath) && path.endsWith(".md")) {
          fileList.push([path, content]);
        }
      }
      self.postMessage({ type: "done", messages, steps: [], turn: currentTurn, workspace: fileList } );
      return;
    }

    try {
      const result = await runAgentTurn(messages, tools, toolHandler, config);
      messages.length = 0;
      messages.push(...result.newMessages);

      if (result.finished) {
        const fileList: [string, string][] = [];
        for (const [path, content] of workspace.entries()) {
          if (path.startsWith(chapterPath) && path.endsWith(".md")) {
            fileList.push([path, content]);
          }
        }
        self.postMessage({ type: "done", messages, steps: result.steps, turn: currentTurn + 1, workspace: fileList } );
        return;
      }

      currentTurn++;
      self.postMessage({ type: "progress", messages, steps: result.steps, turn: currentTurn } satisfies WorkerProgressUpdate);

      if (!result.content || !result.steps.some((s) => s.toolCalls.length > 0)) {
        messages.push({
          role: "user",
          content: "Continue the work. If you are completely done with all tasks (notes, questions, flashcards, quizzes, revision, verification, placeholders), call the final_report tool with a summary.",
        });
      }
    } catch (err: any) {
      self.postMessage({ type: "error", error: err.message } satisfies WorkerErrorUpdate);
      return;
    }
  }

  // Max turns reached
  const fileList: [string, string][] = [];
  for (const [path, content] of workspace.entries()) {
    if (path.startsWith(chapterPath) && path.endsWith(".md")) {
      fileList.push([path, content]);
    }
  }
  self.postMessage({ type: "done", messages, steps: [], turn: currentTurn, workspace: fileList } );
};
