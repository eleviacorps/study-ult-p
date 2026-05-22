/**
 * Auto-indexing content database.
 *
 * Directory structure:
 *   content/
 *     physics/
 *       electrostatics/
 *         notes/
 *           note1.md
 *         questions/
 *           mcq1.md
 *         flashcards/
 *           cards.md
 *     chemistry/
 *       ...
 *     math/
 *       ...
 *
 * Drop any .md file into the correct folder, and it auto-indexes.
 */

import fs from "fs";
import path from "path";

const CONTENT_ROOT = path.join(process.cwd(), "content");

export interface ContentIndex {
  subjects: SubjectIndex[];
  lastScanned: string;
}

export interface SubjectIndex {
  name: string;
  path: string;
  chapters: ChapterIndex[];
}

export interface ChapterIndex {
  name: string;
  path: string;
  notes: ContentFile[];
  questions: ContentFile[];
  flashcards: ContentFile[];
  quizzes: ContentFile[];
}

export interface ContentFile {
  name: string;
  path: string;
  relativePath: string;
  size: number;
  modified: string;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function scanDirectory(dir: string, ext: string = ".md"): ContentFile[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => {
      const fullPath = path.join(dir, f);
      const stat = fs.statSync(fullPath);
      return {
        name: f.replace(ext, ""),
        path: fullPath,
        relativePath: path.relative(CONTENT_ROOT, fullPath),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });
}

export function initializeContentDirs() {
  const subjects = ["physics", "chemistry", "math"];
  for (const subject of subjects) {
    const subDir = path.join(CONTENT_ROOT, subject);
    ensureDir(subDir);
    const readme = path.join(subDir, "README.md");
    if (!fs.existsSync(readme)) {
      fs.writeFileSync(
        readme,
        `# ${subject.charAt(0).toUpperCase() + subject.slice(1)}\n\nDrop your .md files here. Create subdirectories for each chapter with notes/, questions/, flashcards/, and quizzes/ folders.\n`
      );
    }
  }
}

export function scanContent(): ContentIndex {
  if (!fs.existsSync(CONTENT_ROOT)) {
    fs.mkdirSync(CONTENT_ROOT, { recursive: true });
    initializeContentDirs();
  }

  const subjects: SubjectIndex[] = [];

  const subjectDirs = fs.readdirSync(CONTENT_ROOT).filter((d) => {
    const full = path.join(CONTENT_ROOT, d);
    return fs.statSync(full).isDirectory() && !d.startsWith(".");
  });

  for (const subjectName of subjectDirs) {
    const subjectPath = path.join(CONTENT_ROOT, subjectName);
    const chapters: ChapterIndex[] = [];

    const chapterDirs = fs.readdirSync(subjectPath).filter((d) => {
      const full = path.join(subjectPath, d);
      return fs.statSync(full).isDirectory();
    });

    for (const chapterName of chapterDirs) {
      const chapterPath = path.join(subjectPath, chapterName);
      chapters.push({
        name: chapterName,
        path: chapterPath,
        notes: scanDirectory(path.join(chapterPath, "notes")),
        questions: scanDirectory(path.join(chapterPath, "questions")),
        flashcards: scanDirectory(path.join(chapterPath, "flashcards")),
        quizzes: scanDirectory(path.join(chapterPath, "quizzes")),
      });
    }

    subjects.push({
      name: subjectName,
      path: subjectPath,
      chapters,
    });
  }

  return {
    subjects,
    lastScanned: new Date().toISOString(),
  };
}

export function getContentFile(filePath: string): string | null {
  const fullPath = path.resolve(CONTENT_ROOT, filePath);
  if (!fullPath.startsWith(CONTENT_ROOT)) return null;
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, "utf-8");
}
