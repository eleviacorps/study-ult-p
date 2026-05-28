import readerParams from "../../../../../public/reader-params.json";
import ReaderNoteClient from "../reader-note-client";

export default function ReaderNotePage() {
  return <ReaderNoteClient />;
}

export async function generateStaticParams() {
  return readerParams;
}
