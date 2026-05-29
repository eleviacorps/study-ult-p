export const MAX_MERMAID_BYTES = 12000;

export const MERMAID_STARTERS = [
  "mindmap",
  "graph ",
  "flowchart ",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "timeline",
  "gitGraph",
  "quadrantChart",
  "xychart-beta",
  "requirementDiagram",
  "block",
  "packet",
  "C4Context",
  "C4Container",
  "C4Component",
  "C4Deployment",
  "C4Dynamic",
  "info",
  "showLegend",
] as const;

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
