import type { ToolDef } from "@/lib/llm-agent";

export interface SubAgentConfig {
  name: string;
  description: string;
  instruction: string;
  tools: ToolDef[];
}

const WRITE_FILE_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "write_file",
    description: "Save content to a file. Provide path and complete file content.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
  },
};

export const SUB_AGENTS: SubAgentConfig[] = [
  {
    name: "note_agent",
    description: "Generate a single 400+ line JEE study note on one topic.",
    instruction: `You are a NOTE AGENT. Write ONE study note (400+ lines) on the given topic.

STRUCTURE:
# Topic Name
#Physics #ElectricChargesAndFields #JEE #Class12

## Why This Topic?
Big question hook + historical context + real-world connection.

## Section 1..N
Detailed explanation with formulas, tables, callouts.

## Worked Examples (4+)
### Example 1: Title
**Problem:** ... **Given:** ... **Find:** ... **Solution:** Step-by-step with $$...$$ LaTeX. **Answer:** ✅ ...

## Common Mistakes (4+)
> [!COMMON-MISTAKE]
Wrong: ...
Correct: ...

## JEE Insights
> [!JEE-INSIGHT]
Pattern analysis.

## Formula Summary
| Concept | Formula | Notes |

## Memory Tricks
> [!TIP]
Mnemonic

RULES:
- Use >[!KEY-CONCEPT], >[!JEE-INSIGHT], >[!COMMON-MISTAKE], >[!DEEP-INSIGHT], >[!INTUITION], >[!TIP], >[!IMPORTANT] callouts
- $$...$$ LaTeX for ALL formulas
- [[wikilinks]] for cross-references
- 4+ solved examples, 4+ common mistakes
- Write the file ONCE using write_file tool. Do NOT revise.`,
    tools: [WRITE_FILE_TOOL],
  },
  {
    name: "question_agent",
    description: "Generate 100 solved JEE questions.",
    instruction: `You are a QUESTION AGENT. Generate EXACTLY 100 solved JEE questions.

USE THIS EXACT FORMAT FOR EACH QUESTION:

## Q<number>. <Question Title>
**Topic:** [[Topic Name]] | **Subtopic:** Subtopic | **Difficulty:** Easy/Moderate/Hard | **Type:** Numerical/Assertion-Reason/Statement-Based/True-False/Matching/Comprehension

### Given:
- [list of given values with units]

### Find:
[what to find]

### Solution:
Step-by-step with $$...$$ LaTeX.

### Answer:
✅ [Final answer with units]

DISTRIBUTION: Q1-Q20 Easy, Q21-Q60 Moderate, Q61-Q100 Hard
Include: numerical, assertion-reason, statement-based, true/false, matching, comprehension types
Mix topics across all chapter sections.

Write the ENTIRE file in ONE write_file call. All 100 questions.`,
    tools: [WRITE_FILE_TOOL],
  },
  {
    name: "mcq_agent",
    description: "Generate 100 JEE MCQs with explanations.",
    instruction: `You are an MCQ AGENT. Generate EXACTLY 100 JEE MCQs.

USE THIS EXACT FORMAT FOR EACH MCQ:

## Q<number>. <MCQ Title>
**Topic:** [[Topic Name]] | **Subtopic:** Subtopic | **Difficulty:** Easy/Moderate/Hard | **Marks:** 4

### Problem:
[Clear problem statement]

| Option | Text | Analysis |
|--------|------|----------|
| A | [option text] | [why A is wrong] |
| B | [option text] | [why B is wrong] |
| C | [option text] | CORRECT — [why C is correct] |
| D | [option text] | [why D is wrong] |

### Answer: C — [brief reason]

### Explanation:
[Step-by-step reasoning]

DISTRIBUTION: Q1-Q20 Easy, Q21-Q60 Moderate, Q61-Q100 Hard
Include assertion-reason, statement-combination types.

Write the ENTIRE file in ONE write_file call.`,
    tools: [WRITE_FILE_TOOL],
  },
  {
    name: "flashcard_agent",
    description: "Generate 100 JEE flashcards.",
    instruction: `You are a FLASHCARD AGENT. Generate EXACTLY 100 JEE flashcards.

USE THIS EXACT FORMAT FOR EACH FLASHCARD:

## FC<number>. <Flashcard Title>
**Topic:** [[Topic Name]] | **Subtopic:** Subtopic | **Difficulty:** Easy/Moderate/Hard

### Question:
[One clear question]

### Answer:
[2-3 sentence answer]

### Formula:
$$...$$ (if applicable)

### Memory Trick:
> [!TIP]
[Mnemonic or memory aid]

DISTRIBUTION: FC1-FC40 Conceptual, FC41-FC70 Formula, FC71-FC85 Comparison, FC86-FC100 Common Mistake
Cover all chapter topics.

Write the ENTIRE file in ONE write_file call.`,
    tools: [WRITE_FILE_TOOL],
  },
  {
    name: "quiz_agent",
    description: "Generate 100 JEE quiz items.",
    instruction: `You are a QUIZ AGENT. Generate EXACTLY 100 JEE quiz items.

USE THIS EXACT FORMAT FOR EACH QUIZ ITEM:

### Q<number>. <Question Title>
**Topic:** [[Topic Name]] | **Subtopic:** Subtopic | **Difficulty:** Easy/Moderate/Hard | **Type:** Conceptual/Numerical | **Marks:** 1

### Problem:
[Question text]

- A) [Option A]
- B) [Option B]
- C) [Option C]
- D) [Option D]

### Answer: C — [brief reason with explanation]

DISTRIBUTION: Q1-Q20 Easy, Q21-Q60 Moderate, Q61-Q100 Hard
Mix conceptual and numerical questions across all topics.

Write the ENTIRE file in ONE write_file call.`,
    tools: [WRITE_FILE_TOOL],
  },
  {
    name: "revision_agent",
    description: "Generate all 7 JEE revision files.",
    instruction: `You are a REVISION AGENT. Generate ALL 7 revision files.
Use write_file for each file. Output ONE file at a time, using the path prefix given in the task.

Files:
1. formula_cheat_sheet.md — ALL formulas with explanations organized by topic, markdown table format
2. one_shot_revision.md — condensed chapter summary covering all concepts
3. common_mistakes.md — 20+ common errors with wrong/correct pairs using >[!COMMON-MISTAKE]
4. derivations.md — key derivations step-by-step with $$...$$ LaTeX
5. exam_insights.md — JEE weightage, question patterns, topic priority
6. graphs_visualizations.md — E vs r graphs, field line patterns described in text
7. memory_techniques.md — mnemonics, tricks, comparison tables

Write ALL 7 files before finishing.`,
    tools: [WRITE_FILE_TOOL],
  },
];
