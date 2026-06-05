/**
 * ExamSIDE JEE Main Question Scraper
 *
 * Scrapes all JEE Main past-year questions (Physics, Chemistry, Mathematics)
 * chapter by chapter using the SvelteKit __data.json endpoint.
 * Outputs structured JSON to scraped/jee/{subject}/{chapter}/.
 *
 * Usage:
 *   npx tsx scripts/scrape-jee.ts              # all subjects
 *   npx tsx scripts/scrape-jee.ts physics       # only physics
 *   npx tsx scripts/scrape-jee.ts physics units-and-measurements  # single chapter
 *
 * Chapters are discovered dynamically from the subject-level __data.json
 * (which is the only level that returns valid SvelteKit data on the JEE
 * section of ExamSIDE — chapter-level pages return type: "error").
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { extractChapterQuestions, resolveCompactData, ScrapedQuestion } from "./decode-sveltekit";

// ─── JEE Configuration ──────────────────────────────────────────────

const BASE_URL = "https://questions.examside.com";
const EXAM_SLUG = "jee-main"; // "jee-main" or "jee-advanced"
const DELAY_MS = 800;

const SUBJECTS = [
  { name: "Physics", slug: "physics" },
  { name: "Chemistry", slug: "chemistry" },
  { name: "Mathematics", slug: "mathematics" },
] as const;

type SubjectSlug = (typeof SUBJECTS)[number]["slug"];

// ─── Output ─────────────────────────────────────────────────────────

const ROOT_OUT = join(__dirname, "..", "scraped", "jee");

// ─── Progress checkpoint ────────────────────────────────────────────

interface ProgressCheckpoint {
  completed: string[];
  total: number;
  errors: number;
}

function checkpointFile(): string {
  return join(ROOT_OUT, "_checkpoint.json");
}

function loadCheckpoint(): ProgressCheckpoint {
  try {
    const f = checkpointFile();
    if (existsSync(f)) return JSON.parse(readFileSync(f, "utf-8"));
  } catch {}
  return { completed: [], total: 0, errors: 0 };
}

function saveCheckpoint(cp: ProgressCheckpoint): void {
  const f = checkpointFile();
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(cp, null, 2), "utf-8");
}

// ─── Chapter discovery ──────────────────────────────────────────────

interface DiscoveredChapter {
  key: string;
  title: string;
  order: number;
}

async function discoverChapters(subjectSlug: SubjectSlug): Promise<DiscoveredChapter[]> {
  // The subject-level page only works at /past-years/jee/jee-main/__data.json
  // (returns 6165 entries), but the per-subject entries are nested under the
  // examGroup root with all subjects aggregated.
  const url = `${BASE_URL}/past-years/jee/${EXAM_SLUG}/__data.json`;
  console.log(`  Fetching subject index: ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyUltBot/1.0; +https://evstudy.app)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on subject index`);
  const raw = await res.text();
  const parsed = JSON.parse(raw);
  const nodes = parsed.nodes;
  if (!nodes || nodes.length < 2 || nodes[1].type !== "data") {
    throw new Error("Unexpected subject index structure");
  }
  const resolved = resolveCompactData(nodes[1].data);

  // Find the examGroup root entry that has a `subjects` array.
  let subjects: Array<Record<string, unknown>> = [];
  for (const it of resolved) {
    if (!it || typeof it !== "object" || Array.isArray(it)) continue;
    const o = it as Record<string, unknown>;
    if (o.key === EXAM_SLUG && Array.isArray(o.subjects)) {
      subjects = o.subjects as Array<Record<string, unknown>>;
      break;
    }
  }
  if (subjects.length === 0) {
    throw new Error(`No subjects found in examGroup ${EXAM_SLUG}`);
  }

  const subject = subjects.find((s) => s.key === subjectSlug);
  if (!subject) {
    throw new Error(`Subject ${subjectSlug} not in examGroup`);
  }
  const chapters = subject.chapters as Array<Record<string, unknown>>;
  if (!Array.isArray(chapters)) {
    throw new Error(`No chapters array for subject ${subjectSlug}`);
  }
  return chapters
    .map((c) => ({
      key: c.key as string,
      title: (c.title as string) || (c.name as string) || (c.key as string),
      order: (c.order as number) ?? 999,
    }))
    .sort((a, b) => a.order - b.order);
}

// ─── Helpers ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Scrape a single chapter ────────────────────────────────────────

async function scrapeChapter(
  subject: { name: string; slug: string },
  chapter: DiscoveredChapter,
  checkpoint: ProgressCheckpoint
): Promise<number> {
  const key = `${subject.slug}/${chapter.key}`;

  if (checkpoint.completed.includes(key)) {
    console.log(`  ⏭ Skipped (already done)`);
    return 0;
  }

  const dataUrl = `${BASE_URL}/past-years/jee/${EXAM_SLUG}/${subject.slug}/${chapter.key}/__data.json`;
  const safeName = chapter.title.replace(/[:*?"<>|]/g, "-");
  const chapterDir = join(ROOT_OUT, subject.name, safeName);

  let questions: ScrapedQuestion[];
  try {
    const res = await fetch(dataUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; StudyUltBot/1.0; +https://evstudy.app)",
        "Referer": `${BASE_URL}/past-years/jee/${EXAM_SLUG}/${subject.slug}`,
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      if (res.status === 404) {
        console.log(`  ⏭ 404 — chapter may not exist on ExamSIDE`);
        checkpoint.completed.push(key);
        saveCheckpoint(checkpoint);
        return 0;
      }
      throw new Error(`HTTP ${res.status}`);
    }
    const rawJson = await res.text();
    // Sanity check: JEE chapter pages sometimes return type: "error" with 200
    try {
      const probe = JSON.parse(rawJson);
      if (probe.nodes?.[1]?.type === "error") {
        console.log(`  ⏭ Data node is error — chapter may not exist on ExamSIDE`);
        checkpoint.completed.push(key);
        saveCheckpoint(checkpoint);
        return 0;
      }
    } catch {}
    questions = extractChapterQuestions(
      rawJson,
      subject.name,
      chapter.title,
      `${BASE_URL}/past-years/jee/${EXAM_SLUG}`
    );
  } catch (err) {
    console.error(`  ❌ Fetch/decode error: ${err}`);
    checkpoint.errors++;
    saveCheckpoint(checkpoint);
    return 0;
  }

  if (questions.length === 0) {
    console.log(`  ⚠ No questions found`);
    checkpoint.completed.push(key);
    saveCheckpoint(checkpoint);
    return 0;
  }

  // Save
  mkdirSync(chapterDir, { recursive: true });

  let saved = 0;
  for (const q of questions) {
    const filePath = join(chapterDir, `${q.id}.json`);
    // Avoid overwriting with empty data
    if (q.questionText || q.options.length > 0) {
      writeFileSync(filePath, JSON.stringify(q, null, 2), "utf-8");
      saved++;
    }
  }

  // Also save combined file for easier access
  const combinedPath = join(chapterDir, "_all.json");
  writeFileSync(combinedPath, JSON.stringify(questions, null, 2), "utf-8");

  checkpoint.completed.push(key);
  checkpoint.total += saved;
  saveCheckpoint(checkpoint);

  console.log(`  ✅ ${saved} questions → ${chapterDir}`);
  return saved;
}

// ─── Summary ────────────────────────────────────────────────────────

function generateSummary(): void {
  console.log("\n══════════════════════════════════════════════");
  console.log(`         JEE MAIN SCRAPE SUMMARY`);
  console.log("══════════════════════════════════════════════");

  let grandTotal = 0;

  for (const subject of SUBJECTS) {
    const subjectDir = join(ROOT_OUT, subject.name);
    if (!existsSync(subjectDir)) {
      console.log(`\n${subject.name}: (no data)`);
      continue;
    }

    const chapters = readdirSync(subjectDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let subTotal = 0;
    console.log(`\n${subject.name}:`);

    for (const ch of chapters) {
      const combinedFile = join(subjectDir, ch, "_all.json");
      if (!existsSync(combinedFile)) continue;
      try {
        const data = JSON.parse(readFileSync(combinedFile, "utf-8"));
        const count = Array.isArray(data) ? data.length : 0;
        if (count > 0) {
          const years = [...new Set(data.map((q: ScrapedQuestion) => q.year))].sort().join(", ");
          console.log(`  ${ch}: ${count} Qs (${years})`);
          subTotal += count;
        }
      } catch {}
    }

    console.log(`  ─── Total: ${subTotal} questions ───`);
    grandTotal += subTotal;
  }

  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  GRAND TOTAL: ${grandTotal} questions`);
  console.log(`  Output: ${ROOT_OUT}`);
  console.log("══════════════════════════════════════════════");
}

// ─── Entry point ────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const filterSubject = args[0] || "";
  const filterChapter = args[1] || "";

  console.log("╔══════════════════════════════════════════════╗");
  console.log(`║   ExamSIDE JEE Main Question Scraper        ║`);
  console.log("║   Uses __data.json (1 req/chapter)          ║");
  console.log("║   Chapters discovered dynamically            ║");
  console.log("╚══════════════════════════════════════════════╝");
  console.log(`Output: ${ROOT_OUT}`);
  console.log(`Delay: ${DELAY_MS}ms between chapters\n`);

  const checkpoint = loadCheckpoint();
  mkdirSync(ROOT_OUT, { recursive: true });

  const subjectsToScrape = SUBJECTS.filter(
    (s) => !filterSubject || s.slug === filterSubject
  );

  const startTime = Date.now();
  let totalQs = 0;
  let successChapters = 0;
  let failedChapters = 0;

  for (const subject of subjectsToScrape) {
    console.log(`\n📘 ${subject.name} — discovering chapters...`);

    let chapters: DiscoveredChapter[];
    try {
      chapters = await discoverChapters(subject.slug);
    } catch (err) {
      console.error(`  ❌ Chapter discovery failed: ${err}`);
      checkpoint.errors++;
      saveCheckpoint(checkpoint);
      continue;
    }
    console.log(`  Found ${chapters.length} chapters`);

    const chaptersToScrape = filterChapter
      ? chapters.filter((ch) => ch.key === filterChapter)
      : chapters;

    for (let i = 0; i < chaptersToScrape.length; i++) {
      const chapter = chaptersToScrape[i];
      const key = `${subject.slug}/${chapter.key}`;
      const progress = `[${i + 1}/${chaptersToScrape.length}]`;

      if (checkpoint.completed.includes(key)) {
        console.log(`  ${progress} ⏭ ${chapter.title} (already done)`);
        continue;
      }

      process.stdout.write(`  ${progress} ${chapter.title}... `);
      const count = await scrapeChapter(subject, chapter, checkpoint);

      if (count > 0) {
        totalQs += count;
        successChapters++;
      } else {
        failedChapters++;
      }

      await sleep(DELAY_MS);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`  Done in ${elapsed} minutes`);
  console.log(`  Chapters: ${successChapters} succeeded, ${failedChapters} failed/empty`);
  console.log(`  Total questions: ${totalQs}`);
  console.log(`  Errors: ${checkpoint.errors}`);
  console.log(`  Checkpoint: ${checkpointFile()}`);

  generateSummary();
}

main().catch(console.error);
