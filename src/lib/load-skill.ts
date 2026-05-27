import type { ExamPreset } from "./exam-presets";

interface SkillFiles {
  skill: string;
  references: { name: string; content: string }[];
  combined: string;
}

const cache = new Map<string, SkillFiles | null>();

function substitute(content: string, vars: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function loadSkill(examPreset?: ExamPreset): Promise<SkillFiles> {
  const cacheKey = examPreset?.id || "default";
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const base = "/skills/study-ult";
  const skillRes = await fetch(`${base}/skill.md`);
  if (!skillRes.ok) throw new Error("Failed to load skill.md");
  let skill = await skillRes.text();

  const refNames = [
    "note-template-full.md",
    "flashcard-patterns.md",
    "question-patterns.md",
    "note-formatting.md",
    "vault-structure.md",
  ];

  const references: { name: string; content: string }[] = [];
  for (const name of refNames) {
    const res = await fetch(`${base}/references/${name}`);
    if (res.ok) {
      references.push({ name, content: await res.text() });
    }
  }

  // Substitute variables in skill and references
  if (examPreset) {
    skill = substitute(skill, examPreset.variables);
    for (const ref of references) {
      ref.content = substitute(ref.content, examPreset.variables);
    }
  }

  let combined = `# SKILL: Study Material Generator\n\n${skill}\n\n`;
  for (const ref of references) {
    combined += `\n---\n# REFERENCE: ${ref.name}\n\n${ref.content}\n`;
  }

  const result: SkillFiles = { skill, references, combined };
  cache.set(cacheKey, result);
  return result;
}
