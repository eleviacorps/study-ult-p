import type { ToolDef } from "@/lib/llm-agent";

export interface SubAgentConfig {
  name: string;
  description: string;
  instruction: string;
  tools: ToolDef[];
}

export const SUB_AGENTS: SubAgentConfig[] = [
  {
    name: "note_agent",
    description: "Generate a single 400+ line JEE study note on one topic. Writes directly to workspace.",
    instruction: `You are a NOTE AGENT. Write ONE complete study note (400+ lines) on the given topic.
- Use the write_file tool to save the note to the specified path
- Include all sections: introduction, concept explanation, formulas, worked examples, common mistakes, JEE insights, memory tricks
- Use >[!KEY-CONCEPT], >[!JEE-INSIGHT], >[!COMMON-MISTAKE], >[!DEEP-INSIGHT], >[!INTUITION], >[!TIP], >[!IMPORTANT] callouts
- Use $$...$$ LaTeX for ALL formulas
- Use wikilinks [[Related Topic]]
- Include 4+ solved examples with step-by-step solutions
- Include 4+ common mistakes
- Target 400+ lines
- Output ONLY the note content — no explanations, no planning`,
    tools: [
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Save the note to a file. Include path and full content.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "Full note content" },
            },
            required: ["path", "content"],
          },
        },
      },
    ],
  },
  {
    name: "question_agent",
    description: "Generate 100 solved JEE questions. Writes directly to workspace.",
    instruction: `You are a QUESTION AGENT. Generate EXACTLY 100 solved JEE questions on the given chapter.
- Use write_file to save the complete question set
- Q1-Q20: Easy, Q21-Q60: Moderate, Q61-Q100: Hard
- Include: numerical, assertion-reason, statement-based, true/false, matching, comprehension types
- Each question must have: Problem, Solution, Answer
- Use >[!JEE-INSIGHT], >[!COMMON-MISTAKE] callouts
- Use $$...$$ LaTeX for ALL formulas`,
    tools: [
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Save questions to a file.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "Full questions content" },
            },
            required: ["path", "content"],
          },
        },
      },
    ],
  },
  {
    name: "mcq_agent",
    description: "Generate 100 JEE MCQs with explanations. Writes directly to workspace.",
    instruction: `You are an MCQ AGENT. Generate EXACTLY 100 JEE MCQs on the given chapter.
- Use write_file to save
- Each MCQ: Problem, 4 options with table, answer, explanation for ALL options
- Include assertion-reason, statement-combination types
- Use >[!SHORTCUT] callouts for quick solving tips`,
    tools: [
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Save MCQs to a file.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "Full MCQs content" },
            },
            required: ["path", "content"],
          },
        },
      },
    ],
  },
  {
    name: "flashcard_agent",
    description: "Generate 100 JEE flashcards. Writes directly to workspace.",
    instruction: `You are a FLASHCARD AGENT. Generate EXACTLY 100 JEE flashcards.
- Use write_file to save
- Each flashcard: Question, Answer, Formula, Memory Trick
- Include conceptual, formula, comparison, and common mistake types`,
    tools: [
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Save flashcards to a file.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "Full flashcards content" },
            },
            required: ["path", "content"],
          },
        },
      },
    ],
  },
  {
    name: "quiz_agent",
    description: "Generate 100 JEE quiz items. Writes directly to workspace.",
    instruction: `You are a QUIZ AGENT. Generate EXACTLY 100 JEE quiz items.
- Use write_file to save
- Each quiz: Question, 4 options, answer with reason
- Mix conceptual and numerical`,
    tools: [
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Save quizzes to a file.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "Full quizzes content" },
            },
            required: ["path", "content"],
          },
        },
      },
    ],
  },
  {
    name: "revision_agent",
    description: "Generate all 7 JEE revision files. Writes directly to workspace.",
    instruction: `You are a REVISION AGENT. Generate ALL 7 revision files.
- Use write_file for each file:
  1. formula_cheat_sheet.md — all formulas with explanations
  2. one_shot_revision.md — condensed chapter summary
  3. common_mistakes.md — 20+ common errors
  4. derivations.md — key derivations step-by-step
  5. exam_insights.md — JEE patterns and weightage
  6. graphs_visualizations.md — field patterns, graphs
  7. memory_techniques.md — mnemonics and tricks`,
    tools: [
      {
        type: "function",
        function: {
          name: "write_file",
          description: "Save revision file.",
          parameters: {
            type: "object",
            properties: {
              path: { type: "string", description: "File path" },
              content: { type: "string", description: "File content" },
            },
            required: ["path", "content"],
          },
        },
      },
    ],
  },
];
