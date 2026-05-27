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
    const blocks = note.content.split(/^##\s+Q\d+/m).slice(1);
    if (blocks.length === 0) continue;
    const titles = note.content.match(/^##\s+(Q\d+.+)$/gm) || [];
    blocks.forEach((block, i) => {
      const title = titles[i]?.replace(/^##\s+/, "").trim() || `Question ${i + 1}`;
      const diffMatch = block.match(/\*\*Difficulty:\*\*\s*(.+)/);
      const marksMatch = block.match(/\*\*Marks:\*\*\s*(\d+)/);
      const givenMatch = block.match(/\*\*Given:\*\*\s*([\s\S]*?)(?=\*\*Find|\*\*Options|\*\*Solution|\*\*Answer|$)/);
      const findMatch = block.match(/\*\*Find:\*\*\s*([\s\S]*?)(?=\*\*Options|\*\*Solution|\*\*Answer|$)/);
      const solutionMatch = block.match(/\*\*Solution:\*\*\s*([\s\S]*?)(?=\*\*Answer|$)/i);
      const answerMatch = block.match(/\*\*Answer:\*\*\s*([\s\S]*?)(?=$|\*\*Explanation)/);
      const explanationMatch = block.match(/\*\*Explanation:\*\*\s*([\s\S]*?)$/);

      let options: { label: string; text: string }[] | undefined;
      const optionsSection = block.match(/\*\*Options:\*\*\s*([\s\S]*?)(?=\*\*Solution|\*\*Answer|$)/);
      if (optionsSection) {
        const optRegex = /([A-D])\)\s*(.+)/g;
        let m;
        options = [];
        while ((m = optRegex.exec(optionsSection[1])) !== null) {
          options.push({ label: m[1], text: m[2].trim() });
        }
      }

      result.push({
        id: slugify(`${chapter}-q-${i + 1}`),
        title,
        chapter,
        subject,
        topic: "",
        difficulty: (diffMatch?.[1]?.trim() || "Moderate") as "Easy" | "Moderate" | "Hard",
        marks: marksMatch ? parseInt(marksMatch[1]) : 4,
        given: givenMatch?.[1]?.trim(),
        find: findMatch?.[1]?.trim(),
        options,
        solution: solutionMatch?.[1]?.trim() || "",
        answer: answerMatch?.[1]?.trim() || "",
        explanation: explanationMatch?.[1]?.trim(),
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
      const answerMatch = block.match(/\*\*Answer:\*\*\s*([\s\S]*?)(?=\*\*Formula|\*\*Variable Meanings|\*\*Memory Trick|$)/);
      const formulaMatch = block.match(/\*\*Formula:\*\*\s*([\s\S]*?)(?=\*\*Variable Meanings|\*\*Memory Trick|$)/);
      const varMatch = block.match(/\*\*Variable Meanings:\*\*\s*([\s\S]*?)(?=\*\*Memory Trick|$)/);
      const memoryMatch = block.match(/\*\*Memory Trick:\*\*\s*([\s\S]*?)$/);
      result.push({
        id: slugify(`${chapter}-fc-${i + 1}`),
        chapter,
        subject,
        topic: "",
        type: "definition",
        question,
        answer: answerMatch?.[1]?.trim() || "",
        formula: formulaMatch?.[1]?.trim(),
        variableMeanings: varMatch?.[1]?.trim().split("\n").filter(Boolean).map((l) => {
          const parts = l.trim().replace(/^-\s*/, "").split(":").map((s) => s.trim());
          return parts.length >= 2 ? { symbol: parts[0], meaning: parts.slice(1).join(": ") } : { symbol: parts[0] || "", meaning: l.trim() };
        }),
        memoryTrick: memoryMatch?.[1]?.trim(),
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
      const question = titles[i]?.replace(/^###\s+Q\d+\.\s*/, "").trim() || "";
      const expMatch = block.match(/\*\*Explanation:\*\*\s*([\s\S]*?)$/);

      const options: { label: string; text: string; correct: boolean }[] = [];
      const optRegex = /[-*]\s*\[([ x])\]\s*(.+)/g;
      let m;
      while ((m = optRegex.exec(block)) !== null) {
        options.push({ label: String.fromCharCode(65 + options.length), text: m[2].trim(), correct: m[1] === "x" });
      }

      result.push({
        id: slugify(`${chapter}-qz-${i + 1}`),
        chapter,
        question,
        options,
        explanation: expMatch?.[1]?.trim(),
      });
    });
  }
  return result;
}

function dedupKey(n: Note): string {
  return `${n.chapter}|${n.id}`;
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

  const agentChapters: ChapterMeta[] = [];
  for (const [chapterName, info] of uniqueChapters) {
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
  }

  // Parse questions, flashcards, quizzes from agent notes
  const parsedQuestions = parseAgentQuestions(uniqueNotes);
  const parsedFlashcards = parseAgentFlashcards(uniqueNotes);
  const parsedQuizzes = parseAgentQuizzes(uniqueNotes);

  return {
    ...base,
    chapters: [...base.chapters, ...agentChapters],
    notes: [...base.notes, ...uniqueNotes],
    questions: [...base.questions, ...parsedQuestions],
    flashcards: [...base.flashcards, ...parsedFlashcards],
    quizzes: [...base.quizzes, ...parsedQuizzes],
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
