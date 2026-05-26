interface SkillFiles {
  skill: string;
  references: { name: string; content: string }[];
  combined: string;
}

let cached: SkillFiles | null = null;

export async function loadSkill(): Promise<SkillFiles> {
  if (cached) return cached;

  const base = "/skills/study-ult";
  const skillRes = await fetch(`${base}/skill.md`);
  if (!skillRes.ok) throw new Error("Failed to load skill.md");
  const skill = await skillRes.text();

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

  let combined = `# SKILL: Study Material Generator\n\n${skill}\n\n`;
  for (const ref of references) {
    combined += `\n---\n# REFERENCE: ${ref.name}\n\n${ref.content}\n`;
  }

  cached = { skill, references, combined };
  return cached;
}
