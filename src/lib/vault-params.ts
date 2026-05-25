import { getVault } from "./vault-parser";

export function generateChapterParams() {
  const vault = getVault();
  return vault.chapters.map((ch) => ({
    chapter: ch.name,
  }));
}

export function generateReaderParams() {
  const vault = getVault();
  return vault.notes.map((note) => ({
    chapter: note.chapter,
    note: note.id,
  }));
}
