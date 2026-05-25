import { getVault } from "@/lib/vault-parser";
import ReaderNoteClient from "../reader-note-client";

export default function ReaderNotePage() {
  return <ReaderNoteClient />;
}

export async function generateStaticParams() {
  const vault = getVault();
  return vault.notes.map((note) => ({ chapter: note.chapter, note: note.id }));
}
