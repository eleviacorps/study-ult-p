/**
 * ExamSIDE NEET Question Scraper
 *
 * Scrapes all NEET past-year questions (Physics, Chemistry, Biology)
 * chapter by chapter using the SvelteKit __data.json endpoint.
 * Outputs structured JSON to scraped/neet/{subject}/{chapter}/.
 *
 * Usage:
 *   npx tsx scripts/scrape-neet.ts              # all subjects
 *   npx tsx scripts/scrape-neet.ts physics       # only physics
 *   npx tsx scripts/scrape-neet.ts physics units-and-measurement  # single chapter
 *
 * The __data.json approach extracts ALL questions per chapter in 1 HTTP request,
 * including question text, options, correct answer, and solution.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync, readdirSync } from "fs";
import { join, dirname } from "path";

// Reuse the SvelteKit decoder
import { extractChapterQuestions, ScrapedQuestion } from "./decode-sveltekit";

// ─── NEET Chapter Configuration ─────────────────────────────────────

const BASE_URL = "https://questions.examside.com";
const CHAPTER_URL_BASE = `${BASE_URL}/past-years/medical/question`;
const DELAY_MS = 800;

interface SubjectConfig {
  name: string;
  slug: string;
  chapters: { name: string; slug: string }[];
}

const SUBJECTS: SubjectConfig[] = [
  {
    name: "Physics", slug: "physics",
    chapters: [
      { name: "Units & Measurement", slug: "units-and-measurement" },
      { name: "Motion in a Straight Line", slug: "motion-in-a-straight-line" },
      { name: "Motion in a Plane", slug: "motion-in-a-plane" },
      { name: "Laws of Motion", slug: "laws-of-motion" },
      { name: "Work, Energy and Power", slug: "work-energy-and-power" },
      { name: "Center of Mass and Collision", slug: "center-of-mass-and-collision" },
      { name: "Rotational Motion", slug: "rotational-motion" },
      { name: "Gravitation", slug: "gravitation" },
      { name: "Properties of Matter", slug: "properties-of-matter" },
      { name: "Heat and Thermodynamics", slug: "heat-and-thermodynamics" },
      { name: "Oscillations", slug: "oscillations" },
      { name: "Waves", slug: "waves" },
      { name: "Electrostatics", slug: "electrostatics" },
      { name: "Current Electricity", slug: "current-electricity" },
      { name: "Capacitor", slug: "capacitor" },
      { name: "Moving Charges and Magnetism", slug: "moving-charges-and-magnetism" },
      { name: "Magnetism and Matter", slug: "magnetism-and-matter" },
      { name: "Electromagnetic Induction", slug: "electromagnetic-induction" },
      { name: "Alternating Current", slug: "alternating-current" },
      { name: "Electromagnetic Waves", slug: "electromagnetic-waves" },
      { name: "Geometrical Optics", slug: "geometrical-optics" },
      { name: "Wave Optics", slug: "wave-optics" },
      { name: "Atoms and Nuclei", slug: "atoms-and-nuclei" },
      { name: "Dual Nature of Radiation and Matter", slug: "dual-nature-of-radiation-and-matter" },
      { name: "Semiconductor Electronics", slug: "semiconductor-electronics" },
    ],
  },
  {
    name: "Chemistry", slug: "chemistry",
    chapters: [
      { name: "Some Basic Concepts of Chemistry", slug: "some-basic-concepts-of-chemistry" },
      { name: "Structure of Atom", slug: "structure-of-atom" },
      { name: "Redox Reactions", slug: "redox-reactions" },
      { name: "Gaseous State", slug: "gaseous-state" },
      { name: "Chemical Equilibrium", slug: "chemical-equilibrium" },
      { name: "Ionic Equilibrium", slug: "ionic-equilibrum" },
      { name: "Solutions", slug: "solutions" },
      { name: "Thermodynamics", slug: "thermodynamics" },
      { name: "Electrochemistry", slug: "electrochemistry" },
      { name: "Chemical Kinetics", slug: "chemical-kinetics" },
      { name: "Nuclear Chemistry", slug: "nuclear-chemistry" },
      { name: "Solid State", slug: "solid-state" },
      { name: "Surface Chemistry", slug: "surface-chemistry" },
      { name: "Periodic Table and Periodicity", slug: "periodic-table-and-periodicity" },
      { name: "Chemical Bonding and Molecular Structure", slug: "chemical-bonding-and-molecular-structure" },
      { name: "Processes of Isolation of Elements", slug: "processes-of-isolation-of-elements" },
      { name: "s-Block Elements", slug: "s-block-elements" },
      { name: "Hydrogen", slug: "hydrogen" },
      { name: "p-Block Elements", slug: "p-block-elements" },
      { name: "d and f Block Elements", slug: "d-and-f-block-elements" },
      { name: "Coordination Compounds", slug: "coordination-compounds" },
      { name: "Environmental Chemistry", slug: "environmental-chemistry" },
      { name: "Some Basic Concepts of Organic Chemistry", slug: "some-basic-concepts-of-organic-chemistry" },
      { name: "Hydrocarbons", slug: "hydrocarbons" },
      { name: "Haloalkanes and Haloarenes", slug: "haloalkanes-and-haloarenes" },
      { name: "Alcohol, Phenols and Ethers", slug: "alcohol-phenols-and-ethers" },
      { name: "Aldehydes, Ketones and Carboxylic Acids", slug: "aldehydes-ketones-and-carboxylic-acids" },
      { name: "Organic Compounds Containing Nitrogen", slug: "organic-compounds-containing-nitrogen" },
      { name: "Polymers", slug: "polymers" },
      { name: "Biomolecules", slug: "biomolecules" },
      { name: "Chemistry in Everyday Life", slug: "chemistry-in-everyday-life" },
    ],
  },
  {
    name: "Biology", slug: "biology",
    chapters: [
      { name: "Cell - The Unit of Life", slug: "cell-the-unit-of-life" },
      { name: "Biomolecules", slug: "biomolecules" },
      { name: "Cell Cycle and Cell Division", slug: "cell-cycle-and-cell-division" },
      { name: "Sexual Reproduction in Flowering Plants", slug: "sexual-reproduction-in-flowering-plants" },
      { name: "Microbes in Human Welfare", slug: "microbes-in-human-welfare" },
      { name: "Anatomy of Flowering Plants", slug: "anatomy-of-flowering-plants" },
      { name: "Transport in Plants", slug: "transport-in-plants" },
      { name: "Mineral Nutrition", slug: "mineral-nutrition" },
      { name: "Respiration in Plants", slug: "respiration-in-plants" },
      { name: "Biotechnology: Principles and Processes", slug: "biotechnology-principles-and-processes" },
      { name: "Biodiversity and Conservation", slug: "biodiversity-and-conservation" },
      { name: "The Living World", slug: "the-living-world" },
      { name: "Biological Classification", slug: "biological-classification" },
      { name: "Morphology of Flowering Plants", slug: "morphology-of-flowering-plants" },
      { name: "Photosynthesis in Higher Plants", slug: "photosynthesis-in-higher-plants" },
      { name: "Principles of Inheritance and Variation", slug: "principles-of-inheritance-and-variation" },
      { name: "Molecular Basis of Inheritance", slug: "molecular-basis-of-inheritance" },
      { name: "Strategies for Enhancement in Food Production", slug: "strategies-for-enhancement-in-food-production" },
      { name: "Biotechnology and Its Applications", slug: "biotechnology-and-its-applications" },
      { name: "Organisms and Populations", slug: "organisms-and-populations" },
      { name: "Environmental Issues", slug: "environmental-issues" },
      { name: "Plant Kingdom", slug: "plant-kingdom" },
      { name: "Plant Growth and Development", slug: "plant-growth-and-development" },
      { name: "Ecosystem", slug: "ecosystem" },
      { name: "Human Health and Diseases", slug: "human-health-and-diseases" },
      { name: "Body Fluids and Its Circulation", slug: "body-fluids-and-its-circulation" },
      { name: "Locomotion and Movement", slug: "locomotion-and-movement" },
      { name: "Neural Control and Coordination", slug: "neural-control-and-coordination" },
      { name: "Reproduction in Organisms", slug: "reproduction-in-organisms" },
      { name: "Reproductive Health", slug: "reproductive-health" },
      { name: "Structural Organisation in Animals", slug: "structural-organisation-in-animals" },
      { name: "Digestion and Absorption", slug: "digestion-and-absorption" },
      { name: "Excretory Products and Their Elimination", slug: "excretory-products-and-their-elimination" },
      { name: "Chemical Coordination and Integration", slug: "chemical-coordination-and-integration" },
      { name: "Human Reproduction", slug: "human-reproduction" },
      { name: "Animal Kingdom", slug: "animal-kingdom" },
      { name: "Breathing and Exchange of Gases", slug: "breathing-and-exchange-of-gases" },
      { name: "Evolution", slug: "evolution" },
    ],
  },
];

// ─── Output ─────────────────────────────────────────────────────────

const ROOT_OUT = join(__dirname, "..", "scraped", "neet");

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

// ─── Helpers ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Scrape a single chapter ────────────────────────────────────────

async function scrapeChapter(
  subject: SubjectConfig,
  chapter: { name: string; slug: string },
  checkpoint: ProgressCheckpoint
): Promise<number> {
  const key = `${subject.slug}/${chapter.slug}`;

  if (checkpoint.completed.includes(key)) {
    console.log(`  ⏭ Skipped (already done)`);
    return 0;
  }

  const dataUrl = `${BASE_URL}/past-years/medical/neet/${subject.slug}/${chapter.slug}/__data.json`;
  const safeName = chapter.name.replace(/[:*?"<>|]/g, "-");
  const chapterDir = join(ROOT_OUT, subject.name, safeName);

  let questions: ScrapedQuestion[];
  try {
    const res = await fetch(dataUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyUltBot/1.0; +https://evstudy.app)" },
      signal: AbortSignal.timeout(20000),
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
    questions = extractChapterQuestions(rawJson, subject.name, chapter.name, CHAPTER_URL_BASE);
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

  // Also save combined file for easier RAG access
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
  console.log("                  SUMMARY");
  console.log("══════════════════════════════════════════════");

  const subjects = ["Physics", "Chemistry", "Biology"];
  let grandTotal = 0;

  for (const subject of subjects) {
    const subjectDir = join(ROOT_OUT, subject);
    if (!existsSync(subjectDir)) {
      console.log(`\n${subject}: (no data)`);
      continue;
    }

    const chapters = readdirSync(subjectDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    let subTotal = 0;
    console.log(`\n${subject}:`);

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
  console.log("║   ExamSIDE NEET Question Scraper            ║");
  console.log("║   Uses __data.json (1 req/chapter)          ║");
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
    const chaptersToScrape = subject.chapters.filter(
      (ch) => !filterChapter || ch.slug === filterChapter
    );

    console.log(`\n📘 ${subject.name} (${chaptersToScrape.length} chapters)`);

    for (let i = 0; i < chaptersToScrape.length; i++) {
      const chapter = chaptersToScrape[i];
      const key = `${subject.slug}/${chapter.slug}`;
      const progress = `[${i + 1}/${chaptersToScrape.length}]`;

      if (checkpoint.completed.includes(key)) {
        console.log(`  ${progress} ⏭ ${chapter.name} (already done)`);
        continue;
      }

      process.stdout.write(`  ${progress} ${chapter.name}... `);
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
