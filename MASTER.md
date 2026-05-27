# StudyUlt Master Architecture

This file is the living architecture record and execution ledger for StudyUlt. Every meaningful architecture, schema, AI pipeline, security, retrieval, analytics, UI, or prompt change must be reflected here before or alongside implementation.

## Product North Star

StudyUlt is an AI-native adaptive learning operating system built around one source of truth: the vault.

The vault is the canonical corpus for notes, reader content, questions, flashcards, quizzes, formulas, concepts, graph relationships, analytics inputs, AI tutoring context, retrieval chunks, and adaptive learning state. No feature should become an isolated island. Every feature should reinforce the adaptive loop:

```text
Vault content
-> reader and notes
-> questions, quizzes, tests, flashcards
-> AI evaluation
-> weak areas and misconceptions
-> recovery tasks
-> persistent analytics
-> adaptive recommendations
-> targeted practice
-> improved mastery
```

## Non-Negotiable Architecture Principles

- Vault-first: all study content, graph nodes, retrieval chunks, and learning interactions must trace back to canonical vault documents or canonical concepts.
- Stateful AI: AI systems must receive compressed student state, relevant retrievals, scoped memories, and the current interaction only.
- No giant context dumps: do not send full vaults, unrelated chat history, full note dumps, or raw long histories to AI requests.
- Connected systems: questions, tutoring, analytics, recommendations, flashcards, graph intelligence, and recovery tasks must update or consume the same persistent learning state.
- Idempotent ingestion: repeated vault ingestion must not duplicate documents, chunks, nodes, embeddings, concepts, or graph edges.
- Secure by default: secrets stay server-side, retrieval is user-scoped, RLS is mandatory for user-owned data, and prompt injection must be treated as hostile input.
- Dashboard as visualization: analytics pages should display persisted metrics, not reconstruct learning state from scratch on every render.

## Target Cognitive State Object

The persistent student cognitive state layer should converge on this shape:

```ts
type StudentCognitiveState = {
  user_id: string;
  mastery_map: Record<string, unknown>;
  weak_topics: unknown[];
  confidence_levels: Record<string, number>;
  misconception_patterns: unknown[];
  recent_failures: unknown[];
  learning_velocity: unknown;
  focus_topics: unknown[];
  recovery_queue: unknown[];
  forgetting_curve_state: Record<string, unknown>;
  solved_question_embeddings: unknown[];
  concept_relationships: unknown[];
  exam_goals: unknown[];
  preferred_difficulty: string;
  tutor_personality_prompt: string;
  generated_learning_profile: string;
  adaptive_recommendations: unknown[];
  streak_data: unknown;
  study_patterns: unknown;
  performance_trends: unknown;
};
```

This object is not meant to be shipped as one giant JSON blob forever. It defines the product contract. Storage can be normalized across database tables as long as AI payload builders can reconstruct a compact version on demand.

## AI Memory And Chat Architecture

Required chat types:

- Physics tutor
- Revision planner
- Mock test review
- Concept discussion
- Problem solving
- Strategy coaching

Required behavior:

- New Chat creates an isolated session.
- Chat history is session-scoped.
- Session switching never leaks unrelated subject or user context.
- Long conversations are summarized into `chat_context_summaries`.
- Retrieval is scoped by user, subject, chapter, chat type, and current task.
- AI payloads use compressed state, retrieval snippets, graph neighbors, relevant misconception patterns, and the current turn.

Target AI payload shape:

```json
{
  "student_state": {},
  "retrievals": [],
  "question": {},
  "evaluation_rules": [],
  "expected_output_schema": {}
}
```

## Required Database Domains

The Supabase schema should be audited and evolved toward these domains:

```sql
student_mastery
student_misconceptions
student_learning_state
student_focus_queue
student_recovery_tasks
student_ai_profiles
student_goal_profiles

chat_sessions
chat_messages
chat_context_summaries
interaction_memory

content_embeddings
question_embeddings
concept_relationships
semantic_clusters

daily_learning_metrics
attempt_analytics
study_sessions
topic_velocity
performance_trends
attention_patterns

vault_documents
vault_chunks
vault_nodes
vault_edges
vault_ingestion_logs
```

## Duplication Prevention Contract

Every canonical vault document must have:

```ts
content_hash = sha256(markdown_content)
```

Database ingestion should enforce:

```sql
UNIQUE(content_hash)
```

The ingestion pipeline must also use stable canonical concept slugs, such as `electric-field`, `gauss-law`, and `electric-potential`, instead of accepting arbitrary AI-generated duplicate concepts.

## Retrieval Architecture

AI features must retrieve narrowly instead of dumping broadly:

- relevant vault chunks
- nearby graph concepts
- similar previous mistakes
- same-difficulty questions
- related misconceptions
- semantic neighbors
- prerequisite and dependent concepts

Retrieval should combine embeddings, graph traversal, top-k ranking, user scoping, and subject/chapter filters.

## AI Evaluation Engine

The evaluation system is a core moat. It must detect misconceptions, analyze reasoning, update mastery, update weak areas, generate recovery plans, create adaptive tasks, and persist analytics.

Evaluation results should become structured records that feed:

- `student_mastery`
- `student_misconceptions`
- `student_recovery_tasks`
- `attempt_analytics`
- `daily_learning_metrics`
- `adaptive_recommendations`

## Model Configuration And Security

Do not expose provider selection, model names, base URLs, or API settings in the UI.

Internal target configuration:

- Base URL: `https://opencode.ai/zen`
- Model: `deepseek-v4-flash-free`
- Storage: environment variables only

Secrets must never be available in client bundles or localStorage.

## Security Requirements

- RLS on all user-owned and retrieval tables.
- Server-side validation for edge/API inputs.
- User-scoped vault, embedding, graph, and memory retrieval.
- Prompt injection defense around vault content and retrieved memories.
- Rate limiting for AI and ingestion endpoints.
- Schema validation for structured AI outputs.
- No cross-user retrieval leakage.
- No unauthorized graph or embedding access.

## Onboarding Requirements

After signup, the user must provide name and username, then complete a survey covering target exams, boards, grade, country, subjects, study style, goals, strengths, weaknesses, preferred difficulty, and learning pace.

AI processes the survey into:

- generated learning profile
- adaptive strategy
- personalized tutor system prompt

That profile feeds future tutoring sessions through the compressed cognitive state, not through repeated raw survey dumps.

## UI/UX Direction

Target feel: modern, minimal, elegant, premium, fast, responsive.

References: Linear, Vercel, Raycast, Perplexity.

Use restrained depth, clear typography, subtle motion, readable contrast, and careful glassmorphism. Readability wins over decoration.

## Development Phases

### Phase 1 - Stability

- Fix vault duplication.
- Normalize schema.
- Audit security and RLS.
- Add retrieval optimization.
- Add cognitive state architecture.
- Add chat sessions and scoped memory.

### Phase 2 - AI Quality

- Improve misconception detection.
- Add compressed memory.
- Add adaptive recommendations.
- Add retrieval ranking.
- Add evaluation schemas.

### Phase 3 - Experience

- Redesign key UI surfaces.
- Add onboarding.
- Add motion system.
- Add personalization.
- Modernize interactions.

### Phase 4 - Advanced

- Add spaced repetition engine.
- Add predictive weak areas.
- Improve graph intelligence.
- Add learning forecasting.
- Explore multi-agent orchestration.

## Engineering Workflow

- Keep changes small and verifiable.
- Document each meaningful step in this file.
- Commit after each coherent small change when the working tree is clean enough to do so safely.
- Do not mix unrelated changes in one commit.
- Do not revert user changes without explicit instruction.
- Run validation appropriate to the touched layer.

## Execution Ledger

### 2026-05-27 - Step 1 - Master Architecture Baseline

Intent: Capture the StudyUlt master system architecture, AI state requirements, database direction, retrieval principles, security requirements, UI direction, and phased roadmap in a persistent project document.

Files changed:

- `MASTER.md`

Validation:

- Documentation-only change.
- No application code changed in this step.

Next steps:

- Audit current schema and AI flows against this architecture.
- Create a prioritized implementation plan for Phase 1.
- Implement Phase 1 in small commits with this ledger updated each time.
