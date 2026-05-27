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

function mergeNotesIntoVault(base: VaultContent, extraNotes: Note[]): VaultContent {
  if (extraNotes.length === 0) return base;

  const seen = new Set(base.notes.map((n) => n.path));
  const uniqueNotes = extraNotes.filter((n) => !seen.has(n.path));

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

  return {
    ...base,
    chapters: [...base.chapters, ...agentChapters],
    notes: [...base.notes, ...uniqueNotes],
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
        // Merge localStorage agent notes
        let vault = mergeAgentNotes(baseVault);

        // Also fetch notes from the DB if Supabase is configured
        try {
          const notesRes = await fetch("/api/notes");
          if (notesRes.ok) {
            const { notes: dbNotes } = await notesRes.json();
            if (Array.isArray(dbNotes) && dbNotes.length > 0) {
              vault = mergeNotesIntoVault(vault, dbNotes);
            }
          }
        } catch {
          // Supabase not configured or offline — localStorage is fine
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
      if (!merged.find((en) => en.path === n.path)) {
        merged.push(n);
      }
    }
    saveAgentNotes(merged);

    // Re-merge: localStorage notes + DB notes on top of base vault
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
      } catch {
        // Supabase not configured
      }
      set({ vault });
    }

    // Persist to Supabase (fire-and-forget)
    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    }).catch(() => {});
  },

  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  setCurrentNote: (note) => set({ currentNote: note }),
}));
