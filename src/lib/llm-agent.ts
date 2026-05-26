export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type ToolHandler = (
  name: string,
  args: Record<string, unknown>
) => Promise<string>;

export interface AgentStep {
  turn: number;
  toolCalls: { name: string; args: Record<string, unknown>; result: string }[];
  response: string;
  phase: string;
}

export interface AgentConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: string;
}

export async function runAgentTurn(
  messages: Record<string, unknown>[],
  tools: ToolDef[],
  handler: ToolHandler,
  config: AgentConfig
): Promise<{
  newMessages: Record<string, unknown>[];
  steps: AgentStep[];
  finished: boolean;
  content: string;
}> {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: config.provider || "custom",
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model || "gpt-4o-mini",
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

export const NOTE_AGENT_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or update a file in the workspace",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path (e.g. 'Electrostatics/notes/gauss_law.md')" },
          content: { type: "string", description: "Full file content in markdown" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the workspace or the existing vault that was loaded",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to vault root" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_workspace",
      description: "List all files currently in the workspace",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "assess_quality",
      description: "FINAL ASSESSMENT: Read core.md for topic list, then verify ALL notes exist, check note length (400+ lines), count questions (exactly 100), MCQs (exactly 100), flashcards (100+), quizzes (100+), detect placeholders, broken wikilinks, and formatting issues across the ENTIRE chapter.",
      parameters: {
        type: "object",
        properties: {
          chapterPath: { type: "string", description: "Chapter directory path (e.g. 'Electrostatics')" },
        },
        required: ["chapterPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "final_report",
      description: "Call this when ALL work is complete AND all assessment issues are fixed. Provide a summary of everything generated and fixed.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string" },
          filesCreated: { type: "array", items: { type: "string" } },
          filesModified: { type: "array", items: { type: "string" } },
          issuesFixed: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "filesCreated", "filesModified", "issuesFixed"],
      },
    },
  },
];

export const AGENT_SYSTEM_PROMPT = `You are an expert study material generator building a structured Obsidian vault.

=== INSTRUCTIONS ===
- Follow the SKILL instructions below as your primary workflow and formatting guide.
- The SKILL defines the vault structure, note templates, question/MCQ/flashcard types, callout patterns, and quality checks.
- Adapt terminology to be exam-agnostic (use "exam-level" instead of "JEE", etc.).
- Use the available tools (write_file, read_file, list_workspace, check_completeness, find_placeholders, final_report) throughout the workflow.

=== WORKFLOW OVERVIEW ===
1. ANALYZE input → extract ALL topics
2. STRUCTURE vault directories via write_file
3. Generate NOTES (one .md per topic, 400+ lines each)
4. Generate QUESTIONS (100+ with complete solutions)
5. Generate MCQs (100+ with explanations for all options)
6. Generate FLASHCARDS (100+ across all types)
7. Generate QUIZZES (100+ items with answers)
8. Generate REVISION files (formula sheet, one-shot, common mistakes, derivations)
9. FINAL ASSESSMENT — call assess_quality. It will verify ALL of:
   - Every topic from core.md has a note file
   - Every note is 400+ lines
   - Exactly 100 questions in questions files
   - Exactly 100 MCQs in mcq file
   - 100+ flashcards
   - 100+ quizzes
   - No placeholder text anywhere
   - No broken wikilinks
   - Proper formatting (callouts, LaTeX, tables)
   If ANY issue is found, fix it immediately, then reassess.
10. REPORT via final_report with full summary

=== RULES ===
- Every file must have REAL content. No placeholders, "Coming soon", or "(+X more)".
- Use LaTeX ($$...$$) for all formulas.
- Use all callout types: >[!KEY-CONCEPT], >[!EXAM-INSIGHT], >[!COMMON-MISTAKE], >[!DEEP-INSIGHT], >[!INTUITION], >[!TIP], >[!IMPORTANT].
- Use wikilinks ([[Topic Name]]) for cross-references.
- Tag every file with #Subject #Chapter.
- Generate complete content for every section — do not skip or abbreviate.`;
