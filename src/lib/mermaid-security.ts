export const MAX_MERMAID_BYTES = 12000;

const MERMAID_STARTERS = [
  "mindmap",
  "graph ",
  "flowchart ",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "timeline",
  "gitGraph",
];

export function isMermaidSource(source: string): boolean {
  if (!source || new TextEncoder().encode(source).length > MAX_MERMAID_BYTES) return false;
  const firstLine = source.split(/\r?\n/).find((line) => line.trim())?.trim() || "";
  return MERMAID_STARTERS.some((starter) => firstLine.startsWith(starter));
}

export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*"javascript:[^"]*"/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*'javascript:[^']*'/gi, "");
}
