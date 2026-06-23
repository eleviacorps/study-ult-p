/**
 * Separate parser for MCQ content.
 * Handles the specific format where ### Problem: contains
 * both the problem text AND the options table without a blank line.
 */

export interface McqData {
  id: string;
  number: number;
  title: string;
  topic: string;
  subtopic: string;
  difficulty: string;
  marks: string;
  problem: string;       // problem text only (no table)
  options: { label: string; text: string; analysis: string }[];
  answer: string;
  explanation: string;
  rawTable: string;      // just the markdown table
}

/**
 * Parse MCQ blocks from vault content.
 * Expected format:
 *   ## Q<num>. <title>
 *   **Topic:** ... | **Subtopic:** ... | **Difficulty:** ... | **Marks:** ...
 *   ### Problem:
 *   Problem text with $...$ math
 *   | Option | Text | Analysis |
 *   |--------|------|----------|
 *   | A | ... | ... |
 *   ### Answer: ...
 *   ### Explanation: ...
 */
export function parseMcqs(content: string): McqData[] {
  const blocks = content.split(/^##\s+Q(\d+)\./m).filter(Boolean);
  const results: McqData[] = [];

  for (let i = 1; i + 1 < blocks.length; i += 2) {
    const num = parseInt(blocks[i], 10);
    const raw = blocks[i + 1];

    const titleLine = raw.split("\n")[0]?.trim() || "";

    const topic = raw.match(/\*\*Topic:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "";
    const subtopic = raw.match(/\*\*Subtopic:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "";
    const difficulty = raw.match(/\*\*Difficulty:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "";
    const marks = raw.match(/\*\*Marks:\*\*\s*(.+?)(?:\||$)/)?.[1]?.trim() || "";

    // Extract ### Problem: section (everything between ### Problem: and next ### or ## or end)
    const probMatch = raw.match(/### Problem:\s*\n([\s\S]*?)(?=\n###\s|\n##\s|$)/i);
    const probContent = probMatch ? probMatch[1].trim() : "";

    // Split problem content: text before the options table vs. the table itself
    const tableMatch = probContent.match(/^(\|.+\|.+\|.*)$[\s\S]*/m);
    const problem = tableMatch
      ? probContent.substring(0, probContent.indexOf(tableMatch[1])).trim()
      : probContent;
    const rawTable = tableMatch ? tableMatch[0] : "";

    // Parse options table
    const options: { label: string; text: string; analysis: string }[] = [];
    if (rawTable) {
      const rows = rawTable.split("\n").filter((l) => l.trim().startsWith("|") && !l.includes("---"));
      for (const row of rows) {
        const cells = row.split("|").filter((c) => c.trim());
        if (cells.length >= 3) {
          options.push({
            label: cells[0].trim(),
            text: cells[1].trim(),
            analysis: cells[2].trim(),
          });
        }
      }
    }

    // Extract Answer and Explanation
    const answerMatch = raw.match(/### Answer:\s*(.+?)(?:\n|$)/i);
    const answer = answerMatch ? answerMatch[1].trim() : "";

    // Explanation is everything after ### Answer: up to next ###
    const explMatch = raw.match(/### Explanation:\s*\n([\s\S]*?)(?=\n###\s|\n##\s|$)/i);
    const explanation = explMatch ? explMatch[1].trim() : raw.match(/### Explanation:\s*(.+?)(?:\n|$)/i)?.[1]?.trim() || "";

    results.push({
      id: `mcq-${num}`,
      number: num,
      title: titleLine,
      topic,
      subtopic,
      difficulty,
      marks,
      problem,
      options,
      answer,
      explanation,
      rawTable,
    });
  }

  return results;
}
