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
} from "@/types";

const VAULT_ROOT = path.join(process.cwd(), "PhysicsCh1");

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

function findAllMdFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllMdFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

function getAllChapters(): { name: string; path: string; subject: string }[] {
  const entries = fs.readdirSync(VAULT_ROOT, { withFileTypes: true });
  const chapters: { name: string; path: string; subject: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (entry.name === "Physics") {
      const physicsDir = path.join(VAULT_ROOT, "Physics");
      const subEntries = fs.readdirSync(physicsDir, {
        withFileTypes: true,
      });
      for (const sub of subEntries) {
        if (!sub.isDirectory() || sub.name.startsWith(".")) continue;
        chapters.push({
          name: sub.name.replace(/_/g, " "),
          path: path.join("Physics", sub.name),
          subject: "Physics",
        });
      }
    } else {
      chapters.push({
        name: entry.name.replace(/-/g, " "),
        path: entry.name,
        subject: "Physics",
      });
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

function parseNotes(): Note[] {
  const allFiles = findAllMdFiles(VAULT_ROOT);
  const notes: Note[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(VAULT_ROOT, filePath);
    if (
      relativePath.includes("questions") ||
      relativePath.includes("flashcards") ||
      relativePath.includes("quizzes") ||
      relativePath.includes("revision") ||
      relativePath.includes("concept_connection")
    )
      continue;

    const content = readFile(filePath);
    const title = extractTitle(content);
    const tags = parseTags(content);
    const links = parseWikiLinks(content);

    const parts = relativePath.split(path.sep);
    const subject = parts[0] === "Physics" ? "Physics" : "Physics";
    const chapterIdx = parts[0] === "Physics" ? 1 : 0;
    const chapter = parts.length > chapterIdx ? parts[chapterIdx]?.replace(/[_\-]/g, " ") || "General" : parts[0]?.replace(/[_\-]/g, " ") || "General";

    notes.push({
      id: slugify(relativePath.replace(/\.md$/, "")),
      title,
      path: relativePath,
      chapter,
      subject,
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

function parseQuestions(): Question[] {
  const allFiles = findAllMdFiles(VAULT_ROOT);
  const questions: Question[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(VAULT_ROOT, filePath);
    if (!relativePath.includes("questions")) continue;

    const content = readFile(filePath);
    const parts = relativePath.split(path.sep);
    const chapterIdx = parts[0] === "Physics" ? 1 : 0;
    const chapter = parts[chapterIdx]?.replace(/[_\-]/g, " ") || "";
    const subject = "Physics";

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

      const givenMatch = block.match(/### Given:\s*\n([\s\S]*?)(?=###|$)/);
      const findMatch = block.match(/### Find:\s*\n([\s\S]*?)(?=###|$)/);
      const solutionMatch = block.match(
        /### Solution:\s*\n([\s\S]*?)(?=###\s+Answer|$)/i
      );
      const answerMatch = block.match(/### Answer:\s*\n([\s\S]*?)(?=$|\n---)/);
      const explanationMatch = block.match(
        /### Explanation:\s*\n([\s\S]*?)$/
      );

      const optionsMatch = block.match(
        /### Options:\s*\n([\s\S]*?)(?=###|$)/
      );
      let options: { label: string; text: string }[] | undefined;
      if (optionsMatch) {
        const optText = optionsMatch[1];
        const optRegex = /([A-D])\)\s*(.+)/g;
        let m;
        options = [];
        while ((m = optRegex.exec(optText)) !== null) {
          options.push({ label: m[1], text: m[2].trim() });
        }
      }

      const tags = parseTags(content);

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
        given: givenMatch?.[1]?.trim(),
        find: findMatch?.[1]?.trim(),
        options,
        solution: solutionMatch?.[1]?.trim() || "",
        answer: answerMatch?.[1]?.trim() || "",
        explanation: explanationMatch?.[1]?.trim(),
        tags,
        type: options ? "mcq" : "solved",
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

export function parseFlashcards(): Flashcard[] {
  const allFiles = findAllMdFiles(VAULT_ROOT);
  const flashcards: Flashcard[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(VAULT_ROOT, filePath);
    if (!relativePath.includes("flashcards")) continue;

    const content = readFile(filePath);
    const parts = relativePath.split(path.sep);
    const chapterIdx = parts[0] === "Physics" ? 1 : 0;
    const chapter = parts[chapterIdx]?.replace(/[_\-]/g, " ") || "";
    const subject = "Physics";
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

function parseQuizzes(): QuizQuestion[] {
  const allFiles = findAllMdFiles(VAULT_ROOT);
  const quizzes: QuizQuestion[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(VAULT_ROOT, filePath);
    if (!relativePath.includes("quizzes")) continue;

    const content = readFile(filePath);
    const parts = relativePath.split(path.sep);
    const chapterIdx = parts[0] === "Physics" ? 1 : 0;
    const chapter = parts[chapterIdx]?.replace(/[_\-]/g, " ") || "";

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

function parseConceptConnections(): ConceptConnection[] {
  const allFiles = findAllMdFiles(VAULT_ROOT);
  const connections: ConceptConnection[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(VAULT_ROOT, filePath);
    if (!relativePath.includes("concept_connection")) continue;

    const content = readFile(filePath);
    const parts = relativePath.split(path.sep);
    const chapterIdx = parts[0] === "Physics" ? 1 : 0;
    const chapter = parts[chapterIdx]?.replace(/[_\-]/g, " ") || "";

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

function parseChapters(): ChapterMeta[] {
  const chapters = getAllChapters();
  const notes = parseNotes();

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

export function getVault(): VaultContent {
  cachedVault = null;

  const chapters = parseChapters();
  const notes = parseNotes();
  const questions = parseQuestions();
  const flashcards = parseFlashcards();
  const quizzes = parseQuizzes();
  const conceptConnections = parseConceptConnections();
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
