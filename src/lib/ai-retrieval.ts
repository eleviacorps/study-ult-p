"use client";

import type { Flashcard, Note, Question, VaultContent } from "@/types";
import { loadStudyState } from "@/lib/study-state";
import type { StudyState } from "@/lib/study-state";
import { createClient } from "@/lib/supabase/client";

type RetrievalChunk = {
  id: string;
  source: "note" | "question" | "flashcard" | "reader_context";
  title: string;
  chapter: string;
  subject: string;
  text: string;
  score: number;
};

type TutorContextOptions = {
  surface: "main_tutor" | "reader_sidebar";
  chapter?: string;
  subject?: string;
  readerContext?: string;
  chatSummary?: string;
  studentProfile?: {
    exam_goals?: { exam: string; target: string; timeline: string }[];
    preferred_difficulty?: string;
    survey?: Record<string, any>;
    tutor_personality_prompt?: string;
    generated_learning_profile?: string;
  };
};

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "anything", "chapter", "concept", "could", "explain", "from",
  "give", "have", "into", "just", "like", "make", "more", "need", "please", "show", "tell", "that",
  "their", "them", "then", "there", "this", "topic", "what", "when", "where", "which", "with", "would",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function compact(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function scoreText(text: string, queryTokens: string[], boosts: string[] = []): number {
  const haystack = text.toLowerCase();
  let score = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) score += token.length > 5 ? 3 : 2;
  }
  for (const boost of boosts) {
    if (boost && haystack.includes(boost.toLowerCase())) score += 4;
  }
  return score;
}

function splitNote(note: Note): string[] {
  const blocks = note.content
    .split(/\n{2,}/)
    .map((block) => compact(block, 900))
    .filter((block) => block.length > 120);
  return blocks.length > 0 ? blocks.slice(0, 8) : [compact(note.content, 900)].filter(Boolean);
}

function retrieveNotes(vault: VaultContent | null, query: string, options: TutorContextOptions): RetrievalChunk[] {
  if (!vault) return [];
  const queryTokens = tokenize(`${query} ${options.chapter || ""} ${options.subject || ""}`);
  const boosts = [options.chapter || "", options.subject || ""];
  const chunks: RetrievalChunk[] = [];

  for (const note of vault.notes) {
    if (options.chapter && note.chapter !== options.chapter) continue;
    splitNote(note).forEach((text, index) => {
      const score = scoreText(`${note.title} ${note.tags.join(" ")} ${text}`, queryTokens, boosts);
      if (score > 0 || options.chapter === note.chapter) {
        chunks.push({
          id: `${note.id || note.path}#${index + 1}`,
          source: "note",
          title: note.title,
          chapter: note.chapter,
          subject: note.subject,
          text,
          score,
        });
      }
    });
  }

  return chunks;
}

function retrieveQuestions(vault: VaultContent | null, query: string, options: TutorContextOptions): RetrievalChunk[] {
  if (!vault) return [];
  const queryTokens = tokenize(`${query} ${options.chapter || ""}`);
  return vault.questions
    .filter((question) => !options.chapter || question.chapter === options.chapter)
    .map((question: Question) => {
      const text = compact([
        question.title,
        question.given,
        question.find,
        question.solution,
        question.answer ? `Answer: ${question.answer}` : "",
      ].filter(Boolean).join(" "), 700);
      return {
        id: question.id,
        source: "question" as const,
        title: question.title,
        chapter: question.chapter,
        subject: question.subject,
        text,
        score: scoreText(`${question.topic} ${question.subtopic || ""} ${text}`, queryTokens, [options.chapter || ""]),
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function retrieveFlashcards(vault: VaultContent | null, query: string, options: TutorContextOptions): RetrievalChunk[] {
  if (!vault) return [];
  const queryTokens = tokenize(`${query} ${options.chapter || ""}`);
  return vault.flashcards
    .filter((card) => !options.chapter || card.chapter === options.chapter)
    .map((card: Flashcard) => {
      const text = compact([
        card.question,
        card.answer,
        card.formula ? `Formula: ${card.formula}` : "",
        card.memoryTrick ? `Memory: ${card.memoryTrick}` : "",
      ].filter(Boolean).join(" "), 600);
      return {
        id: card.id,
        source: "flashcard" as const,
        title: card.topic || card.question,
        chapter: card.chapter,
        subject: card.subject,
        text,
        score: scoreText(`${card.topic} ${card.subtopic || ""} ${text}`, queryTokens, [options.chapter || ""]),
      };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function retrieveReaderContext(query: string, options: TutorContextOptions): RetrievalChunk[] {
  if (!options.readerContext) return [];
  const queryTokens = tokenize(query);
  const blocks = options.readerContext
    .split(/\n{2,}/)
    .map((block) => compact(block, 800))
    .filter((block) => block.length > 80);

  return blocks
    .map((text, index) => ({
      id: `reader_context#${index + 1}`,
      source: "reader_context" as const,
      title: options.chapter || "Current reader context",
      chapter: options.chapter || "Current chapter",
      subject: options.subject || "",
      text,
      score: scoreText(text, queryTokens, [options.chapter || ""]),
    }))
    .filter((chunk) => chunk.score > 0 || indexIsEarly(chunk.id))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function indexIsEarly(id: string): boolean {
  const match = id.match(/#(\d+)$/);
  return match ? Number(match[1]) <= 2 : false;
}

export function buildStudentStateSnapshot(state: StudyState = loadStudyState(), profile?: TutorContextOptions["studentProfile"]) {
  const masteryMap = Object.fromEntries(
    Object.entries(state.topicAccuracy || {})
      .filter(([, value]) => value.total > 0)
      .slice(0, 20)
      .map(([topic, value]) => [topic, Math.round((value.correct / Math.max(1, value.total)) * 100)])
  );

  const recentFailures = (state.activitySnapshots || [])
    .filter((item) => item.total > 0 && item.score < item.total)
    .slice(0, 6)
    .map((item) => ({ type: item.type, chapter: item.chapter, score: item.score, total: item.total, topics: item.topics }));

  const recentStudyMinutes = Object.entries(state.studyMinutes || {}).slice(-7);

  return {
    mastery_map: masteryMap,
    weak_topics: (state.weakAreas || []).slice(0, 8).map((item) => ({ topic: item.topic, accuracy: item.accuracy, chapter: item.chapter })),
    confidence_levels: {},
    misconception_patterns: (state.predictedWeakness || []).slice(0, 5),
    recent_failures: recentFailures,
    learning_velocity: {
      last_7_logged_days: recentStudyMinutes,
      total_recent_minutes: recentStudyMinutes.reduce((sum, [, minutes]) => sum + Number(minutes || 0), 0),
    },
    focus_topics: (state.aiTodos || []).filter((todo) => !todo.completed).slice(0, 6).map((todo) => todo.task),
    recovery_queue: (state.aiTodos || []).filter((todo) => !todo.completed && todo.priority === "high").slice(0, 5),
    forgetting_curve_state: {
      reviewed_flashcards: Object.keys(state.reviewedFlashcards || {}).length,
      mastered_flashcards: Object.keys(state.masteredFlashcards || {}).length,
    },
    solved_question_embeddings: [],
    concept_relationships: [],
    exam_goals: profile?.exam_goals || [],
    preferred_difficulty: profile?.preferred_difficulty || "adaptive",
    tutor_personality_prompt: profile?.tutor_personality_prompt || "",
    generated_learning_profile: profile?.generated_learning_profile || "",
    adaptive_recommendations: (state.aiTodos || []).filter((todo) => !todo.completed).slice(0, 5),
    streak_data: { current: state.streak, longest: state.longestStreak, last_study_date: state.lastStudyDate },
    study_patterns: { recent_activity: (state.activityLog || []).slice(0, 8) },
    performance_trends: {
      recent_tests: (state.testScores || []).slice(-5),
      recent_quizzes: (state.quizScores || []).slice(-5),
    },
  };
}

function relatedConcepts(vault: VaultContent | null, chunks: RetrievalChunk[], chapter?: string) {
  if (!vault) return [];
  const chunkTitles = new Set(chunks.map((chunk) => chunk.title.toLowerCase()));
  const concepts = vault.conceptConnections
    .filter((connection) => !chapter || connection.chapter === chapter)
    .slice(0, 8)
    .map((connection) => ({
      chapter: connection.chapter,
      chain: connection.chain.filter((item) => chunkTitles.size === 0 || chunkTitles.has(item.toLowerCase()) || chapter === connection.chapter).slice(0, 8),
      relationships: connection.relationships.slice(0, 6),
    }))
    .filter((connection) => connection.chain.length > 0 || connection.relationships.length > 0);
  return concepts.slice(0, 5);
}

async function fetchStudentProfile(): Promise<TutorContextOptions["studentProfile"] | undefined> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return undefined;
    const [goalsRes, aiRes] = await Promise.all([
      supabase.from("student_goal_profiles").select("exam_goals,preferred_difficulty,survey").eq("user_id", user.id).maybeSingle(),
      supabase.from("student_ai_profiles").select("tutor_personality_prompt,generated_learning_profile").eq("user_id", user.id).maybeSingle(),
    ]);
    if (!goalsRes.data && !aiRes.data) return undefined;
    return { ...goalsRes.data, ...aiRes.data } as TutorContextOptions["studentProfile"];
  } catch {
    return undefined;
  }
}

function buildVaultSummary(vault: VaultContent | null): string {
  if (!vault || vault.chapters.length === 0) return "No vault content available.";
  const lines = vault.chapters.map((ch) => {
    const noteTitles = vault.notes
      .filter((n) => n.chapter === ch.name)
      .slice(0, 8)
      .map((n) => `  - ${n.title}`)
      .join("\n");
    return `## ${ch.name} (${ch.subject})\nTopics:\n${noteTitles || "  (no notes)"}`;
  });
  return lines.join("\n\n");
}

function topFallbackNotes(vault: VaultContent | null, maxChunks = 4): RetrievalChunk[] {
  if (!vault) return [];
  // Sort by content length (longest first) to pick the most substantive note per chapter
  const sorted = [...vault.notes].sort((a, b) => b.content.length - a.content.length);
  const chunks: RetrievalChunk[] = [];
  const seen = new Set<string>();
  for (const note of sorted) {
    const key = note.chapter;
    if (seen.has(key)) continue;
    seen.add(key);
    const block = compact(
      note.content.split(/\n{2,}/).filter((b) => b.length > 100).slice(0, 3).join("\n\n"),
      600
    );
    if (block.length > 50) {
      chunks.push({
        id: `fallback-${note.id || note.path}`,
        source: "note" as const,
        title: note.title,
        chapter: note.chapter,
        subject: note.subject,
        text: block,
        score: 0,
      });
    }
  }
  return chunks.slice(0, maxChunks);
}

export async function buildStructuredTutorContext(
  vault: VaultContent | null,
  question: string,
  options: TutorContextOptions
): Promise<string> {
  const profile = options.studentProfile || await fetchStudentProfile();
  const rankedRetrievals = [
    ...retrieveReaderContext(question, options),
    ...retrieveNotes(vault, question, options),
    ...retrieveQuestions(vault, question, options),
    ...retrieveFlashcards(vault, question, options),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  let retrievals = rankedRetrievals.map(({ score, ...chunk }) => chunk);

  // When retrievals are empty and no specific chapter is targeted, 
  // include a vault overview so the AI knows what content is available
  const hasChapterFilter = !!options.chapter;
  if (retrievals.length === 0 && !hasChapterFilter && vault) {
    const fallback = topFallbackNotes(vault);
    const summary = buildVaultSummary(vault);
    retrievals = [
      ...fallback,
      {
        id: "vault-summary",
        source: "note" as const,
        title: "Available Study Content",
        chapter: "All Chapters",
        subject: options.subject || "General",
        text: summary,
        score: 0,
      },
    ];
  }

  const payload = {
    role: "StudyUlt adaptive tutor",
    rules: [
      "Use the structured payload, not hidden assumptions.",
      "Do not ask for or reveal model/provider/API configuration.",
      "Use retrieved chunks and concept relationships when relevant.",
      "If retrieval is thin, use the available vault summary (chapters, topics) to guide your response. If no vault content exists, answer from general knowledge and note what would need verification.",
      "Keep responses concise, use standard markdown (## headings, - lists, **bold**).",
      "CRITICAL: For ALL mathematical formulas, ALWAYS use LaTeX with $inline$ or $$block$$ syntax. NEVER use Unicode symbols (like π, ϵ, θ, →, ∑, ∫, ², ³, vector arrows over letters) or raw characters instead of LaTeX. Every formula MUST be wrapped in $ or $$ delimiters. Do NOT use \( \) syntax — it does not render.",
      "Do NOT use emoji section headers like 🎯 or 🔬. Use standard markdown ## headings instead.",
      "Do NOT add decorative text or preamble before content. Start directly with the answer.",
      "Prefer hints first for problem solving unless the student asks for a full solution.",
      "You know the student's goals, exam targets, learning profile, and preferences from their onboarding data in student_state.exam_goals and student_state.generated_learning_profile. Use this to personalize responses.",
      "For Mermaid diagrams: output ONLY ```mermaid code fences with NO text before/after. The diagram MUST start with a type keyword on the first line inside the fence.",
      "=== COMPLETE MERMAID SYNTAX REFERENCE (read this before generating any diagram) ===",
      "DIAGRAM TYPES: graph TD (vertical flow) | graph LR (horizontal flow) | sequenceDiagram (step-by-step) | mindmap (concept hierarchies) | classDiagram (relationships) | stateDiagram (states/transitions) | erDiagram (entities) | gantt (timelines) | pie (proportions) | timeline (chronology) | gitgraph (version control)",
      "",
      "FLOWCHART SYNTAX: A[rect] | A(round) | A((circle)) | A{diamond} | A[(db)] | A[[sub]] | A>asym] | A{{hexagon}} | A-->B (arrow) | A---B (line) | A--text-->B (with label) | A-.->B (dotted) | A==>B (thick) | A-->|text|B (label alt) | subgraph Title ... end | style A fill:#f9f,stroke:#333",
      "",
      "SEQUENCE DIAGRAM SYNTAX: participant A | actor A | A->>B: msg (solid arrow) | A-->>B: msg (dotted) | A-xB: msg (cross) | activate A / deactivate A | Note right/left of A: text | Note over A,B: text | loop ... end | alt ... else ... end | opt ... end | par ... and ... end | break ... end | critical ... option ... end | rect rgb(r,g,b) ... end",
      "",
      "MINDMAP SYNTAX (INDENTATION-BASED):\nroot((Center))\n  Branch1\n    SubA\n    SubB\n  Branch2\nNode shapes: [Square] | (Rounded) | ((Circle)) for root | {Hexagon} | {Cloud}.\nUse tidy-tree layout for compact output:\n---\nconfig:\n  layout: tidy-tree\n---\nmindmap\n  root",
      "",
      "CLASS DIAGRAM SYNTAX: class ClassName { +attr | -method() void } | <|-- (inheritance) | *-- (composition) | o-- (aggregation) | --> (association) | ..> (dependency) | <<Interface>> <<Abstract>> | + public - private # protected",
      "",
      "STATE DIAGRAM SYNTAX: [*] --> State1 | State1 --> State2: transition | state CompositeState { ... } | state Choice <<choice>> | <<fork>> <<join>> | note right of State: text",
      "",
      "GIT GRAPH SYNTAX: commit | branch name | checkout name | merge name | commit id: \"x\" type: HIGHLIGHT tag: \"v1\"",
      "",
      "ER DIAGRAM SYNTAX: ENTITY ||--o{ OTHER : relates | || (exactly one) | |o (zero or one) | }o (zero or more) | }| (one or more)",
      "",
      "GANTT SYNTAX: gantt | dateFormat YYYY-MM-DD | section Name | Task :id, 2024-01-01, 30d | :done, :active, :crit",
      "",
      "PIE SYNTAX: pie | title Name | \"Label\" : value",
      "",
      "TIMELINE SYNTAX: timeline | title Name | section Era | Year : Event description",
      "",
      "CRITICAL RULES: (1) NEVER use lowercase 'end' as a node label — use 'End' or 'END'. (2) NEVER start a node ID with 'o' or 'x' followed by a dash — add a space before the letter. (3) Always close subgraphs/loops/blocks with 'end' on its own line. (4) Use %% for comments on their own line. (5) For special characters in labels, wrap in double quotes: A[\"text with (parens)\"]. (6) For multiline node text, use <br/>: A[\"Line1<br/>Line2\"].",
    ],
    interaction: {
      surface: options.surface,
      current_question: question,
      scope: { chapter: options.chapter || null, subject: options.subject || null },
    },
    memory: {
      session_summary: options.chatSummary || "",
    },
    reader_page_context: options.readerContext || null,
    student_state: buildStudentStateSnapshot(undefined, profile),
    retrievals,
    concept_relationships: relatedConcepts(vault, rankedRetrievals, options.chapter),
    expected_output_schema: {
      answer: "markdown tutor response",
      misconception_flags: "optional short list when a misconception appears",
      recovery_next_step: "optional one concrete next action",
    },
  };

  return JSON.stringify(payload);
}
