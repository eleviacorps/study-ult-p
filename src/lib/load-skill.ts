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

  // ── Compact combined version ──
  // Truncate skill.md to the first 8000 chars (~8KB) to control payload.
  // Full skill is always available via loadSkill() if needed.
  let combined = `# SKILL: Study Material Generator\n\n`;
  combined += skill.length > 8000 ? skill.substring(0, 8000) + "\n... [skill.md truncated — key instructions preserved]" : skill;
  combined += `\n\n`;

  for (const ref of references) {
    const excerpt = ref.content.length > 800 ? ref.content.substring(0, 800) + "\n... [truncated]" : ref.content;
    combined += `\n---\n# REFERENCE: ${ref.name}\n\n${excerpt}\n`;
  }

  const result: SkillFiles = { skill, references, combined };
  cache.set(cacheKey, result);
  return result;
}
