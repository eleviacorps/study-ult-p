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

export type AgentConfig = Record<string, never>;

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
  void config;
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`API error (${res.status}): ${err}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let _buf = "", _content = "", _reasoning = "";
  const _tc: Record<number, ToolCall> = {};
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    _buf += decoder.decode(value, { stream: true });
    const lines = _buf.split("\n");
    _buf = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]" || !payload) continue;
      try {
        const chunk = JSON.parse(payload);
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta || {};
        if (delta.content) _content += delta.content;
        if (delta.reasoning_content) _reasoning += delta.reasoning_content;
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!_tc[idx]) {
              _tc[idx] = { id: tc.id || "", type: "function", function: { name: tc.function?.name || "", arguments: tc.function?.arguments || "" } };
            } else {
              if (tc.function?.name) _tc[idx].function.name += tc.function.name;
              if (tc.function?.arguments) _tc[idx].function.arguments += tc.function.arguments;
              if (tc.id) _tc[idx].id = tc.id;
            }
          }
        }
      } catch {}
    }
  }
  const msgContent = _content;
  const reasoningContent: string | undefined = _reasoning || undefined;
  const toolCalls: ToolCall[] = Object.keys(_tc).length > 0 ? Object.keys(_tc).sort((a, b) => Number(a) - Number(b)).map((k) => _tc[Number(k)]) : [];

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
      description: "Create a NEW file, or CONTINUE an existing file by appending content. For a NEW file, call with path + content as normal. For CONTINUING a truncated/long file, call with path + content (the new section) + append: true. The engine will concatenate appended content to the existing file. BOTH parameters 'path' AND 'content' are ALWAYS required.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path (e.g. 'Electrostatics/notes/gauss_law.md'). MANDATORY — you MUST include this." },
          content: { type: "string", description: "Full file content in markdown for a NEW file, or the new section to add when append:true. MANDATORY — you MUST include this." },
          append: { type: "boolean", description: "Optional. Set to true to append this content to the existing file instead of replacing it. Use for continuing truncated/long files section by section." },
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
          full: { type: "boolean", description: "If true, returns full content. Default: compact (path, size, excerpt). Request full only when you must verify byte-level correctness." },
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
      description: "FINAL ASSESSMENT: Verify ALL notes exist, check note length (400+ lines), count questions (exactly 100), MCQs (exactly 100), flashcards (100+), quizzes (100+), detect placeholders, broken wikilinks, and formatting issues across the ENTIRE chapter.",
      parameters: {
        type: "object",
        properties: {
          chapterPath: { type: "string", description: "Chapter directory path (e.g. 'Electrostatics')" },
          detailed: { type: "boolean", description: "If true, returns full diagnostic list. Default: compact (counts + first 5 issues). Use compact for general assessment; request detailed when you need exact file/line info." },
        },
        required: ["chapterPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for question papers, exam patterns, or topic references. Use ONLY when generating questions, MCQs, or any exam material — search for real question patterns from NEET/JEE/Board previous year papers to match difficulty and style. Provide a clear, specific search query.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g. 'NEET UG Sexual Reproduction in Flowering Plants previous year questions'). Be specific and include the exam name." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_neet_chapters",
      description: "List all available chapters in the NEET question bank, optionally filtered by subject. Call this BEFORE neet_bank_search when you don't know which chapters exist for a subject. Returns a list of {subject, chapter} entries so you can discover what's available.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Optional filter: Physics, Chemistry, or Biology. Omit to see all subjects." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "neet_bank_search",
      description: "Search the NEET question bank for real past-year questions. Call this FIRST when generating questions or MCQs — it returns actual NEET questions with correct answers and solutions so you can match real exam style. Do NOT copy questions verbatim; use them as a style reference for difficulty level and trap design. Returns question_text, options (A/B/C/D), correct_answer, solution_text. Can be filtered by subject, chapter (any name format works, e.g. 'Units and Measurement' or 'Chemical Bonding'), or year.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Subject: Physics, Chemistry, or Biology" },
          chapter: { type: "string", description: "Chapter name in any format (e.g. 'Units and Measurement', 'chemical-bonding', 'The Living World'). The API does fuzzy matching so just use the natural chapter name." },
          year: { type: "string", description: "Optional year filter (e.g. '2024')" },
          limit: { type: "number", description: "Max results to return (default 50, max 200). Use higher limits (50-200) when you need a comprehensive view of question patterns across many years." },
          random: { type: "boolean", description: "If true, randomize results (default: most recent first). Use true when you need a variety of questions across years." },
        },
        required: ["subject", "chapter"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_jee_main_chapters",
      description: "List all available chapters in the JEE Main question bank, optionally filtered by subject. Call this BEFORE jee_main_bank_search when you don't know which chapters exist for a subject. Returns a list of {subject, chapter} entries so you can discover what's available.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Optional filter: Physics, Chemistry, or Mathematics. Omit to see all subjects." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "jee_main_bank_search",
      description: "Search the JEE Main question bank for real past-year questions. Call this FIRST when generating questions or MCQs — it returns actual JEE Main questions with correct answers and solutions so you can match real exam style. Do NOT copy questions verbatim; use them as a style reference for difficulty level and trap design. Returns question_text, options (A/B/C/D), correct_answer, solution_text. Can be filtered by subject, chapter (any name format works, e.g. 'Units and Measurements' or 'Matrices and Determinants'), or year.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Subject: Physics, Chemistry, or Mathematics" },
          chapter: { type: "string", description: "Chapter name in any format (e.g. 'Units and Measurements', 'matrices-and-determinants', '3D Geometry'). The API does fuzzy matching so just use the natural chapter name." },
          year: { type: "string", description: "Optional year filter (e.g. '2024')" },
          limit: { type: "number", description: "Max results to return (default 50, max 200). Use higher limits (50-200) when you need a comprehensive view of question patterns across many years." },
          random: { type: "boolean", description: "If true, randomize results (default: most recent first). Use true when you need a variety of questions across years." },
        },
        required: ["subject", "chapter"],
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
  {
    type: "function",
    function: {
      name: "generate_content",
      description: "Generate study content using a FRESH LLM call with full 65K output budget. Use this for creating full notes, question sets, MCQ sets, etc. The content is written DIRECTLY to the path you specify — no separate write_file needed. The sub-agent has NO tools, NO history, and the full output budget.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "The complete prompt for the sub-agent. Include topic, format, structure, and style. Self-contained — sub-agent has no context." },
          path: { type: "string", description: "Path to save the content (e.g. 'Electrostatics/notes/coulombs_law.md'). MANDATORY." },
          max_tokens: { type: "number", description: "Optional. Max tokens (default: 65536)." },
        },
        required: ["prompt", "path"],
      },
    },
  },
];

export function getAgentSystemPrompt(examName?: string): string {
  const insight = examName ? `${examName}-INSIGHT` : "EXAM-INSIGHT";
  return `You are an expert study material generator building a structured Obsidian vault.

=== INSTRUCTIONS ===
- Follow the SKILL instructions below as your primary workflow and formatting guide.
- The SKILL defines the vault structure, note templates, question/MCQ/flashcard types, callout patterns, and quality checks.
- The content is being generated for "${examName || "exam"}" preparation. Adapt terminology accordingly.
|- Use the available tools (write_file, read_file, list_workspace, assess_quality, final_report, generate_content) throughout the workflow.
|- ORCHESTRATOR PATTERN — Use generate_content for ALL content. It writes DIRECTLY to the path you specify. No separate write_file call needed.
  Example: generate_content(prompt="Write a 400+ line note about Coulomb's Law...", path="notes/coulombs_law.md")
  → Sub-agent generates the full content and saves it to workspace at that path.
  → Returns {bytes, lines, preview} so you can verify.
|- Each generate_content call = ONE complete file: one note (400+ lines), one question set (100 items), one MCQ set, etc. Make the prompt self-contained.
- write_file handles both NEW files and CONTINUATIONS: use append:true to add sections to an existing file. The engine concatenates appended content automatically.
- Use search_web when generating questions, MCQs, or exam material to reference real previous-year question patterns and difficulty levels from the target exam.
- Use list_neet_chapters to discover which chapters have NEET bank questions (optionally filtered by subject), then use neet_bank_search to fetch real past exam questions. Use neet_bank_search FIRST when generating questions/MCQs — it returns real past exam questions so you can match the difficulty, style, and trap patterns.
- Use list_jee_main_chapters to discover JEE Main bank chapters (Physics, Chemistry, Mathematics), then use jee_main_bank_search to fetch real JEE Main past-year questions for style reference.

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
|- Every file must have REAL content. No placeholders, "Coming soon", or "(+X more)".
|- Use LaTeX ($$...$$) for all formulas.
|- Use all callout types: >[!KEY-CONCEPT], >[!${insight}], >[!COMMON-MISTAKE], >[!DEEP-INSIGHT], >[!INTUITION], >[!TIP], >[!IMPORTANT].
|- Use wikilinks ([[Topic Name]]) for cross-references.
|- Tag every file with #Subject #Chapter.
|- ORCHESTRATOR FLOW: generate_content(prompt, path) writes DIRECTLY to workspace at that path. No write_file needed after generate_content.
|- If generate_content returns an error, retry with a clearer prompt. Use write_file only for small manual edits or metadata.`;
}

export const AGENT_SYSTEM_PROMPT = getAgentSystemPrompt();
