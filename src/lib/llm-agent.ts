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
  const body: Record<string, unknown> = {
    model: config.model || "deepseek-v4-flash",
    messages,
    max_tokens: 65536,
  };
  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const bUrl = config.baseUrl.replace(/\/+$/, "");
  const res = await fetch(`${bUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify(body),
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

export const AGENT_SYSTEM_PROMPT = `You are an expert JEE/board exam study material generator. Transform raw markdown content into comprehensive study materials.

You have tools to write files, check completeness, and scan for placeholders. Follow this workflow:

1. **Analyze** the input content and identify all topics covered
2. **Generate** structured notes for each topic (300+ lines each) with formulas, examples, JEE tips
3. **Generate** questions, flashcards, quizzes, and revision materials
4. **Verify** completeness — check ALL required directories exist
5. **Scan** for placeholders like "Coming soon" or "(+100 Questions)" and fix them
6. **Call final_report** when everything is done

IMPORTANT: Generate REAL content for every section. No placeholders, no "Coming soon". Every file must be complete and ready to study.`;

export const PHASE_LABELS: Record<string, string> = {
  analyze: "Analyzing input content",
  generate: "Generating structured notes",
  questions: "Creating questions & MCQs",
  flashcards: "Building flashcards",
  quizzes: "Writing quizzes",
  revision: "Creating revision materials",
  verify: "Verifying completeness",
  fix: "Fixing placeholders & gaps",
  done: "Complete",
};
