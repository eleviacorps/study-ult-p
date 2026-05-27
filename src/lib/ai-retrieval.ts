"use client";

import type { Flashcard, Note, Question, VaultContent } from "@/types";
import { loadStudyState } from "@/lib/study-state";

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

function buildStudentState() {
  const state = loadStudyState();
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
    exam_goals: [],
    preferred_difficulty: "adaptive",
    tutor_personality_prompt: "",
    generated_learning_profile: "",
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

export function buildStructuredTutorContext(
  vault: VaultContent | null,
  question: string,
  options: TutorContextOptions
): string {
  const rankedRetrievals = [
    ...retrieveReaderContext(question, options),
    ...retrieveNotes(vault, question, options),
    ...retrieveQuestions(vault, question, options),
    ...retrieveFlashcards(vault, question, options),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const retrievals = rankedRetrievals.map(({ score, ...chunk }) => chunk);

  const payload = {
    role: "StudyUlt adaptive tutor",
    rules: [
      "Use the structured payload, not hidden assumptions.",
      "Do not ask for or reveal model/provider/API configuration.",
      "Use retrieved chunks and concept relationships when relevant.",
      "If retrieval is thin, answer from general physics knowledge and say what would need verification.",
      "Keep responses concise, use markdown, and use LaTeX for formulas.",
      "Prefer hints first for problem solving unless the student asks for a full solution.",
    ],
    interaction: {
      surface: options.surface,
      current_question: question,
      scope: { chapter: options.chapter || null, subject: options.subject || null },
    },
    student_state: buildStudentState(),
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
