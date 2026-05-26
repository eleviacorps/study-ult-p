#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { resolve, dirname, relative, join } from "path";

const API_BASE = process.env.API_BASE || "https://opencode.ai/zen/v1";
const API_KEY = process.env.API_KEY || "";
const MODEL = process.env.MODEL || "deepseek-v4-flash";
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || "65536", 10);

const args = process.argv.slice(2);
function usage() {
  console.log(`
Usage: node scripts/note-agent.mjs [options]

Options:
  --input <file>       Input markdown file to process (required)
  --chapter <name>     Target chapter name (required)
  --vault <dir>        Vault root directory (default: PhysicsCh1)
  --subject <name>     Subject name (default: Physics)
  --api-key <key>      API key for the LLM (or set API_KEY env)
  --api-base <url>     API base URL (or set API_BASE env)
  --help               Show this help

Examples:
  node scripts/note-agent.mjs --input rough-notes.md --chapter "Electrostatics"
  node scripts/note-agent.mjs --input notes.md --chapter "Kinematics" --vault PhysicsCh1 --api-key sk-...
`);
  process.exit(0);
}

const help = args.includes("--help");
const inputFile = extractArg("--input");
const chapterName = extractArg("--chapter");
const vaultDir = extractArg("--vault") || "PhysicsCh1";
const subjectName = extractArg("--subject") || "Physics";

if (help) usage();
if (!inputFile || !chapterName) {
  console.error("Error: --input and --chapter are required");
  usage();
}
const vault = resolve(vaultDir);
if (!existsSync(vault)) {
  console.error(`Error: vault directory not found: ${vault}`);
  process.exit(1);
}
if (!existsSync(inputFile)) {
  console.error(`Error: input file not found: ${inputFile}`);
  process.exit(1);
}

function extractArg(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

const SYSTEM_PROMPT = `You are an expert JEE/board exam study material generator. Your task is to transform raw markdown content into highly structured, comprehensive study materials.

You have access to tools that let you read/write files in the vault. Use them to:

1. **Generate topic notes** — one file per topic in \`notes/\` directory, each 300+ lines with:
   - Key concepts with intuition-building explanations
   - Formulas with LaTeX ($$)
   - Solved examples with step-by-step reasoning
   - JEE tips and common traps
   - Practice questions with answers

2. **Generate questions** — \`questions/100_questions.md\` and \`questions/100_mcqs.md\`

3. **Generate flashcards** — \`flashcards/100_flashcards.md\` in Q&A format

4. **Generate quizzes** — \`quizzes/100_quizzes.md\` with MCQs

5. **Generate revision materials** — \`revision/\` with formula sheet, one-shot revision, common mistakes, derivations

6. **Update \`core.md\`** with proper wiki-links to all generated files

After generating, ALWAYS call verification tools to check:
- Did you generate ALL listed topics? (not just 4 out of 12)
- Are there any placeholder texts like "(+100 Questions more)" that need real content?
- Is the core.md properly updated?

IMPORTANT: Generate REAL content for every section. No placeholders, no "Coming soon", no "Add more here". Every file must be complete.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "list_vault",
      description: "List the contents of a directory in the vault",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory path relative to vault root (e.g. 'Units and Measurement/notes')" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the vault",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to vault root (e.g. 'Units and Measurement/core.md')" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file in the vault. Creates directories if needed.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to vault root (e.g. 'Units and Measurement/notes/topic.md')" },
          content: { type: "string", description: "Full file content in markdown" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_completeness",
      description: "Check if a chapter directory has all required subdirectories and files. Use after generating materials to verify completeness.",
      parameters: {
        type: "object",
        properties: {
          chapterPath: { type: "string", description: "Chapter directory path relative to vault root" },
        },
        required: ["chapterPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_placeholders",
      description: "Search for placeholder text patterns like 'Coming soon', 'Add more', '(+100 Questions more)', 'TODO', etc. in the chapter files.",
      parameters: {
        type: "object",
        properties: {
          chapterPath: { type: "string", description: "Chapter directory path relative to vault root" },
        },
        required: ["chapterPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Delete a file from the vault",
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
      name: "final_report",
      description: "Call this when ALL work is complete. Provide a summary of everything that was generated, verified, and fixed.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Summary of all work done" },
          filesCreated: { type: "array", items: { type: "string" }, description: "List of all files created" },
          filesModified: { type: "array", items: { type: "string" }, description: "List of files modified" },
          issuesFixed: { type: "array", items: { type: "string" }, description: "Issues found and fixed" },
        },
        required: ["summary", "filesCreated", "filesModified", "issuesFixed"],
      },
    },
  },
];

function callApi(messages, tools = null) {
  const body = {
    model: MODEL,
    messages,
    max_tokens: MAX_TOKENS,
  };
  if (tools) body.tools = tools;
  if (tools) body.tool_choice = "auto";

  return fetch(`${API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function executeToolCall(toolCall) {
  const { name, arguments: args } = toolCall.function;
  const parsed = JSON.parse(args);

  switch (name) {
    case "list_vault": {
      const fullPath = resolve(vault, parsed.path);
      if (!existsSync(fullPath)) return JSON.stringify({ error: "Directory not found", path: parsed.path });
      const entries = readdirSync(fullPath).map((e) => {
        const full = join(fullPath, e);
        return { name: e, type: statSync(full).isDirectory() ? "directory" : "file", size: statSync(full).size };
      });
      return JSON.stringify({ path: parsed.path, entries });
    }

    case "read_file": {
      const fullPath = resolve(vault, parsed.path);
      if (!existsSync(fullPath)) return JSON.stringify({ error: "File not found", path: parsed.path });
      const content = readFileSync(fullPath, "utf-8");
      return JSON.stringify({ path: parsed.path, content, size: content.length });
    }

    case "write_file": {
      const fullPath = resolve(vault, parsed.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, parsed.content, "utf-8");
      return JSON.stringify({ success: true, path: parsed.path, bytes: parsed.content.length });
    }

    case "delete_file": {
      const fullPath = resolve(vault, parsed.path);
      if (!existsSync(fullPath)) return JSON.stringify({ error: "File not found", path: parsed.path });
      const { rmSync } = await import("fs");
      rmSync(fullPath);
      return JSON.stringify({ success: true, path: parsed.path });
    }

    case "check_completeness": {
      const chapterPath = resolve(vault, parsed.chapterPath);
      if (!existsSync(chapterPath)) return JSON.stringify({ error: "Chapter directory not found" });

      const required = {
        notes: { type: "dir", minFiles: 1, label: "Topic notes" },
        questions: { type: "dir", minFiles: 1, label: "Questions" },
        flashcards: { type: "dir", minFiles: 1, label: "Flashcards" },
        quizzes: { type: "dir", minFiles: 1, label: "Quizzes" },
        revision: { type: "dir", minFiles: 1, label: "Revision materials" },
        "core.md": { type: "file", label: "Chapter core.md" },
        "concept_connection_map.md": { type: "file", label: "Concept connection map" },
      };

      const results = [];
      for (const [name, spec] of Object.entries(required)) {
        const full = resolve(chapterPath, name);
        if (spec.type === "dir") {
          if (existsSync(full) && statSync(full).isDirectory()) {
            const files = readdirSync(full).filter((f) => f.endsWith(".md"));
            results.push({
              name,
              label: spec.label,
              status: files.length >= spec.minFiles ? "ok" : "incomplete",
              files: files.length,
              minFiles: spec.minFiles,
            });
          } else {
            results.push({ name, label: spec.label, status: "missing", files: 0, minFiles: spec.minFiles });
          }
        } else {
          if (existsSync(full) && statSync(full).isFile()) {
            results.push({ name, label: spec.label, status: "ok", size: statSync(full).size });
          } else {
            results.push({ name, label: spec.label, status: "missing" });
          }
        }
      }
      return JSON.stringify({ chapter: parsed.chapterPath, results });
    }

    case "find_placeholders": {
      const chapterPath = resolve(vault, parsed.chapterPath);
      if (!existsSync(chapterPath)) return JSON.stringify({ error: "Chapter directory not found" });

      const patterns = [/coming soon/i, /add more/i, /todo/i, /placeholder/i, /\(\+?\d+\s*Questions?\s*more?\)/i, /more questions?/i, /^\s*$/, /^# .*\n\n$/m];
      const placeholders = [];

      function scanDir(dir, rel) {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          const relPath = rel ? `${rel}/${entry}` : entry;
          if (statSync(full).isDirectory()) {
            if (entry !== ".obsidian") scanDir(full, relPath);
          } else if (entry.endsWith(".md")) {
            const content = readFileSync(full, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              for (const pat of patterns) {
                if (pat.test(lines[i]) && lines[i].trim()) {
                  placeholders.push({ file: relPath, line: i + 1, text: lines[i].trim().substring(0, 80) });
                  break;
                }
              }
            }
          }
        }
      }
      scanDir(chapterPath, parsed.chapterPath);
      return JSON.stringify({ chapter: parsed.chapterPath, placeholders, count: placeholders.length });
    }

    case "final_report": {
      return JSON.stringify({ type: "final_report", ...parsed });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

function visualizeTool(toolCall) {
  const { name, arguments: args } = toolCall.function;
  const parsed = JSON.parse(args);
  switch (name) {
    case "write_file":
      return `Writing ${parsed.path} (${parsed.content.length} chars)`;
    case "read_file":
      return `Reading ${parsed.path}`;
    case "list_vault":
      return `Listing ${parsed.path}`;
    case "delete_file":
      return `Deleting ${parsed.path}`;
    case "check_completeness":
      return `Checking completeness of ${parsed.chapterPath}`;
    case "find_placeholders":
      return `Scanning for placeholders in ${parsed.chapterPath}`;
    case "final_report":
      return "Generating final report...";
    default:
      return `${name}(${args.substring(0, 60)})`;
  }
}

function visualizePhase(toolCalls, index, total) {
  const desc = toolCalls.map((tc) => visualizeTool(tc)).join(", ");
  return `[${index + 1}/${total}] ${desc}`;
}

async function runAgent() {
  const inputContent = readFileSync(inputFile, "utf-8");
  const userMessage = `Process this markdown content into structured study materials for the chapter "${chapterName}" under subject "${subjectName}" in the vault at "${vault}".

First, read the existing vault structure to understand what's already there. Then generate all missing materials.

Input content:
\`\`\`markdown
${inputContent}
\`\`\``;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT + `\n\nThe vault root is: ${vault}\nThe chapter being processed is: ${chapterName}\nAlways use paths relative to the vault root. For example, files for this chapter go in "${chapterName}/notes/...", "${chapterName}/core.md", etc.` },
    { role: "user", content: userMessage },
  ];

  console.log(`\n\x1b[36m=== Note Agent v1 ===\x1b[0m`);
  console.log(`Input: ${inputFile}`);
  console.log(`Chapter: ${chapterName}`);
  console.log(`Vault: ${vault}`);
  console.log(`Model: ${MODEL}\n`);

  const MAX_TURNS = parseInt(process.env.MAX_TURNS || "50", 10);
  let turn = 0;
  let finalReport = null;

  while (turn < MAX_TURNS) {
    turn++;
    console.log(`\x1b[33m--- Turn ${turn} ---\x1b[0m`);

    const response = await callApi(messages, TOOLS);
    if (!response.ok) {
      const err = await response.text().catch(() => "");
      console.error(`\x1b[31mAPI error (${response.status}): ${err}\x1b[0m`);
      break;
    }

    const result = await response.json();
    const choice = result.choices?.[0];
    if (!choice) {
      console.error("\x1b[31mNo response from API\x1b[0m");
      break;
    }

    // Extract content from either field
    const msgContent = choice.message?.content || choice.message?.reasoning_content || "";

    if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls) {
      const toolCalls = choice.message.tool_calls;
      messages.push(choice.message);
      console.log(`\x1b[90m${visualizePhase(toolCalls, 0, 1)}\x1b[0m`);

      for (let i = 0; i < toolCalls.length; i++) {
        const tc = toolCalls[i];
        const desc = visualizeTool(tc);
        process.stdout.write(`  \x1b[90m├─ ${desc}...\x1b[0m`);
        const result = await executeToolCall(tc);
        process.stdout.write(` \x1b[32mdone\x1b[0m\n`);
        messages.push({ role: "tool", tool_call_id: tc.id, content: result });
      }

      if (msgContent) {
        console.log(`\x1b[90m  └─ ${msgContent.substring(0, 200)}${msgContent.length > 200 ? "..." : ""}\x1b[0m`);
      }
    } else if (choice.finish_reason === "stop" || choice.finish_reason === "end_turn" || choice.finish_reason === "length") {
      if (choice.finish_reason === "length") {
        console.log(`\x1b[33mWarning: Token limit reached. Continuing...\x1b[0m`);
      }
      if (msgContent) {
        console.log(`\n${msgContent.substring(0, 500)}${msgContent.length > 500 ? "..." : ""}\n`);
      }

      if (!msgContent) {
        messages.push(choice.message || { role: "assistant", content: "" });
        messages.push({ role: "user", content: "Your response was empty. Please continue the work. If you are done, call final_report." });
        continue;
      }

      // Check if this is the final report
      try {
        const parsed = JSON.parse(msgContent);
        if (parsed.type === "final_report") {
          finalReport = parsed;
          break;
        }
      } catch {}

      // Try to detect if the agent thinks it's done
      if (msgContent.toLowerCase().includes("final report") || msgContent.toLowerCase().includes("all done") || msgContent.toLowerCase().includes("all complete") || msgContent.toLowerCase().includes("finished generating")) {
        console.log(`\x1b[32mAgent indicates completion. Use --continue if you want to resume.\x1b[0m`);
        finalReport = { summary: msgContent };
        break;
      }

      // Add a nudge to continue
      messages.push(choice.message);
      messages.push({
        role: "user",
        content: "Continue working. If you are done with all tasks, call the final_report tool with a summary of everything you did.",
      });
    } else {
      // Unexpected finish reason
      if (msgContent) {
        console.log(`\n${msgContent}\n`);
      }
      console.log(`\x1b[33mFinish reason: ${choice.finish_reason}\x1b[0m`);
      break;
    }
  }

  console.log(`\n\x1b[36m=== Agent Finished ===\x1b[0m`);
  if (finalReport) {
    if (finalReport.summary) console.log(`\nSummary: ${finalReport.summary}`);
    if (finalReport.filesCreated) console.log(`Files created: ${finalReport.filesCreated.length}`);
    if (finalReport.filesModified) console.log(`Files modified: ${finalReport.filesModified.length}`);
    if (finalReport.issuesFixed) console.log(`Issues fixed: ${finalReport.issuesFixed.length}`);
  }
  console.log(`Total turns: ${turn}\n`);
}

runAgent().catch((err) => {
  console.error(`\x1b[31mFatal error: ${err.message}\x1b[0m`);
  process.exit(1);
});
