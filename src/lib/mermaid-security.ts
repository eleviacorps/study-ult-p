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

/**
 * Sanitize an SVG string against XSS attacks.
 * Uses multiple passes to catch script injection, event handlers,
 * data URIs, and embedded foreign objects.
 *
 * In a browser environment document.createDocumentFragment() + DOMParser
 * would be more robust, but this runs on Edge Runtime where DOM is unavailable.
 */
export function sanitizeSvg(svg: string): string {
  return svg
    // Strip all <script> blocks (case-insensitive)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // Strip <foreignObject> (potential HTML injection vector)
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    // Strip on* event handlers (quoted)
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, " ")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, " ")
    // Strip on* event handlers (unquoted)
    .replace(/\son[a-z]+\s*=\s*[^\s>/]+/gi, " ")
    // Strip javascript: in href/xlink:href
    .replace(/\s(?:href|xlink:href)\s*=\s*"javascript:[^"]*"/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*'javascript:[^']*'/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*javascript:[^\s>]+/gi, "")
    // Strip data: URIs in href/xlink:href
    .replace(/\s(?:href|xlink:href)\s*=\s*"data:[^"]*"/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*'data:[^']*'/gi, "")
    // Strip <use> elements with external references (XXE via SVG)
    .replace(/<use[^>]*href\s*=\s*"[^"]*\/[^"]*"[^>]*\/>/gi, "")
    // Strip <animate> and <set> elements (potential click-jacking)
    .replace(/<animate[\s\S]*?<\/animate>/gi, "")
    .replace(/<set[\s\S]*?\/>/gi, "");
}
