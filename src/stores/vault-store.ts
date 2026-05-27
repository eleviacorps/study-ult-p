"use client";

import { create } from "zustand";
import type { VaultContent, ChapterMeta, Note, Question, Flashcard, VaultRoot } from "@/types";

const VAULT_ROOTS_KEY = "studyult-vault-roots";
const AGENT_NOTES_KEY = "studyult-agent-notes";

export function getCustomVaultRoots(): VaultRoot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VAULT_ROOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomVaultRoots(roots: VaultRoot[]) {
  localStorage.setItem(VAULT_ROOTS_KEY, JSON.stringify(roots));
}

export function getAgentNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AGENT_NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAgentNotes(notes: Note[]) {
  localStorage.setItem(AGENT_NOTES_KEY, JSON.stringify(notes));
}

// Simple slugify for IDs
function slugify(text: string): string {
  return text.toLowerCase().replace(/[\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

type MarkdownBlock = {
  title: string;
  body: string;
};

type ParsedSections = Map<string, string>;

const CORRECT_MARKERS = ["correct", "answer", "✓", "✅", "✔", "âœ“", "âœ…"];

function notePathIncludes(note: Note, segment: string): boolean {
  const path = note.path.toLowerCase().replace(/\\/g, "/");
  return path === segment || path.startsWith(`${segment}/`) || path.includes(`/${segment}/`);
}

function normalizeSectionKey(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitNumberedBlocks(content: string, prefix: "Q" | "FC"): MarkdownBlock[] {
  const headingRx = new RegExp(`^#{2,3}\\s+(${prefix}\\d+)(?:[.)])?\\s*(.*)$`, "gmi");
  const matches = [...content.matchAll(headingRx)];

  return matches.map((match, index) => {
    const title = `${match[1]}${match[2] ? `. ${match[2].trim()}` : ""}`.trim();
    const bodyStart = (match.index || 0) + match[0].length;
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index || content.length : content.length;
    return { title, body: content.slice(bodyStart, bodyEnd).trim() };
  });
}

function parseSections(block: string): ParsedSections {
  const sections: ParsedSections = new Map();
  let currentKey = "";
  let currentValue: string[] = [];

  const commit = () => {
    if (!currentKey) return;
    sections.set(currentKey, currentValue.join("\n").trim());
  };

  for (const line of block.split(/\r?\n/)) {
    const headingMatch = line.match(/^#{1,4}\s+(.+?)(?::\s*(.*))?$/);
    const boldMatch = line.match(/^\*\*([^*:]+):\*\*\s*(.*)$/);
    const shortBoldMatch = line.match(/^\*\*([QA]):\*\*?\s*(.*)$/i);
    const match = headingMatch || boldMatch || shortBoldMatch;

    if (match) {
      commit();
      currentKey = normalizeSectionKey(match[1]);
      currentValue = match[2] ? [match[2]] : [];
      continue;
    }

    if (currentKey) {
      currentValue.push(line);
    }
  }

  commit();
  return sections;
}

function getSection(sections: ParsedSections, labels: string[]): string {
  for (const label of labels) {
    const value = sections.get(normalizeSectionKey(label));
    if (value) return stripField(value);
  }
  return "";
}

function stripMdNoise(value: string): string {
  return value
    .replace(/^>\s?/gm, "")
    .replace(/^\s*(?:✅|✓|✔|❌|⚠️|âœ…|âœ“|âŒ|âš ï¸)\s*/gm, "")
    .replace(/^\[![^\]]+\]\s*$/gm, "")
    .replace(/\*\*\[?\s*(?:✅|✓|✔|âœ…|âœ“)?\s*correct answer\s*\]?\*\*/gi, "")
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1")
    .trim();
}

function normalizeDifficulty(value: string): "Easy" | "Moderate" | "Hard" {
  const lower = value.toLowerCase();
  if (lower.includes("easy")) return "Easy";
  if (lower.includes("hard") || lower.includes("difficult")) return "Hard";
  return "Moderate";
}

function parseVariableMeanings(value: string): { symbol: string; meaning: string }[] | undefined {
  const rows: { symbol: string; meaning: string }[] = [];

  for (const line of value.split(/\r?\n/)) {
    const trimmed = stripMdNoise(line);
    if (!trimmed || /^[-|:\s]+$/.test(trimmed)) continue;

    if (trimmed.startsWith("|")) {
      const cells = trimmed.split("|").map((cell) => cell.trim()).filter(Boolean);
      if (cells.length < 2 || /^symbol$/i.test(cells[0]) || /^-+$/.test(cells[0])) continue;
      rows.push({ symbol: cells[0], meaning: cells.slice(1).join(" - ") });
      continue;
    }

    const listMatch = trimmed.match(/^[-*]?\s*([^:=-]+)\s*[:=-]\s*(.+)$/);
    if (listMatch) {
      rows.push({ symbol: listMatch[1].trim(), meaning: listMatch[2].trim() });
    }
  }

  return rows.length > 0 ? rows : undefined;
}

function hasCorrectMarker(value: string): boolean {
  const lower = value.toLowerCase();
  return CORRECT_MARKERS.some((marker) => lower.includes(marker));
}

function cleanOptionText(value: string): string {
  return stripMdNoise(value)
    .replace(/\*\*\[?\s*(?:✅|✓|✔|âœ…|âœ“)?\s*correct answer\s*\]?\*\*/gi, "")
    .replace(/\(?\s*(?:correct|answer)\s*\)?/gi, "")
    .trim();
}

function parseOptions(block: string): { label: string; text: string; correct?: boolean }[] {
  const options: { label: string; text: string; correct?: boolean }[] = [];

  const checkboxMatches = [...block.matchAll(/^\s*[-*]\s*\[([ xX])\]\s*(.+)$/gm)];
  if (checkboxMatches.length > 0) {
    return checkboxMatches.map((match, index) => ({
      label: String.fromCharCode(65 + index),
      text: cleanOptionText(match[2]),
      correct: match[1].toLowerCase() === "x",
    }));
  }

  const tableRows = [...block.matchAll(/^\s*\|(.+)\|\s*$/gm)]
    .map((match) => match[1].split("|").map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2);
  const tableOptions = tableRows.filter((cells) => /^[A-D]$/i.test(cells[0]));
  if (tableOptions.length >= 2) {
    return tableOptions.map((cells) => ({
      label: cells[0].toUpperCase(),
      text: cleanOptionText(cells[1]),
      correct: hasCorrectMarker(cells.join(" ")),
    }));
  }

  const letterMatches = [...block.matchAll(/^\s*(?:[-*]\s*)?([A-D])[).]\s+(.+)$/gim)];
  for (const match of letterMatches) {
    options.push({
      label: match[1].toUpperCase(),
      text: cleanOptionText(match[2]),
      correct: hasCorrectMarker(match[2]),
    });
  }

  return options;
}

function applyAnswerToOptions<T extends { label: string; text: string; correct?: boolean }>(options: T[], answer: string): T[] {
  if (options.length === 0 || options.some((option) => option.correct)) return options;
  const answerLabel = stripMdNoise(answer).match(/^([A-D])(?:\b|[).:])/i)?.[1]?.toUpperCase();
  if (!answerLabel) return options;
  return options.map((option) => option.label === answerLabel ? { ...option, correct: true } : option);
}

// Parse questions from agent-generated files (paths containing "questions/")
export function parseAgentQuestions(notes: Note[]): Question[] {
  const result: Question[] = [];
  for (const note of notes) {
    if (!notePathIncludes(note, "questions")) continue;
    const chapter = note.chapter;
    const subject = note.subject || "";
    const blocks = splitNumberedBlocks(note.content, "Q");
    if (blocks.length === 0) continue;

    blocks.forEach(({ title, body }, i) => {
      const sections = parseSections(body);
      const marksVal = getSection(sections, ["Marks"]).match(/\d+/)?.[0];
      const answer = getSection(sections, ["Answer", "A"]);
      const explanation = getSection(sections, ["Explanation", "Detailed Explanation", "Why Other Options Are Wrong"]);
      const solution = getSection(sections, ["Solution", "Detailed Explanation", "Approach", "Step-by-step solution"]) || explanation;
      const parsedOptions = applyAnswerToOptions(parseOptions(body), answer);
      const options = parsedOptions.length >= 2
        ? parsedOptions.map((option) => ({ label: option.label, text: option.text }))
        : undefined;

      result.push({
        id: slugify(`${chapter}-${note.id}-q-${i + 1}`),
        title,
        chapter,
        subject,
        topic: stripMdNoise(getSection(sections, ["Topic"])),
        subtopic: stripMdNoise(getSection(sections, ["Subtopic"])) || undefined,
        difficulty: normalizeDifficulty(getSection(sections, ["Difficulty"])),
        marks: marksVal ? parseInt(marksVal) : 4,
        given: getSection(sections, ["Given", "Problem"]),
        find: getSection(sections, ["Find"]),
        options,
        solution,
        answer,
        explanation,
        tags: note.tags,
        type: options ? "mcq" : "solved",
      });
    });
  }
  return result;
}

// Parse flashcards from agent-generated files (paths containing "flashcards/")
export function parseAgentFlashcards(notes: Note[]): Flashcard[] {
  const result: Flashcard[] = [];
  for (const note of notes) {
    if (!notePathIncludes(note, "flashcards")) continue;
    const chapter = note.chapter;
    const subject = note.subject || "";
    const blocks = splitNumberedBlocks(note.content, "FC");
    if (blocks.length === 0) continue;

    blocks.forEach(({ title, body }, i) => {
      const sections = parseSections(body);
      const titleQuestion = title.replace(/^FC\d+\.?\s*/, "").trim();
      const variableMeanings = parseVariableMeanings(getSection(sections, ["Variable Meanings", "Meaning"]));

      result.push({
        id: slugify(`${chapter}-${note.id}-fc-${i + 1}`),
        chapter,
        subject,
        topic: stripMdNoise(getSection(sections, ["Topic", "Topics"])),
        subtopic: stripMdNoise(getSection(sections, ["Subtopic"])) || undefined,
        type: getSection(sections, ["Type"]) || "definition",
        question: getSection(sections, ["Question", "Q"]) || titleQuestion,
        answer: getSection(sections, ["Answer", "A", "Common Mistake", "Correct Approach"]),
        formula: getSection(sections, ["Formula"]) || undefined,
        variableMeanings,
        memoryTrick: getSection(sections, ["Memory Trick", "Memory", "Mnemonic"]) || undefined,
        tags: note.tags,
      });
    });
  }
  return result;
}

// Parse quizzes from agent-generated files (paths containing "quizzes/")
export function parseAgentQuizzes(notes: Note[]): { id: string; chapter: string; question: string; options: { label: string; text: string; correct: boolean }[]; explanation?: string }[] {
  const result: { id: string; chapter: string; question: string; options: { label: string; text: string; correct: boolean }[]; explanation?: string }[] = [];
  for (const note of notes) {
    if (!notePathIncludes(note, "quizzes")) continue;
    const chapter = note.chapter;
    const blocks = splitNumberedBlocks(note.content, "Q");
    if (blocks.length === 0) continue;

    blocks.forEach(({ title, body }, i) => {
      const sections = parseSections(body);
      const answerText = getSection(sections, ["Answer", "A", "Explanation"]);
      const blockquoteQuestion = body.match(/^>\s*(.+)/m)?.[1]?.trim() || "";
      const question = getSection(sections, ["Question", "Problem"]) || blockquoteQuestion || title.replace(/^Q\d+\.?\s*/, "").trim();
      const options = applyAnswerToOptions(parseOptions(body), answerText).map((option) => ({
        label: option.label,
        text: option.text,
        correct: !!option.correct,
      }));

      result.push({
        id: slugify(`${chapter}-${note.id}-qz-${i + 1}`),
        chapter,
        question: stripMdNoise(question),
        options,
        explanation: answerText,
      });
    });
  }
  return result;
}

function dedupKey(n: Note): string {
  return `${n.chapter}|${n.id}`;
}

// Strip trailing closing ** from field values (e.g. "A**" -> "A")
function stripField(val: string | undefined): string {
  return stripMdNoise(val?.trim().replace(/\*+\s*$/, "") || "");
}

function mergeNotesIntoVault(base: VaultContent, extraNotes: Note[]): VaultContent {
  if (extraNotes.length === 0) return base;

  // Dedup by chapter + id (catches space vs underscore path duplicates)
  const seen = new Set(base.notes.map(dedupKey));
  const uniqueNotes = extraNotes.filter((n) => !seen.has(dedupKey(n)));

  if (uniqueNotes.length === 0) return base;

  // Build chapters from unique notes
  const uniqueChapters = new Map<string, { subject: string; notes: Note[] }>();
  for (const note of uniqueNotes) {
    const key = note.chapter;
    if (!uniqueChapters.has(key)) {
      uniqueChapters.set(key, { subject: note.subject, notes: [] });
    }
    uniqueChapters.get(key)!.notes.push(note);
  }

  // Dedup chapters by name (prevent duplicate chapter entries)
  const existingChapterNames = new Set(base.chapters.map((c) => c.name));
  const agentChapters: ChapterMeta[] = [];
  for (const [chapterName, info] of uniqueChapters) {
    if (existingChapterNames.has(chapterName)) continue;
    const slug = chapterName.replace(/[\s]+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    agentChapters.push({
      name: chapterName,
      path: slug,
      subject: info.subject || "Custom",
      topics: info.notes.map((n) => n.title),
      totalTopics: info.notes.length,
      weightage: { jeeMain: "", jeeAdvanced: "", boards: "" },
      priority: "High" as const,
    });
    existingChapterNames.add(chapterName);
  }

  // Parse questions, flashcards, quizzes from agent notes
  const parsedQuestions = parseAgentQuestions(uniqueNotes);
  const parsedFlashcards = parseAgentFlashcards(uniqueNotes);
  const parsedQuizzes = parseAgentQuizzes(uniqueNotes);

  // Ensure all notes have links/backlinks arrays (safety for missing fields from old data)
  const safeNotes = uniqueNotes.map((n) => ({
    ...n,
    links: n.links || [],
    backlinks: n.backlinks || [],
  }));

  // Dedup questions/flashcards/quizzes by id (prevent accumulation on re-merge)
  const seenQ = new Set(base.questions.map((q) => q.id));
  const seenF = new Set(base.flashcards.map((f) => f.id));
  const seenZ = new Set(base.quizzes.map((z) => z.id));

  return {
    ...base,
    chapters: [...base.chapters, ...agentChapters],
    notes: [...base.notes, ...safeNotes],
    questions: [...base.questions, ...parsedQuestions.filter((q) => !seenQ.has(q.id))],
    flashcards: [...base.flashcards, ...parsedFlashcards.filter((f) => !seenF.has(f.id))],
    quizzes: [...base.quizzes, ...parsedQuizzes.filter((z) => !seenZ.has(z.id))],
  };
}

function mergeAgentNotes(base: VaultContent): VaultContent {
  return mergeNotesIntoVault(base, getAgentNotes());
}

interface VaultState {
  vault: VaultContent | null;
  baseVault: VaultContent | null;
  currentChapter: ChapterMeta | null;
  currentNote: Note | null;
  isLoaded: boolean;
  isLoading: boolean;

  loadVault: () => Promise<void>;
  setCurrentChapter: (chapter: ChapterMeta | null) => void;
  setCurrentNote: (note: Note | null) => void;
  addAgentNotes: (notes: Note[]) => Promise<void>;
  removeChapter: (chapterName: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  baseVault: null,
  currentChapter: null,
  currentNote: null,
  isLoaded: false,
  isLoading: false,

  loadVault: async () => {
    if (get().isLoaded || get().isLoading) return;
    set({ isLoading: true });
    try {
      const customRoots = getCustomVaultRoots();
      let baseVault: VaultContent | null = null;

      if (customRoots.length === 0) {
        const staticRes = await fetch("/vault-data.json");
        if (staticRes.ok) {
          baseVault = await staticRes.json();
        }
      }

      if (!baseVault) {
        let url = "/api/vault";
        if (customRoots.length > 0) {
          url += `?roots=${encodeURIComponent(JSON.stringify(customRoots))}`;
        }
        const res = await fetch(url);
        baseVault = await res.json();
      }

      if (baseVault) {
        let vault = mergeAgentNotes(baseVault);

        try {
          const notesRes = await fetch("/api/notes");
          if (notesRes.ok) {
            const { notes: dbNotes } = await notesRes.json();
            if (Array.isArray(dbNotes) && dbNotes.length > 0) {
              vault = mergeNotesIntoVault(vault, dbNotes);
            }
          }
        } catch {
          // Supabase not configured or offline
        }

        set({ baseVault, vault, isLoaded: true, isLoading: false });
      } else {
        set({ isLoaded: true, isLoading: false });
      }
    } catch (err) {
      console.error("Failed to load vault:", err);
      set({ isLoading: false });
    }
  },

  addAgentNotes: async (notes: Note[]) => {
    const existing = getAgentNotes();
    const merged = [...existing];
    for (const n of notes) {
      const idx = merged.findIndex((en) => dedupKey(en) === dedupKey(n));
      if (idx >= 0) {
        merged[idx] = n;
      } else {
        merged.push(n);
      }
    }
    saveAgentNotes(merged);

    const state = get();
    if (state.baseVault) {
      let vault = mergeAgentNotes(state.baseVault);
      try {
        const notesRes = await fetch("/api/notes");
        if (notesRes.ok) {
          const { notes: dbNotes } = await notesRes.json();
          if (Array.isArray(dbNotes) && dbNotes.length > 0) {
            vault = mergeNotesIntoVault(vault, dbNotes);
          }
        }
      } catch {}
      set({ vault });
    }

    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    }).catch(() => {});
  },

  removeChapter: async (chapterName: string) => {
    // 1. Remove from localStorage
    const localNotes = getAgentNotes().filter((n) => n.chapter !== chapterName);
    saveAgentNotes(localNotes);

    // 2. Remove from DB
    try {
      await fetch(`/api/notes?chapter=${encodeURIComponent(chapterName)}`, { method: "DELETE" });
    } catch {}

    // 3. Rebuild vault state without this chapter
    const state = get();
    if (state.baseVault) {
      let vault = mergeAgentNotes(state.baseVault);
      try {
        const notesRes = await fetch("/api/notes");
        if (notesRes.ok) {
          const { notes: dbNotes } = await notesRes.json();
          if (Array.isArray(dbNotes) && dbNotes.length > 0) {
            vault = mergeNotesIntoVault(vault, dbNotes);
          }
        }
      } catch {}
      set({ vault });
    }
  },

  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  setCurrentNote: (note) => set({ currentNote: note }),
}));
