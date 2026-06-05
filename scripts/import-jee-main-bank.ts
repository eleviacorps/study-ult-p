import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { createClient } from "@supabase/supabase-js";

// ─── Config ─────────────────────────────────────────────────────────

const SCRAPED_DIR = join(__dirname, "..", "scraped", "jee");
const CHECKPOINT_FILE = join(SCRAPED_DIR, "_import_checkpoint.json");
const BATCH_SIZE = 20;
const INSERT_BATCH = 50;

const EMBEDDING_URL = process.env.EMBEDDING_URL || "http://localhost:1234/v1";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// ─── Types ──────────────────────────────────────────────────────────

interface ScrapedQuestion {
  id: string;
  year: string;
  subject: string;
  chapter: string;
  type: string;
  difficulty: string;
  marks: number;
  negMarks: number;
  questionHtml: string;
  questionText: string;
  options: { label: string; html: string; text: string }[];
  correctAnswer: string;
  solutionHtml: string;
  solutionText: string;
  hasDiagram: boolean;
  diagramUrls: string[];
}

interface ChunkQuestion {
  question: ScrapedQuestion;
  embedText: string;
}

interface Checkpoint {
  completed: string[];
  total: number;
  failed: number;
}

// ─── Progress ───────────────────────────────────────────────────────

function loadCheckpoint(): Checkpoint {
  try {
    if (existsSync(CHECKPOINT_FILE))
      return JSON.parse(readFileSync(CHECKPOINT_FILE, "utf-8"));
  } catch {}
  return { completed: [], total: 0, failed: 0 };
}

function saveCheckpoint(cp: Checkpoint): void {
  mkdirSync(dirname(CHECKPOINT_FILE), { recursive: true });
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2), "utf-8");
}

// ─── Read scraped data ──────────────────────────────────────────────

function readAllQuestions(): ScrapedQuestion[] {
  const subjects = ["Physics", "Chemistry", "Mathematics"];
  const all: ScrapedQuestion[] = [];
  for (const subject of subjects) {
    const subjectDir = join(SCRAPED_DIR, subject);
    if (!existsSync(subjectDir)) continue;

    const chapters = readdirSync(subjectDir, { withFileTypes: true });

    for (const entry of chapters) {
      if (!entry.isDirectory()) continue;
      const allFile = join(subjectDir, entry.name, "_all.json");
      if (!existsSync(allFile)) continue;

      try {
        const questions: ScrapedQuestion[] = JSON.parse(
          readFileSync(allFile, "utf-8")
        );
        all.push(...questions);
      } catch (err) {
        console.warn(`  [WARN] Failed to read ${allFile}: ${err}`);
      }
    }
  }
  return all;
}

function buildEmbedText(q: ScrapedQuestion): string {
  const options = q.options
    .map((o) => `${o.label}) ${o.text}`)
    .join("\n");
  return [
    `Subject: ${q.subject}`,
    `Chapter: ${q.chapter}`,
    `Year: ${q.year}`,
    `Question: ${q.questionText}`,
    options ? `Options:\n${options}` : "",
    `Correct Answer: ${q.correctAnswer}`,
    q.solutionText ? `Solution: ${q.solutionText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ─── Local Embedding ────────────────────────────────────────────────

async function embedBatch(
  texts: string[],
  retries = 3
): Promise<number[][]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${EMBEDDING_URL}/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: texts,
          model: process.env.EMBEDDING_MODEL || "",
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          return data.data.map(
            (d: { embedding: number[] }) => d.embedding
          );
        }
      }

      if (res.status === 404 || res.status === 400) {
        const ollamaRes = await fetch(
          `${EMBEDDING_URL.replace("/v1", "")}/api/embed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: process.env.EMBEDDING_MODEL || "bge-m3",
              input: texts,
            }),
            signal: AbortSignal.timeout(60000),
          }
        );

        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          if (data?.embeddings && Array.isArray(data.embeddings)) {
            return data.embeddings;
          }
        }
      }

      throw new Error(`Embedding API returned ${res.status}`);
    } catch (err) {
      if (attempt === retries - 1) throw err;
      console.log(
        `  [RETRY] Embedding attempt ${attempt + 1}: ${err}`
      );
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Embedding failed after retries");
}

// ─── Supabase Insert ────────────────────────────────────────────────

async function insertBatch(supabase: any, rows: Record<string, unknown>[]): Promise<void> {
  const { error } = await supabase.from("jee_main_bank").upsert(rows, {
    onConflict: "question_id",
    ignoreDuplicates: false,
  });
  if (error) throw new Error(`Supabase insert: ${error.message}`);
}

function toInsertRow(
  q: ScrapedQuestion,
  embedding: number[] | null
) {
  return {
    question_id: q.id,
    subject: q.subject,
    chapter: q.chapter,
    year: q.year,
    type: q.type || "mcq",
    difficulty: q.difficulty || "",
    marks_correct: q.marks ?? 4,
    marks_negative: q.negMarks ?? 1,
    question_html: q.questionHtml || "",
    question_text: q.questionText || "",
    options: q.options.map((o) => ({ label: o.label, text: o.text })),
    correct_answer: q.correctAnswer || "",
    solution_html: q.solutionHtml || "",
    solution_text: q.solutionText || "",
    has_diagram: q.hasDiagram || false,
    diagram_urls: q.diagramUrls || [],
    metadata: {
      source: "examside",
      exam: "jee-main",
      url: q.id,
    },
    embedding: embedding ?? null,
  };
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("JEE Main Question Bank Import");
  console.log(`Data: ${SCRAPED_DIR}`);
  console.log(`Embed: ${EMBEDDING_URL}`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
      "Missing Supabase credentials. Set:\n" +
        "  NEXT_PUBLIC_SUPABASE_URL\n" +
        "  SUPABASE_SERVICE_ROLE_KEY\n" +
        "in .env.local or environment."
    );
    process.exit(1);
  }

  const supabase: any = createClient(SUPABASE_URL, SUPABASE_KEY);
  const checkpoint = loadCheckpoint();

  const allQuestions = readAllQuestions();
  console.log(`\nTotal questions: ${allQuestions.length}`);

  const toEmbed = allQuestions.filter(
    (q) => !checkpoint.completed.includes(q.id)
  );
  console.log(
    `Already imported: ${checkpoint.completed.length}` +
      `\nRemaining: ${toEmbed.length}`
  );

  if (toEmbed.length === 0) {
    console.log("\nAll questions already imported!");
    return;
  }

  const chunks: ChunkQuestion[] = toEmbed.map((q) => ({
    question: q,
    embedText: buildEmbedText(q),
  }));

  const startTime = Date.now();
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const progress = `[${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length}]`;

    try {
      console.log(`  ${progress} Embedding ${batch.length} questions...`);
      const embeddingStart = Date.now();
      const embeddings = await embedBatch(batch.map((c) => c.embedText));
      const embedMs = Date.now() - embeddingStart;
      console.log(`  ${progress} Embeddings done in ${embedMs}ms`);

      const rows = batch.map((c, idx) =>
        toInsertRow(c.question, embeddings[idx] || null)
      );

      for (let j = 0; j < rows.length; j += INSERT_BATCH) {
        const rowBatch = rows.slice(j, j + INSERT_BATCH);
        await insertBatch(supabase, rowBatch);
        inserted += rowBatch.length;
      }

      for (const c of batch) {
        checkpoint.completed.push(c.question.id);
      }
      checkpoint.total += batch.length;
      saveCheckpoint(checkpoint);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ${progress} Inserted ${batch.length} (total: ${inserted}, ${elapsed}s)`);
    } catch (err) {
      console.error(`  ${progress} Failed: ${err}`);
      checkpoint.failed += batch.length;
      saveCheckpoint(checkpoint);
    }
  }

  const totalSec = (Date.now() - startTime) / 1000;
  console.log("\nDone!");
  console.log(`  Time: ${totalSec.toFixed(0)}s`);
  console.log(`  Imported: ${inserted}`);
  console.log(`  Failed: ${checkpoint.failed}`);
  if (inserted > 0) console.log(`  Avg: ${(totalSec / inserted).toFixed(2)}s/q`);
  console.log(`  Checkpoint: ${CHECKPOINT_FILE}`);
}

main().catch(console.error);
