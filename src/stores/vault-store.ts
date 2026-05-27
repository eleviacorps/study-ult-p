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

// Parse questions from agent-generated files (paths containing "questions/")
function parseAgentQuestions(notes: Note[]): Question[] {
  const result: Question[] = [];
  for (const note of notes) {
    if (!note.path.includes("questions/")) continue;
    const chapter = note.chapter;
    const subject = note.subject || "";
    const blocks = note.content.split(/^#{2,3}\s+Q\d+/m).slice(1);
    if (blocks.length === 0) continue;
    const titles = note.content.match(/^#{2,3}\s+(Q\d+.+)$/gm) || [];
    blocks.forEach((block, i) => {
      const title = titles[i]?.replace(/^#{2,3}\s+/, "").trim() || `Question ${i + 1}`;
      const diffMatch = block.match(fieldRx("Difficulty"));
      const marksMatch = block.match(fieldRx("Marks"));
      const marksVal = marksMatch?.[1]?.match(/\d+/)?.[0];
      const givenMatch = block.match(fieldRx("Given"));
      const findMatch = block.match(fieldRx("Find"));
      const solutionMatch = block.match(fieldRx("Solution"));
      const answerMatch = block.match(fieldRx("Answer"));
      const explanationMatch = block.match(fieldRx("Explanation"));
      const aShortMatch = !answerMatch ? block.match(/\*\*A:\s*([\s\S]*?)(?=\n(?:\*\*|###)|$)/) : null;

      // Parse options from table format or A) format
      let options: { label: string; text: string }[] | undefined;
      const optTableMatch = block.match(/^\|\s*([A-D])\s*\|\s*([^|]+)/m);
      if (optTableMatch) {
        const tableOpts = [...block.matchAll(/^\|\s*([A-D])\s*\|\s*([^|]+)/gm)];
        if (tableOpts.length >= 2) {
          options = tableOpts.map((m) => ({ label: m[1], text: m[2].trim() }));
        }
      }
      if (!options) {
        const optListMatch = block.match(/(?:^|\n)([A-D])\)\s+(.+)/g);
        if (optListMatch) {
          options = [...block.matchAll(/([A-D])\)\s+(.+)/g)].map((m) => ({ label: m[1], text: m[2].trim() }));
        }
      }

      result.push({
        id: slugify(`${chapter}-q-${i + 1}`),
        title,
        chapter,
        subject,
        topic: "",
        difficulty: (stripField(diffMatch?.[1]) || "Moderate") as "Easy" | "Moderate" | "Hard",
        marks: marksVal ? parseInt(marksVal) : 4,
        given: stripField(givenMatch?.[1]),
        find: stripField(findMatch?.[1]),
        options,
        solution: stripField(solutionMatch?.[1]) || stripField(aShortMatch?.[1]),
        answer: stripField(answerMatch?.[1]),
        explanation: stripField(explanationMatch?.[1]),
        tags: note.tags,
        type: options ? "mcq" : "solved",
      });
    });
  }
  return result;
}

// Parse flashcards from agent-generated files (paths containing "flashcards/")
function parseAgentFlashcards(notes: Note[]): Flashcard[] {
  const result: Flashcard[] = [];
  for (const note of notes) {
    if (!note.path.includes("flashcards/")) continue;
    const chapter = note.chapter;
    const subject = note.subject || "";
    const blocks = note.content.split(/^##\s+FC\d+/m).slice(1);
    if (blocks.length === 0) continue;
    const titles = note.content.match(/^##\s+(FC\d+.+)$/gm) || [];
    blocks.forEach((block, i) => {
      const question = titles[i]?.replace(/^##\s+FC\d+\.\s*/, "").trim() || "";
      const answerMatch = block.match(fieldRx("Answer"));
      const aShortMatch = !answerMatch ? block.match(/\*\*A:\s*([\s\S]*?)(?=\n(?:\*\*|###)|$)/) : null;
      const formulaMatch = block.match(fieldRx("Formula"));
      const varMatch = block.match(fieldRx("Variable Meanings"));
      const memoryMatch = block.match(fieldRx("Memory Trick"));
      result.push({
        id: slugify(`${chapter}-fc-${i + 1}`),
        chapter,
        subject,
        topic: "",
        type: "definition",
        question,
        answer: stripField(answerMatch?.[1]) || stripField(aShortMatch?.[1]),
        formula: stripField(formulaMatch?.[1]),
        variableMeanings: varMatch?.[1]?.trim().split("\n").filter(Boolean).map((l) => {
          const parts = l.trim().replace(/^-\s*/, "").split(":").map((s) => s.trim());
          return parts.length >= 2 ? { symbol: parts[0], meaning: parts.slice(1).join(": ") } : { symbol: parts[0] || "", meaning: l.trim() };
        }),
        memoryTrick: stripField(memoryMatch?.[1]),
        tags: note.tags,
      });
    });
  }
  return result;
}

// Parse quizzes from agent-generated files (paths containing "quizzes/")
function parseAgentQuizzes(notes: Note[]): { id: string; chapter: string; question: string; options: { label: string; text: string; correct: boolean }[]; explanation?: string }[] {
  const result: { id: string; chapter: string; question: string; options: { label: string; text: string; correct: boolean }[]; explanation?: string }[] = [];
  for (const note of notes) {
    if (!note.path.includes("quizzes/")) continue;
    const chapter = note.chapter;
    const blocks = note.content.split(/^###\s+Q\d+/m).slice(1);
    if (blocks.length === 0) continue;
    const titles = note.content.match(/^###\s+(Q\d+.+)$/gm) || [];
    blocks.forEach((block, i) => {
      const qText = titles[i]?.replace(/^###\s+Q\d+\.\s*/, "").trim() || "";
      // Extract the question text (everything up to the first option line)
      const qMatch = block.match(/^>\s*(.+)/m);
      const question = qMatch?.[1]?.trim() || qText;
      const expMatch = block.match(fieldRx("Answer"));

      const options: { label: string; text: string; correct: boolean }[] = [];

      // Try checkbox format: - [x] Option or - [ ] Option
      let checkboxMatch = [...block.matchAll(/[-*]\s*\[([ x])\]\s*(.+)/g)];
      if (checkboxMatch.length > 0) {
        for (const m of checkboxMatch) {
          options.push({ label: String.fromCharCode(65 + options.length), text: m[2].trim(), correct: m[1] === "x" });
        }
      }

      // Try letter format: - A) Option or A) Option
      if (options.length === 0) {
        const letterMatch = [...block.matchAll(/(?:^|\n)\s*(?:-|\*)?\s*([A-D])[).]\s+(.+)/g)];
        if (letterMatch.length > 0) {
          for (const m of letterMatch) {
            const correct = m[2].toLowerCase().includes("correct") || m[2].toLowerCase().includes("✓");
            options.push({ label: m[1], text: m[2].trim(), correct });
          }
        }
      }

      // Try table format: | A | Option | Reason |
      if (options.length === 0) {
        const tableMatch = [...block.matchAll(/^\|\s*([A-D])\s*\|\s*([^|]+)/gm)];
        if (tableMatch.length >= 2) {
          for (const m of tableMatch) {
            const correct = m[2].toLowerCase().includes("correct") || m[2].toLowerCase().includes("✓");
            options.push({ label: m[1], text: m[2].trim(), correct });
          }
        }
      }

      // Mark correct option from Answer field
      const answerText = stripField(expMatch?.[1]);
      if (answerText && options.length > 0 && !options.some((o) => o.correct)) {
        const answerLabel = answerText.match(/^([A-D])/)?.[1];
        if (answerLabel) {
          for (const opt of options) {
            if (opt.label === answerLabel) opt.correct = true;
          }
        }
      }

      result.push({
        id: slugify(`${chapter}-qz-${i + 1}`),
        chapter,
        question,
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

// Strip trailing closing ** from field values (e.g. "A**" → "A")
function stripField(val: string | undefined): string {
  return val?.trim().replace(/\*+\s*$/, "") || "";
}

// Match both **Label:** and ### Label field headers
function fieldRx(label: string): RegExp {
  return new RegExp(`(?:\\*\\*${label}:|###\\s+${label})\\s*([\\s\\S]*?)(?=\\n(?:\\*\\*|###)\\s*(?:Given|Find|Solution|Answer|Explanation|Formula|Variable|Memory|Options|Difficulty|Marks|Topic|Subtopic|Exam)|\\*\\*\\n|$)`, 'i');
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
