export interface ChapterMeta {
  name: string;
  path: string;
  subject: string;
  topics: string[];
  totalTopics: number;
  weightage: {
    jeeMain?: string;
    jeeAdvanced?: string;
    boards?: string;
  };
  priority: "Very High" | "High" | "Moderate";
}

export interface Note {
  id: string;
  title: string;
  path: string;
  chapter: string;
  subject: string;
  tags: string[];
  content: string;
  links: WikiLink[];
  backlinks: string[];
}

export interface WikiLink {
  target: string;
  display?: string;
  raw: string;
}

export interface Question {
  id: string;
  title: string;
  chapter: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  marks: number;
  given?: string;
  find?: string;
  options?: { label: string; text: string }[];
  solution: string;
  answer: string;
  explanation?: string;
  tags: string[];
  type: "solved" | "mcq";
}

export interface Flashcard {
  id: string;
  chapter: string;
  subject: string;
  topic: string;
  subtopic?: string;
  type: string;
  question: string;
  answer: string;
  formula?: string;
  variableMeanings?: { symbol: string; meaning: string }[];
  memoryTrick?: string;
  tags: string[];
}

export interface QuizQuestion {
  id: string;
  chapter: string;
  question: string;
  options: { label: string; text: string; correct: boolean }[];
  explanation?: string;
}

export interface ConceptConnection {
  chapter: string;
  chain: string[];
  relationships: {
    from: string;
    to: string;
    description: string;
  }[];
}

export interface GraphNode {
  id: string;
  label: string;
  group: string;
  type: "chapter" | "topic" | "note" | "concept";
  path?: string;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
  type: "wiki-link" | "prerequisite" | "related";
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface VaultContent {
  chapters: ChapterMeta[];
  notes: Note[];
  questions: Question[];
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  conceptConnections: ConceptConnection[];
  graphData: GraphData;
}

export interface StudyProgress {
  chapterId: string;
  chapterName: string;
  completedTopics: number;
  totalTopics: number;
  questionsAttempted: number;
  questionsCorrect: number;
  flashcardsReviewed: number;
  flashcardsMastered: number;
}

export interface StudySession {
  date: string;
  minutes: number;
  chapter?: string;
}

export interface DashboardData {
  streak: number;
  totalStudyHours: number;
  todayMinutes: number;
  weeklyMinutes: number[];
  weakAreas: { topic: string; accuracy: number; chapter: string }[];
  overallAccuracy: number;
  pendingFlashcards: number;
  lastMockScore?: number;
  chapterProgress: Map<string, StudyProgress>;
  recentActivity: { action: string; time: string; chapter: string }[];
  studySessions: StudySession[];
}
