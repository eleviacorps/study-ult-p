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
  messages: { role: string; content: string; tool_calls?: ToolCall[]; tool_call_id?: string }[],
  tools: ToolDef[],
  handler: ToolHandler,
  config: AgentConfig
): Promise<{
  newMessages: { role: string; content: string; tool_calls?: ToolCall[]; tool_call_id?: string }[];
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

  const msgContent =
    choice.message?.content || choice.message?.reasoning_content || "";
  const toolCalls: ToolCall[] = choice.message?.tool_calls || [];

  const step: AgentStep = {
    turn: 0,
    toolCalls: [],
    response: msgContent,
    phase: "processing",
  };

  if (toolCalls.length > 0) {
    const newMsgs = [...messages, { role: "assistant", content: msgContent || null, tool_calls: toolCalls } as any];

    for (const tc of toolCalls) {
      const args = JSON.parse(tc.function.arguments);
      const result = await handler(tc.function.name, args);
      newMsgs.push({ role: "tool", tool_call_id: tc.id, content: result } as any);
      step.toolCalls.push({ name: tc.function.name, args, result: result.substring(0, 500) });
    }

    return { newMessages: newMsgs, steps: [step], finished: false, content: msgContent };
  }

  return {
    newMessages: [...messages, { role: "assistant", content: msgContent }],
    steps: [step],
    finished: true,
    content: msgContent,
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
      name: "check_completeness",
      description: "Check if a chapter has all required directories and files (notes/, questions/, flashcards/, quizzes/, revision/, core.md, concept_connection_map.md)",
      parameters: {
        type: "object",
        properties: {
          chapterPath: { type: "string", description: "Chapter directory path" },
        },
        required: ["chapterPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_placeholders",
      description: "Search for placeholder text patterns like 'Coming soon', 'TODO', 'Add more' in workspace files",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "final_report",
      description: "Call this when ALL work is complete. Provide a summary of everything generated and fixed.",
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

export const AGENT_SYSTEM_PROMPT = `You are an expert study material generator building a structured Obsidian vault. Transform raw markdown content into comprehensive, exam-ready materials following the workflow below.

VAULT STRUCTURE:
/<Subject>/
    core.md                                  # Subject homepage with chapter navigation
    /<Chapter>/
        core.md                              # Chapter homepage with topic navigation
        /notes/
            <topic1>.md                      # Ultra-detailed notes (400+ lines each)
            <topic2>.md
        /questions/
            100_questions.md                 # 100 questions with complete solutions
            100_mcqs.md                      # 100 MCQs with explanations
            solved.md                        # Solved examples
        /flashcards/
            100_flashcards.md                # 100 flashcards
        /quizzes/
            100_quizzes.md                   # 100 quizzes with answers
        /revision/
            formula_cheat_sheet.md
            one_shot_revision.md
            common_mistakes.md
            derivations.md
        concept_connection_map.md

WORKFLOW:
1. ANALYZE: Read the input, extract ALL topics. List every concept.
2. STRUCTURE: Create the vault directory structure using write_file.
3. NOTES: Generate one .md per topic (400+ lines each). Each note MUST include:
   - Opening hook / big question / real-world analogy
   - NCERT-level concept explanation with intuitive interpretation
   - Step-by-step mathematical formulation with variable tables
   - 3+ fully worked examples with complete step-by-step solutions
   - Common mistakes (5+ per topic)
   - Formula summary table
   - Memory techniques and mnemonics
   - Tags and wikilinks to related topics
4. QUESTIONS: Generate 100+ questions with complete solutions.
   - Easy (Q1-Q20): Direct formula application
   - Medium (Q21-Q60): Single concept, 2-3 steps
   - Hard (Q61-Q100): Multi-concept, exam-level
   EVERY question must have a complete solution, not just an answer.
5. MCQs: Generate 100+ MCQs. Each must explain why ALL options are right/wrong.
6. FLASHCARDS: Generate 100+ flashcards (conceptual, formula, comparison, common mistake).
7. QUIZZES: Generate 100+ quiz items with answers.
8. REVISION: Formula sheet, one-shot revision, common mistakes, derivations.
9. VERIFY: Use check_completeness to validate all directories exist.
10. SCAN: Use find_placeholders to catch any "Coming soon", "TODO", "(+100 questions)" text and fix them.
11. REPORT: Call final_report with a summary of everything generated.

RULES:
- Every file must have REAL content. No placeholders, no "Coming soon", no "(+X more)".
- Use LaTeX ($$...$$) for all formulas.
- Use === and --- for visual separation.
- Use bullet points, tables, callouts (>[!KEY-CONCEPT], >[!JEE-INSIGHT], >[!COMMON-MISTAKE]).
- Use wikilinks ([[Topic Name]]) for cross-references.
- Tag every file with #Subject #Chapter #Exam.
- Generate complete content for every section — do not skip or abbreviate.`;
