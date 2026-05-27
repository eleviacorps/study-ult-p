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

### 2026-05-27 - Step 2 - Phase 1 Current-State Audit

Intent: Compare the current implementation against the master architecture before changing code.

Findings:

- `supabase-schema.sql` has core user tables and RLS, but it does not yet include first-class cognitive state, chat sessions, summaries, vault documents/chunks/nodes/edges, embeddings, or ingestion logs.
- `user_notes` dedupes by `(user_id, path)` only. It does not store `content_hash`, so identical content can be repeatedly ingested under different paths.
- `src/app/api/notes/route.ts` upserts raw notes without hashing, canonical document identity, or payload validation beyond array shape.
- `src/app/api/chat/route.ts` stores messages directly in `chat_messages` but lacks `chat_sessions`, session type, scoped summaries, and memory records.
- `src/app/api/llm/route.ts` accepts provider, base URL, API key, and model from the request body. This violates the target model-configuration rule and should be replaced by server-side environment configuration.
- `src/app/note-agent/page.tsx` seeds the browser note agent with all vault notes, which violates the retrieval architecture. This needs a retrieval-scoped replacement.
- `src/lib/chat-store.ts` keeps a single local module session id and syncs all local messages repeatedly, creating duplicate chat rows and no session isolation.

Phase 1 implementation order:

1. Add schema foundations for content hashing, canonical vault documents/chunks/nodes/edges, ingestion logs, cognitive state tables, chat sessions, summaries, and scoped interaction memory.
2. Add server utilities for SHA-256 content hashing and canonical slug generation.
3. Update note ingestion to compute `content_hash`, dedupe idempotently, and return clear sync results.
4. Replace direct client-supplied AI provider configuration with server-side environment defaults.
5. Introduce chat sessions and scoped message persistence before changing the tutor UI.
6. Add retrieval payload builders that select relevant chunks/state instead of dumping the vault.

Validation:

- Audit only; no code behavior changed in this step.

Next steps:

- Implement Step 3: schema foundations and note ingestion hashing.

### 2026-05-27 - Step 3 - Schema Foundations And Note Hashing

Intent: Establish the first Phase 1 stability layer: content identity, idempotent note ingestion, cognitive-state tables, chat-memory tables, canonical vault tables, retrieval tables, and RLS coverage for the new tables.

Files changed:

- `supabase-schema.sql`
- `src/lib/content-identity.ts`
- `src/app/api/notes/route.ts`

Implementation:

- Added `content_hash` and `canonical_slug` to `user_notes`.
- Added a unique per-user note content hash index to prevent duplicate user note ingestion under different paths.
- Added `chat_sessions`, `chat_context_summaries`, and `interaction_memory` for scoped AI memory.
- Added student cognitive state foundations: `student_learning_state`, `student_mastery`, `student_misconceptions`, `student_focus_queue`, `student_recovery_tasks`, `student_ai_profiles`, and `student_goal_profiles`.
- Added canonical vault/retrieval foundations: `vault_documents`, `vault_chunks`, `vault_nodes`, `vault_edges`, `vault_ingestion_logs`, `content_embeddings`, `question_embeddings`, `concept_relationships`, and `semantic_clusters`.
- Enabled RLS and owner-only policies for all new user-scoped tables.
- Added `sha256Hex` and `canonicalSlug` utilities.
- Updated `/api/notes` to validate note payloads, compute SHA-256 hashes server-side, skip duplicate content under different paths, and persist canonical slugs.

Validation:

- Ran `npx tsc --noEmit` successfully.

Known follow-up:

- The Supabase SQL must be applied to the project database before the deployed `/api/notes` route can select `content_hash`.
- Next slice should replace raw `chat_messages` persistence with first-class `chat_sessions` and non-duplicating message sync.

### 2026-05-27 - Step 4 - Scoped Chat Sessions And Non-Duplicating Sync

Intent: Move tutor persistence toward the AI memory architecture by introducing first-class chat sessions and idempotent message sync while preserving the current tutor UI.

Files changed:

- `supabase-schema.sql`
- `src/app/api/chat/route.ts`
- `src/lib/chat-store.ts`
- `src/app/tutor/page.tsx`
- `src/components/ai-tutor-sidebar.tsx`

Implementation:

- Added `client_id` to `chat_messages` with a unique `(user_id, session_id, client_id)` index for idempotent sync.
- Updated `/api/chat` so `GET /api/chat?sessions=1` lists scoped sessions and `GET /api/chat?session_id=...` fetches session messages.
- Updated `/api/chat` `POST` to upsert `chat_sessions` before saving messages.
- Added validation for message role/content/session id and normalized allowed chat session types.
- Rebuilt `chat-store` around persisted per-surface session ids and synced message counts, so re-renders only sync newly appended messages.
- Tagged the main tutor as `physics_tutor` and the reader sidebar as chapter-scoped `concept_discussion`.
- Clearing sidebar chat now resets local messages and the local session id/sync marker.

Validation:

- Ran `npx tsc --noEmit` successfully.

Known follow-up:

- Add UI controls for New Chat, chat history, and session switching.
- Add automatic session summarization into `chat_context_summaries`.
- Apply the updated Supabase SQL before relying on `chat_sessions` or `client_id` in a deployed database.

### 2026-05-27 - Step 5 - Server-Side AI Model Boundary

Intent: Stop the backend AI proxy from trusting browser-supplied provider configuration, base URLs, API keys, or model names.

Files changed:

- `src/app/api/llm/route.ts`
- `src/app/api/llm/models/route.ts`

Implementation:

- Replaced provider-switching `/api/llm` logic with a server-configured OpenAI-compatible route.
- Defaulted the internal base URL to `https://opencode.ai/zen`.
- Defaulted the internal model to `deepseek-v4-flash-free`.
- Read optional overrides from server-only environment variables: `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, and `OPENCODE_API_KEY`.
- Preserved tool-calling message compatibility by forwarding assistant `tool_calls` and tool `tool_call_id` values.
- Replaced `/api/llm/models` with a server-only model list that exposes only the configured model.

Validation:

- Ran `npx tsc --noEmit` successfully.

Known follow-up:

- Remove provider/API/model controls from Settings and Tutor UI.
- Update browser AI context so it no longer stores provider config in localStorage.
- Update note-agent bootstrap so it does not depend on local `studyult-llm` settings.

### 2026-05-27 - Step 6 - Browser AI Config Dependency Removal

Intent: Stop core browser AI calls and the Note Agent bootstrap from depending on localStorage provider configuration.

Files changed:

- `src/lib/llm-context.tsx`
- `src/app/note-agent/page.tsx`

Implementation:

- Made the client LLM config server-configured by default and enabled without requiring local Settings state.
- Stopped persisting LLM provider/base URL/model/API key values to localStorage from the shared LLM context.
- Updated client AI calls to send only `messages` and token limits to `/api/llm`; provider, model, base URL, and API key request fields are no longer sent by this path.
- Updated Note Agent bootstrap to use a server-configured placeholder because `/api/llm` now owns the real model configuration server-side.

Validation:

- Ran `npx tsc --noEmit` successfully.

Known follow-up:

- Remove visible provider/API/model controls from Settings and Tutor quick settings.
- Remove old `studyult-llm` cleanup text from Settings danger-zone copy.
