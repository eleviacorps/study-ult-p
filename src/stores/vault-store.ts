"use client";

import { create } from "zustand";
import type { VaultContent, ChapterMeta, Note, Question, Flashcard } from "@/types";
import {
  getVault,
  getChapterNotes,
  getNoteById,
  getChapterQuestions,
  getChapterFlashcards,
} from "@/lib/vault-parser";

interface VaultState {
  vault: VaultContent | null;
  currentChapter: ChapterMeta | null;
  currentNote: Note | null;
  isLoaded: boolean;
  isLoading: boolean;

  loadVault: () => void;
  setCurrentChapter: (chapter: ChapterMeta | null) => void;
  setCurrentNote: (note: Note | null) => void;
  getChapterNotes: (chapterName: string) => Note[];
  getNoteById: (id: string) => Note | undefined;
  getChapterQuestions: (chapterName: string) => Question[];
  getChapterFlashcards: (chapterName: string) => Flashcard[];
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vault: null,
  currentChapter: null,
  currentNote: null,
  isLoaded: false,
  isLoading: false,

  loadVault: () => {
    if (get().isLoaded || get().isLoading) return;
    set({ isLoading: true });
    try {
      const vault = getVault();
      set({ vault, isLoaded: true, isLoading: false });
    } catch (err) {
      console.error("Failed to load vault:", err);
      set({ isLoading: false });
    }
  },

  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
  setCurrentNote: (note) => set({ currentNote: note }),

  getChapterNotes: (chapterName) => getChapterNotes(chapterName),
  getNoteById: (id) => getNoteById(id),

  getChapterQuestions: (chapterName) => getChapterQuestions(chapterName),
  getChapterFlashcards: (chapterName) => getChapterFlashcards(chapterName),
}));
