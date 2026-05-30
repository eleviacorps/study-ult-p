const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export interface Chunk {
  index: number;
  total: number;
  content: string;
  startPos: number;
  endPos: number;
}

export function chunkDocument(
  content: string,
  maxTokens: number = 512,
  overlapTokens: number = 50
): Chunk[] {
  if (!content || content.trim().length === 0) return [];

  const paragraphs = splitParagraphs(content);
  if (paragraphs.length === 0) return [];

  const chunks: Chunk[] = [];
  let buffer: string[] = [];
  let bufferTokens = 0;
  let startPos = 0;
  let bytePos = 0;

  function flush(endPos: number) {
    const text = buffer.join("\n\n").trim();
    if (!text) return;
    chunks.push({
      index: chunks.length,
      total: 0,
      content: text,
      startPos,
      endPos,
    });
  }

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para.text);
    const canFit = bufferTokens + paraTokens <= maxTokens;

    if (!canFit && buffer.length > 0) {
      flush(bytePos);
      // Carry overlap from the tail of the buffer
      const overlapText = carryOverlap(buffer, overlapTokens);
      buffer = overlapText ? [overlapText] : [];
      bufferTokens = overlapText ? estimateTokens(overlapText) : 0;
      startPos = bytePos - (overlapText ? overlapText.length : 0);
    }

    buffer.push(para.text);
    bufferTokens += paraTokens;
    bytePos += para.rawLength;
  }

  if (buffer.length > 0) {
    flush(content.length);
  }

  // Update totals
  for (const c of chunks) c.total = chunks.length;

  return chunks;
}

interface Para {
  text: string;
  rawLength: number;
}

function splitParagraphs(text: string): Para[] {
  const parts = text.split(/\n\n+/);
  const result: Para[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // Preserve the length of the original matched section including the delimiter
    const idx = text.indexOf(trimmed);
    const raw = idx >= 0 ? text.substring(idx, idx + trimmed.length) : trimmed;
    result.push({ text: trimmed, rawLength: raw.length });
    // Advance past this match to find next
    if (idx >= 0) {
      text = text.substring(idx + raw.length);
    }
  }
  return result;
}

function carryOverlap(buffer: string[], overlapTokens: number): string {
  // Walk backwards through the buffer accumulating token estimates
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  let collected = "";
  for (let i = buffer.length - 1; i >= 0; i--) {
    const candidate = buffer[i] + (collected ? "\n\n" : "");
    if (candidate.length > overlapChars && collected.length > 0) break;
    collected = buffer[i] + (collected ? "\n\n" : "") + collected;
    if (collected.length >= overlapChars) break;
  }
  return collected;
}
