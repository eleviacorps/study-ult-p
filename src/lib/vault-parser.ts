import fs from "fs";
import path from "path";
import type {
  ChapterMeta,
  Note,
  Question,
  Flashcard,
  QuizQuestion,
  ConceptConnection,
  GraphData,
  GraphNode,
  GraphLink,
  WikiLink,
  VaultContent,
  VaultRoot,
} from "@/types";

const DEFAULT_VAULT_ROOTS: VaultRoot[] = [
  { root: path.join(process.cwd(), "PhysicsCh1"), subject: "Physics" },
];

function getResolvedRoots(extra?: VaultRoot[]): VaultRoot[] {
  const merged = [...DEFAULT_VAULT_ROOTS];
  if (extra) {
    for (const r of extra) {
      const resolved = path.isAbsolute(r.root) ? r.root : path.join(process.cwd(), r.root);
      if (!merged.some((m) => m.root === resolved)) {
        merged.push({ root: resolved, subject: r.subject });
      }
    }
  }
  return merged;
}

function resolveFileInfo(filePath: string, roots: VaultRoot[]): { relative: string; subject: string; chapter: string; root: string } {
  for (const { root, subject } of roots) {
    if (!filePath.startsWith(root)) continue;
    const relative = path.relative(root, filePath);
    const parts = relative.split(path.sep);
    const chapterIdx = (subject === "Physics" && parts[0] === "Physics") ? 1 : 0;
    const chapter = parts.length > chapterIdx ? parts[chapterIdx]?.replace(/[_\-]/g, " ") || "General" : "General";
    return { relative, subject, chapter, root };
  }
  return { relative: filePath, subject: "General", chapter: "General", root: "" };
}

function readFile(p: string): string {
  return fs.readFileSync(p, "utf-8");
}

function parseTags(content: string): string[] {
  const tagLine = content.match(/^#[\w\s#]+$/m);
  if (!tagLine) return [];
  return tagLine[0]
    .split(/#\s*/)
    .filter(Boolean)
    .map((t) => t.trim());
}

function parseWikiLinks(content: string): WikiLink[] {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links: WikiLink[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1];
    const parts = raw.split("|");
    links.push({
      target: parts[0].trim(),
      display: parts[1]?.trim(),
      raw: match[0],
    });
  }
  return links;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function scanDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDir(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function findAllMdFiles(roots: VaultRoot[]): string[] {
  const results: string[] = [];
  for (const { root } of roots) {
    if (!fs.existsSync(root)) continue;
    results.push(...scanDir(root));
  }
  return results;
}

function getAllChapters(roots: VaultRoot[]): { name: string; path: string; subject: string }[] {
  const chapters: { name: string; path: string; subject: string }[] = [];

  for (const { root, subject } of roots) {
    if (!fs.existsSync(root)) continue;
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      if (subject === "Physics" && entry.name === "Physics") {
        const physicsDir = path.join(root, "Physics");
        const subEntries = fs.readdirSync(physicsDir, { withFileTypes: true });
        for (const sub of subEntries) {
          if (!sub.isDirectory() || sub.name.startsWith(".")) continue;
          chapters.push({
            name: sub.name.replace(/_/g, " "),
            path: path.join("Physics", sub.name),
            subject,
          });
        }
      } else {
        chapters.push({
          name: entry.name.replace(/-/g, " "),
          path: entry.name,
          subject,
        });
      }
    }
  }

  return chapters;
}

function parseMetadataTable(content: string): Record<string, string> {
  const tableRegex =
    /\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|/g;
  const meta: Record<string, string> = {};
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    meta[match[1].trim()] = match[2].trim();
  }
  return meta;
}

function extractTitle(content: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : "Untitled";
}

function parseNotes(roots: VaultRoot[]): Note[] {
  const allFiles = findAllMdFiles(roots);
  const notes: Note[] = [];

  for (const filePath of allFiles) {
    const { relative, subject, chapter } = resolveFileInfo(filePath, roots);
    if (
      relative.includes("questions") ||
      relative.includes("flashcards") ||
      relative.includes("quizzes") ||
      relative.includes("revision") ||
      relative.includes("concept_connection")
    )
      continue;

    const content = readFile(filePath);
    const title = extractTitle(content);
    const tags = parseTags(content);
    const links = parseWikiLinks(content);

    notes.push({
      id: slugify(relative.replace(/\.md$/, "")),
      title,
      path: relative,
      chapter,
      subject,
      author: "",
      tags,
      content,
      links,
      backlinks: [],
    });
  }

  for (const note of notes) {
    for (const link of note.links) {
      const targetNote = notes.find(
        (n) =>
          slugify(n.title) === slugify(link.target) ||
          n.path.includes(slugify(link.target))
      );
      if (targetNote) {
        targetNote.backlinks.push(note.title);
      }
    }
  }

  return notes;
}

function parseQuestions(roots: VaultRoot[]): Question[] {
  const allFiles = findAllMdFiles(roots);
  const questions: Question[] = [];

  for (const filePath of allFiles) {
    const { relative, subject, chapter } = resolveFileInfo(filePath, roots);
    if (!relative.includes("questions")) continue;

    const content = readFile(filePath);

    const questionBlocks = content
      .split(/^##\s+Q\d+/m);
    const qContentBlocks = questionBlocks.slice(1).filter((b) => b.trim());
    const titles = content.match(/^##\s+(Q\d+.+)$/gm) || [];

    qContentBlocks.forEach((block, i) => {
      const titleMatch = titles[i]?.match(/^##\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Question ${i + 1}`;

      const topicMatch = block.match(/\*\*Topic:\*\*\s*(.+)/);
      const diffMatch = block.match(/\*\*Difficulty:\*\*\s*(.+)/);
      const marksMatch = block.match(/\*\*Marks:\*\*\s*(\d+)/);
      const subtopicMatch = block.match(/\*\*Subtopic:\*\*\s*(.+)/);
      const typeMatch = block.match(/\*\*Type:\*\*\s*(.+)/);
      const examMatch = block.match(/\*\*Exam:\*\*\s*(.+)/);

      // ── Extract given/find from various section formats ──
      // Try standard Given/Find first, then Problem (MCQ template), then assertion/passage/matching
      const givenMatch = block.match(/### Given:\s*\n([\s\S]*?)(?=###|$)/);
      const findMatch = block.match(/### Find:\s*\n([\s\S]*?)(?=###|$)/);
      const problemMatch = block.match(/### Problem:\s*\n([\s\S]*?)(?=###|$)/);
      const approachMatch = block.match(/### Approach:\s*\n([\s\S]*?)(?=###|$)/i);

      // ── Assertion-Reason format ──
      const assertionMatch = block.match(/### Assertion\s*\(A\):\s*\n([\s\S]*?)(?=###|$)/i);
      const reasonMatch = block.match(/### Reason\s*\(R\):\s*\n([\s\S]*?)(?=###|$)/i);

      // ── Matching format ──
      const col1Match = block.match(/### Column I[^\n]*\s*\n([\s\S]*?)(?=###|$)/i);
      const col2Match = block.match(/### Column II[^\n]*\s*\n([\s\S]*?)(?=###|$)/i);

      // ── Comprehension/Passage format ──
      const passageMatch = block.match(/### Passage:\s*\n([\s\S]*?)(?=###|$)/i);

      // ── Statement-Based format ──
      const statementsMatch = block.match(/### Statements:\s*\n([\s\S]*?)(?=###|$)/i);

      // ── Build `given` from available sections ──
      let given = givenMatch?.[1]?.trim() || problemMatch?.[1]?.trim() || "";
      if (assertionMatch || reasonMatch) {
        const a = assertionMatch?.[1]?.trim() || "";
        const r = reasonMatch?.[1]?.trim() || "";
        given = `**Assertion (A):** ${a}\n\n**Reason (R):** ${r}`;
      } else if (col1Match || col2Match) {
        const c1 = col1Match?.[1]?.trim() || "";
        const c2 = col2Match?.[1]?.trim() || "";
        given = `**Column I:**\n${c1}\n\n**Column II:**\n${c2}`;
      } else if (passageMatch) {
        given = passageMatch[1].trim();
      } else if (statementsMatch) {
        given = statementsMatch[1].trim();
      }

      const find = findMatch?.[1]?.trim() || "";

      // ── Extract options from various formats ──
      let options: { label: string; text: string }[] | undefined;

      // 1. Standard ### Options: with A) / B) / C) / D) format
      const optionsMatch = block.match(/### Options:\s*\n([\s\S]*?)(?=###|$)/);
      if (optionsMatch) {
        const optText = optionsMatch[1];
        const optRegex = /([A-D])\)\s*(.+?)(?:\n|$)/g;
        let m;
        options = [];
        while ((m = optRegex.exec(optText)) !== null) {
          options.push({ label: m[1], text: m[2].trim() });
        }
      }

      // 2. MCQ table format: | A | [Option text] | [Why wrong] |
      if (!options || options.length === 0) {
        const tableRowRegex = /^\|\s*([A-D])\s*\|\s*([^|]+?)\s*\|(?:[^|]*)\|\s*$/gm;
        const tableOptions: { label: string; text: string }[] = [];
        let tm;
        while ((tm = tableRowRegex.exec(block)) !== null) {
          tableOptions.push({ label: tm[1], text: tm[2].trim() });
        }
        if (tableOptions.length >= 2) options = tableOptions;
      }

      // 3. Assertion-reason standard options (if no explicit ### Options found but assertion detected)
      if ((!options || options.length === 0) && (assertionMatch || reasonMatch)) {
        // Try matching the option format within the block directly (without ### Options header)
        const arOptionRegex = /([A-E])\)\s*(Both A and R|A is true|A is false)/g;
        const arOptions: { label: string; text: string }[] = [];
        let ar;
        while ((ar = arOptionRegex.exec(block)) !== null) {
          arOptions.push({ label: ar[1], text: ar[2].trim() });
        }
        if (arOptions.length >= 2) options = arOptions;
      }

      // 4. Fallback: bullet list options: - A) text / * A) text / - A. text
      if (!options || options.length === 0) {
        const bulletOptRegex = /^[\-\*]\s+([A-D])\)\s*(.+)$/gm;
        const bulletOptions: { label: string; text: string }[] = [];
        let bm;
        while ((bm = bulletOptRegex.exec(block)) !== null) {
          bulletOptions.push({ label: bm[1], text: bm[2].trim() });
        }
        if (bulletOptions.length >= 2) options = bulletOptions;
      }

      // ── Extract solution ──
      const solutionMatch = block.match(
        /### Solution:\s*\n([\s\S]*?)(?=###\s+Answer|### Explanation|$)/i
      );
      // Also try ### Detailed Explanation as solution fallback
      const detailedExplanationMatch = block.match(
        /### Detailed Explanation:\s*\n([\s\S]*?)(?=###|$)/i
      );
      const solution = solutionMatch?.[1]?.trim() || detailedExplanationMatch?.[1]?.trim() || "";

      // ── Extract answer ──
      const answerMatch = block.match(/### Answer:\s*\n([\s\S]*?)(?=$|\n---|\n##)/);
      let answer = answerMatch?.[1]?.trim() || "";
      // If answer is empty, try extracting from Explanation block (MCQ template puts answer there)
      if (!answer) {
        const answerInline = block.match(/\*\*Answer:\*\*\s*(.+)/);
        if (answerInline) answer = answerInline[1].trim();
      }

      // ── Extract explanation (from ### Explanation: or ### Why Other Options Are Wrong or Detailed Explanation) ──
      const explanationMatch = block.match(/### Explanation:\s*\n([\s\S]*?)$/);
      const whyWrongMatch = block.match(
        />\s*\[!WHY-WRONG\]\s*\n((?:>\s*.*\n?)*)/i
      );
      let explanation = explanationMatch?.[1]?.trim() || "";
      if (!explanation && whyWrongMatch) {
        explanation = whyWrongMatch[1].split("\n").map((l) => l.replace(/^>\s?/, "")).join("\n").trim();
      }

      // ── Extract {EXAM_NAME} Insight / Common Trap ──
      const insightMatch = block.match(
        />\s*\[!(?:EXAM-INSIGHT|SHORTCUT|JEE-INSIGHT)\]\s*\n((?:>\s*.*\n?)*)/i
      );
      const trapMatch = block.match(/### Common Trap:\s*\n([\s\S]*?)(?=###|$)/i);
      if (trapMatch && !explanation) {
        explanation = trapMatch[1].trim();
      }

      // ── Build tags ──
      const tags = parseTags(content);
      const questionType = typeMatch?.[1]?.trim() || "";
      if (questionType && !tags.includes(questionType)) {
        tags.push(questionType);
      }

      // ── Determine question type (mcq or solved) ──
      const isMcq = !!(options && options.length >= 2) ||
        !!assertionMatch || !!col1Match || !!passageMatch;

      questions.push({
        id: slugify(`${chapter}-q${i + 1}`),
        title,
        chapter,
        subject,
        topic: topicMatch?.[1]?.trim() || "",
        subtopic: subtopicMatch?.[1]?.trim(),
        difficulty: (diffMatch?.[1]?.trim() || "Moderate") as
          | "Easy"
          | "Moderate"
          | "Hard",
        marks: marksMatch ? parseInt(marksMatch[1]) : 4,
        given: given || undefined,
        find: find || undefined,
        options: isMcq ? options : undefined,
        solution,
        answer,
        explanation: explanation || undefined,
        tags,
        type: isMcq ? "mcq" : "solved",
      });
    });
  }

  return questions;
}

function cleanMdText(text: string): string {
  return text
    .replace(/^>\s*/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/^\s*✅\s*/gm, "")
    .replace(/^\s*⚠️\s*/gm, "")
    .trim();
}

type ParsedBlock = Map<string, string>;

function parseBlockByHeadings(block: string): ParsedBlock {
  const result = new Map<string, string>();
  const lines = block.split("\n");
  let currentKey = "";
  let currentValue: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hMatch = line.match(/^#{1,4}\s+([A-Za-z][A-Za-z\s]*?):?\s*$/);
    const boldHMatch = line.match(/^\*\*([A-Z][A-Za-z\s]*?):?\*\*\s*$/);

    if (hMatch) {
      if (currentKey) {
        result.set(currentKey.toLowerCase(), currentValue.join("\n"));
      }
      currentKey = hMatch[1].trim();
      currentValue = [];
      continue;
    }

    if (boldHMatch) {
      if (currentKey) {
        result.set(currentKey.toLowerCase(), currentValue.join("\n"));
      }
      currentKey = boldHMatch[1].trim();
      currentValue = [];
      continue;
    }

    const boldInlineMatch = line.match(
      /^\*\*([A-Z][A-Za-z\s]*?):\*\*\s+(.+)$/
    );
    if (boldInlineMatch) {
      if (currentKey) {
        result.set(currentKey.toLowerCase(), currentValue.join("\n"));
      }
      currentKey = boldInlineMatch[1].trim();
      currentValue = [boldInlineMatch[2]];
      continue;
    }

    if (currentKey) {
      currentValue.push(line);
    }
  }

  if (currentKey) {
    result.set(currentKey.toLowerCase(), currentValue.join("\n"));
  }

  return result;
}

export function parseFlashcards(roots: VaultRoot[]): Flashcard[] {
  const allFiles = findAllMdFiles(roots);
  const flashcards: Flashcard[] = [];

  for (const filePath of allFiles) {
    const { relative, subject, chapter } = resolveFileInfo(filePath, roots);
    if (!relative.includes("flashcards")) continue;

    const content = readFile(filePath);
    const tags = parseTags(content);

    const fcBlocks = content.split(/^##\s+FC\d+/m);
    const fcContentBlocks = fcBlocks.slice(1).filter((b) => b.trim());
    const titles = content.match(/^##\s+(FC\d+.+)$/gm) || [];

    fcContentBlocks.forEach((block, i) => {
      const titleMatch = titles[i]?.match(/^##\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : `Flashcard ${i + 1}`;

      const parsed = parseBlockByHeadings(block);

      const topicMatch = block.match(/\*\*Topic:\*\*\s*(.+)/);
      let topic = topicMatch?.[1]?.trim() || "";
      topic = topic.replace(/\[\[|\]\]/g, "").replace(/\|.+$/, "").trim();

      const subMatch = block.match(/\*\*Subtopic:\*\*\s*(.+)/);
      const typeMatch = block.match(/\*\*Type:\*\*\s*(.+)/);

      const rawQuestion =
        parsed.get("question") || parsed.get("q") || title;
      const rawAnswer = parsed.get("answer") || parsed.get("a") || "";
      const rawFormula = parsed.get("formula");
      const rawMemory =
        parsed.get("memory trick") ||
        parsed.get("memory") ||
        parsed.get("memory trick");

      const questionText = cleanMdText(rawQuestion);
      const answerText = cleanMdText(rawAnswer);
      const formulaText = rawFormula ? cleanMdText(rawFormula) : undefined;
      const trickText = rawMemory ? cleanMdText(rawMemory) : undefined;

      flashcards.push({
        id: slugify(`${chapter}-fc${i + 1}`),
        chapter,
        subject,
        topic,
        subtopic: subMatch?.[1]?.trim(),
        type: typeMatch?.[1]?.trim() || "Conceptual",
        question: questionText,
        answer: answerText,
        formula: formulaText,
        variableMeanings: [],
        memoryTrick: trickText,
        tags,
      });
    });
  }

  return flashcards;
}

function parseQuizzes(roots: VaultRoot[]): QuizQuestion[] {
  const allFiles = findAllMdFiles(roots);
  const quizzes: QuizQuestion[] = [];

  for (const filePath of allFiles) {
    const { relative, chapter } = resolveFileInfo(filePath, roots);
    if (!relative.includes("quizzes")) continue;

    const content = readFile(filePath);

    const quizBlocks = content
      .split(/^###\s+Q\d+/m)
      .filter((b) => b.trim());

    quizBlocks.forEach((block, i) => {
      const qText = block.split("\n").find((l) => l.trim().endsWith("?"))?.trim() || "";
      const options: { label: string; text: string; correct: boolean }[] = [];
      const optRegex = /([A-D])\)\s*(.+?)(\s*✅)?$/gm;
      let m;
      while ((m = optRegex.exec(block)) !== null) {
        options.push({
          label: m[1],
          text: m[2].trim(),
          correct: !!m[3],
        });
      }

      quizzes.push({
        id: slugify(`${chapter}-quiz-q${i + 1}`),
        chapter,
        question: qText,
        options,
      });
    });
  }

  return quizzes;
}

function parseConceptConnections(roots: VaultRoot[]): ConceptConnection[] {
  const allFiles = findAllMdFiles(roots);
  const connections: ConceptConnection[] = [];

  for (const filePath of allFiles) {
    const { relative, chapter } = resolveFileInfo(filePath, roots);
    if (!relative.includes("concept_connection")) continue;

    const content = readFile(filePath);

    const chainSection = content.match(
      /## Prerequisite Chain\s*\n([\s\S]*?)(?=##|$)/
    );
    const chain: string[] = [];
    if (chainSection) {
      const lines = chainSection[1].split("\n");
      for (const line of lines) {
        const arrow = line.match(/^\s*\*\*\s*(.+?)\*\*\s*→/);
        if (arrow) chain.push(arrow[1].trim());
      }
    }

    const relSection = content.match(
      /## Formula Relationships\s*\n([\s\S]*?)(?=##|$)/
    );
    const relationships: { from: string; to: string; description: string }[] =
      [];
    if (relSection) {
      const relBlocks = relSection[1].split(/^###\s+/m).filter((b) => b.trim());
      for (const block of relBlocks) {
        const arrowMatch = block.match(/^(.+?)\s*→\s*(.+)/m);
        const descMatch = block.match(
          /\*\*Relationship:\*\*\s*(.+)/i
        );
        if (arrowMatch) {
          relationships.push({
            from: arrowMatch[1].trim(),
            to: arrowMatch[2].trim(),
            description: descMatch?.[1]?.trim() || "",
          });
        }
      }
    }

    connections.push({ chapter, chain, relationships });
  }

  return connections;
}

function parseChapters(roots: VaultRoot[]): ChapterMeta[] {
  const chapters = getAllChapters(roots);
  const notes = parseNotes(roots);

  return chapters.map((ch) => {
    const chapterNotes = notes.filter((n) => n.chapter === ch.name);
    const topics = chapterNotes.map((n) => n.title);
    return {
      name: ch.name,
      path: ch.path,
      subject: ch.subject,
      topics,
      totalTopics: topics.length,
      weightage: {
        jeeMain: "4-8 marks",
        jeeAdvanced: "4-8 marks",
        boards: "High",
      },
      priority: "Very High" as const,
    };
  });
}

function buildGraphData(notes: Note[]): GraphData {
  const nodes: GraphNode[] = [];
  const nodeMap = new Map<string, GraphNode>();

  const seenTitles = new Set<string>();
  for (const note of notes) {
    if (seenTitles.has(note.title)) continue;
    seenTitles.add(note.title);

    const isCore = note.path.endsWith("core.md");
    const node: GraphNode = {
      id: note.id,
      label: note.title,
      group: note.chapter,
      type: isCore ? "chapter" : "note",
      path: note.path,
      val: note.links.length + note.backlinks.length + 1,
    };
    nodes.push(node);
    nodeMap.set(note.title.toLowerCase(), node);
    nodeMap.set(slugify(note.title), node);
    nodeMap.set(note.id, node);
  }

  const links: GraphLink[] = [];
  for (const note of notes) {
    const sourceNode = nodeMap.get(note.title.toLowerCase());
    if (!sourceNode) continue;

    for (const link of note.links) {
      let targetNode = nodeMap.get(link.target.toLowerCase());
      if (!targetNode) {
        targetNode = nodeMap.get(slugify(link.target));
      }
      if (targetNode && targetNode.id !== sourceNode.id) {
        links.push({
          source: sourceNode.id,
          target: targetNode.id,
          value: 1,
          type: "wiki-link",
        });
      }
    }
  }

  return { nodes, links };
}

let cachedVault: VaultContent | null = null;

export function getVault(extraRoots?: VaultRoot[]): VaultContent {
  cachedVault = null;
  const roots = getResolvedRoots(extraRoots);

  const chapters = parseChapters(roots);
  const notes = parseNotes(roots);
  const questions = parseQuestions(roots);
  const flashcards = parseFlashcards(roots);
  const quizzes = parseQuizzes(roots);
  const conceptConnections = parseConceptConnections(roots);
  const graphData = buildGraphData(notes);

  cachedVault = {
    chapters,
    notes,
    questions,
    flashcards,
    quizzes,
    conceptConnections,
    graphData,
  };

  return cachedVault;
}

export function getChapterNotes(chapterName: string): Note[] {
  const vault = getVault();
  return vault.notes.filter((n) => n.chapter === chapterName);
}

export function getNoteById(id: string): Note | undefined {
  const vault = getVault();
  return vault.notes.find((n) => n.id === id);
}

export function getChapterQuestions(chapterName: string): Question[] {
  const vault = getVault();
  return vault.questions.filter((q) => q.chapter === chapterName);
}

export function getChapterFlashcards(chapterName: string): Flashcard[] {
  const vault = getVault();
  return vault.flashcards.filter((f) => f.chapter === chapterName);
}

export function searchNotes(query: string): Note[] {
  const vault = getVault();
  const q = query.toLowerCase();
  return vault.notes.filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
  );
}
