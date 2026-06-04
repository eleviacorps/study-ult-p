/**
 * Decode SvelteKit __data.json compact format.
 * 
 * SvelteKit serializes its load function data into a compact format
 * where arrays use integer indices as references to previously defined values.
 * 
 * Reference: https://kit.svelte.dev/docs/form-actions#get-vs-post
 */

export interface SvelteKitData {
  type: "data";
  nodes: SvelteKitNode[];
}

interface SvelteKitNode {
  type: "data";
  data: unknown[];
  [key: string]: unknown;
}

/**
 * Resolve a SvelteKit compact array.
 *
 * The format uses a flat array where integer values are indices
 * referencing other elements in the same array. References can
 * be forward or backward. This recursive resolver handles both.
 */
export function resolveCompactData(data: unknown[]): unknown[] {
  const resolved: unknown[] = [];

  function isIdx(n: number): boolean {
    return Number.isInteger(n) && n >= 0 && n < data.length;
  }

  /**
   * Look up a reference by index.
   * Integers in object fields / array positions are references into `data`.
   * The value at data[idx] may itself be a primitive, object, or array.
   * - If primitive: return as-is (literal value, never a reference)
   * - If object:   recursively resolve its fields
   * - If array:    recursively resolve its elements
   */
  function resolveRef(idx: number): unknown {
    const val = data[idx];
    return resolveDeref(val);
  }

  /**
   * Dereference a raw value from the data array.
   * Integers encountered here are NOT further resolved — they are literals.
   * Only object fields and array elements trigger reference resolution.
   */
  function resolveDeref(val: unknown): unknown {
    if (Array.isArray(val)) {
      const first = val[0];
      if (typeof first === "object" && first !== null && (first as Record<string, unknown>).type === "data") {
        // Nested SvelteKit data node — resolve elements shallowly
        return val.map((v) => {
          if (typeof v === "number" && isIdx(v)) return resolveRef(v);
          if (Array.isArray(v)) return v.map((x) => (typeof x === "number" && isIdx(x) ? resolveRef(x) : x));
          if (v !== null && typeof v === "object" && !Array.isArray(v)) return resolveObjFields(v as Record<string, unknown>);
          return v;
        });
      }
      return val.map((v) => (typeof v === "number" && isIdx(v) ? resolveRef(v) : resolveDeref(v)));
    }
    if (val !== null && typeof val === "object") {
      return resolveObjFields(val as Record<string, unknown>);
    }
    return val;
  }

  function resolveObjFields(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(obj)) {
      if (typeof v === "number" && isIdx(v)) {
        // Object field values that are valid indices are references
        result[key] = resolveRef(v);
      } else if (Array.isArray(v)) {
        result[key] = v.map((x) => (typeof x === "number" && isIdx(x) ? resolveRef(x) : resolveDeref(x)));
      } else if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        result[key] = resolveObjFields(v as Record<string, unknown>);
      } else {
        result[key] = v;
      }
    }
    return result;
  }

  // Build the resolved array for standalone elements
  // Standalone elements at index i: if it's an integer N < i, it's a reference
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (typeof val === "number" && isIdx(val) && val < i) {
      resolved.push(resolved[val]);
    } else if (typeof val === "number" && isIdx(val) && val >= i) {
      // Forward reference — should not happen for top-level elements
      resolved.push(resolveRef(val));
    } else if (Array.isArray(val)) {
      resolved.push(resolveDeref(val));
    } else if (val !== null && typeof val === "object") {
      resolved.push(resolveObjFields(val as Record<string, unknown>));
    } else {
      resolved.push(val);
    }
  }

  return resolved;
}

export interface ScrapedQuestion {
  id: string;
  url: string;
  year: string;
  subject: string;
  chapter: string;
  type: string;
  difficulty: string;
  marks: number;
  negMarks: number;
  questionHtml: string;
  questionText: string;
  options: { label: string; html: string; text: string }[];
  correctAnswer: string;
  solutionHtml: string;
  solutionText: string;
  hasDiagram: boolean;
  diagramUrls: string[];
}

export interface ChapterQuestions {
  subject: string;
  chapter: string;
  questions: ScrapedQuestion[];
}

/**
 * Extract all NEET questions from a chapter's __data.json
 */
export function extractChapterQuestions(
  rawJson: string,
  subject: string,
  chapter: string,
  baseQuestionUrl: string
): ScrapedQuestion[] {
  const parsed = JSON.parse(rawJson);
  
  // Top level is { type: "data", nodes: [...] }
  // The second node (index 1) is the page data
  const nodes = parsed.nodes;
  if (!nodes || nodes.length < 2) {
    console.warn("Unexpected data format: not enough nodes");
    return [];
  }

  const pageData = nodes[1];
  if (!pageData || pageData.type !== "data") {
    console.warn("Node 1 is not data type");
    return [];
  }

  const dataArr = pageData.data;
  if (!Array.isArray(dataArr)) {
    console.warn("Node 1 data is not array");
    return [];
  }

  // Resolve the compact array format
  const resolved = resolveCompactData(dataArr);

  // Now search for question data in the resolved array
  const questions: ScrapedQuestion[] = [];

  // Find question objects: they have "question_id" and "question" fields with "en"/"hi" sub-objects
  for (let i = 0; i < resolved.length; i++) {
    const item = resolved[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    
    const obj = item as Record<string, unknown>;
    const qid = obj.question_id as string | undefined;
    const qdata = obj.question as Record<string, unknown> | undefined;
    const qtype = obj.type as string | undefined;
    const qyearKey = obj.yearKey as string | undefined;
    const qdiff = obj.difficulty as string | undefined;
    const marks = obj.marks as number | undefined;
    const negMarks = obj.negMarks as number | undefined;
    const permalink = obj.permalink as string | undefined;
    const topic = obj.topic as string | undefined;
    const difficulty = obj.difficulty as string | undefined;

    // Extract year from yearKey (e.g., "neet-2026" → "2026", "neet-2025" → "2025")
    let year = "";
    if (qyearKey) {
      const yearMatch = qyearKey.match(/(\d{4})/);
      if (yearMatch) year = yearMatch[1];
    }
    // Fallback to paperId
    if (!year) {
      const qpaperId = obj.paperId as string | undefined;
      if (qpaperId) {
        const yearMatch = qpaperId.match(/(\d{4})/);
        if (yearMatch) year = yearMatch[1];
      }
    }

    if (!qid || !qdata) continue;
    if (!qdata.en && !qdata.hi) continue;

    const enData = qdata.en as Record<string, unknown> | undefined;

    // Extract content from English version (fall back to Hindi)
    let content = "";
    let options: { identifier: string; content: string }[] = [];
    const correctOptions: number[] = [];
    let explanation = "";

    if (enData) {
      content = enData.content as string || "";
      explanation = enData.explanation as string || "";
      
      // Options - array of {identifier: string, content: string}
      const optsArr = enData.options as unknown[];
      if (optsArr && Array.isArray(optsArr)) {
        for (const opt of optsArr) {
          if (opt && typeof opt === "object") {
            const optObj = opt as Record<string, unknown>;
            const id = optObj.identifier as string || "";
            const ct = optObj.content as string || "";
            options.push({ identifier: id, content: ct });
          }
        }
      }

      // Correct options - array of identifier strings
      const correctArr = enData.correct_options as unknown[];
      if (correctArr && Array.isArray(correctArr)) {
        for (const co of correctArr) {
          if (typeof co === "string") {
            // Find matching option index
            const idx = options.findIndex((o) => o.identifier === co);
            if (idx >= 0) correctOptions.push(idx);
          }
        }
      }
    }

    // If no English data, try Hindi
    if (!content) {
      const hiData = qdata.hi as Record<string, unknown> | undefined;
      if (hiData) {
        content = hiData.content as string || "";
        explanation = hiData.explanation as string || "";
        const optsArr = hiData.options as unknown[];
        if (optsArr && Array.isArray(optsArr)) {
          options = [];
          for (const opt of optsArr) {
            if (opt && typeof opt === "object") {
              const optObj = opt as Record<string, unknown>;
              options.push({ identifier: optObj.identifier as string || "", content: optObj.content as string || "" });
            }
          }
        }
      }
    }

    const correctIdentifier = correctOptions.length > 0 ? options[correctOptions[0]]?.identifier || "" : "";
    const questionUrl = permalink ? `${baseQuestionUrl}/${permalink}` : "";

    // Check for diagram images
    const hasDiagram = content.includes("<img") || options.some((o) => o.content.includes("<img"));
    const diagramUrls: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    let imgMatch: RegExpExecArray | null;
    while ((imgMatch = imgRegex.exec(content)) !== null) {
      const src = imgMatch[1];
      if (!src.includes("google_translate") && !src.includes("warning")) {
        diagramUrls.push(src.startsWith("http") ? src : `https://questions.examside.com${src}`);
      }
    }

    questions.push({
      id: qid,
      url: questionUrl,
      year,
      subject,
      chapter,
      type: qtype || "MCQ (Single Correct Answer)",
      difficulty: difficulty || "",
      marks: marks || 4,
      negMarks: negMarks || 1,
      questionHtml: content,
      questionText: stripHtmlFast(content),
      options: options.map((o) => ({
        label: o.identifier,
        html: o.content,
        text: stripHtmlFast(o.content),
      })),
      correctAnswer: correctIdentifier,
      solutionHtml: explanation,
      solutionText: stripHtmlFast(explanation),
      hasDiagram,
      diagramUrls,
    });
  }

  return questions;
}

function stripHtmlFast(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
