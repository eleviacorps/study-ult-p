import { writeFileSync } from "fs";
import { getVault } from "../src/lib/vault-parser";

const vault = getVault();

writeFileSync("public/vault-data.json", JSON.stringify(vault, null, 2));

const chapterParams = vault.chapters.map((ch: { name: string }) => ch.name);
writeFileSync("public/chapter-params.json", JSON.stringify(chapterParams));

const readerParams = vault.notes.map((n: { chapter: string; id: string }) => ({
  chapter: n.chapter,
  note: n.id,
}));
writeFileSync("public/reader-params.json", JSON.stringify(readerParams));

console.log("Generated vault, chapter params, and reader params JSON files");
