# StudyUlt2 — Full Project Analysis Report

> **Generated**: June 2026
> **Project**: StudyUlt2 — AI-Native Adaptive Learning Operating System

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Pages & Routes Map](#4-pages--routes-map)
5. [API Layer](#5-api-layer)
6. [Database Schema](#6-database-schema)
7. [AI Systems Architecture](#7-ai-systems-architecture)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Mobile Architecture](#9-mobile-architecture)
10. [State Management & Sync](#10-state-management--sync)
11. [Feature Inventory](#11-feature-inventory)
12. [Security Audit](#12-security-audit)
13. [Performance Considerations](#13-performance-considerations)
14. [Known Issues & Technical Debt](#14-known-issues--technical-debt)
15. [Development Roadmap Alignment](#15-development-roadmap-alignment)

---

## 1. Executive Summary

StudyUlt2 is a **Next.js 16** application that functions as an AI-native adaptive learning platform. It combines:

- **A personal knowledge vault** (Obsidian-style markdown notes with wikilinks and backlinks)
- **An AI note agent** that generates complete study materials (notes, questions, MCQs, flashcards, quizzes, revision sheets)
- **An AI tutor** with persistent chat sessions and contextual memory
- **A spaced repetition engine** for flashcards (SM-2 algorithm)
- **A full analytics suite** tracking mastery, weak areas, streaks, and performance trends
- **Real-time cross-device sync** via Supabase
- **Android native app** via Capacitor

The architecture follows a **vault-first** principle: all study content, graph nodes, retrieval chunks, and learning interactions trace back to canonical vault documents.

---

## 2. Tech Stack & Dependencies

### Production Dependencies

| Category | Package | Version | Purpose |
|----------|---------|---------|---------|
| **Framework** | `next` | 16.2.6 | React framework with App Router, Edge Runtime |
| **React** | `react` / `react-dom` | 19.2.4 | UI library |
| **Database** | `@supabase/supabase-js` / `@supabase/ssr` | 2.106+ | PostgreSQL + Auth + Realtime |
| **Styling** | `tailwindcss` / `tailwind-merge` / `clsx` | v4 | Utility-first CSS |
| **Animation** | `framer-motion` | 12.40 | Page/component transitions |
| **Math Rendering** | `katex` / `remark-math` / `rehype-katex` | 0.16+ | LaTeX rendering |
| **Markdown** | `react-markdown` / `remark-gfm` / `rehype-raw` | 10.1 | Markdown-to-React |
| **Charts** | `recharts` | 3.8 | Analytics graphs |
| **Graph** | `d3-force` / `d3-selection` / `d3-zoom` | 3.0 | Knowledge graph visualization |
| **State** | `zustand` | 5.0 | Lightweight state stores |
| **Dates** | `date-fns` | 4.2 | Date formatting |
| **Icons** | `lucide-react` | 1.16 | UI icons |
| **Math Functions** | `function-plot` | 1.25 | Interactive function plotting |
| **Mobile** | `@capacitor/core` / `@capacitor/app` | 8.x | Android WebView shell |
| **Native Auth** | `@capawesome/capacitor-google-sign-in` | 0.1 | Android native Google Sign-In |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `@capacitor/cli` / `@capacitor/android` | Native app building |
| `typescript` ^5 | Type checking |
| `eslint` ^9 + `eslint-config-next` | Linting |
| `tailwindcss` v4 | CSS framework |
| `@types/d3-*` / `@types/react*` / `@types/node` | Type definitions |

### Key Architecture Decisions

- **Edge Runtime** for all API routes — low-latency serverless
- **Server-configured AI** — model, base URL, and API key never reach the browser
- **Hybrid state**: localStorage (fast cache) + Supabase (authoritative store)
- **SharedWorker** for persistent AI Note Agent (falls back to DedicatedWorker)
- **RLS everywhere** — all user-owned tables have Row-Level Security
- **Content identity via SHA-256** — deduplication by content hash

---

## 3. Project Structure

```
studyult2/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # 25+ API route groups
│   │   │   ├── llm/                  # AI model proxy
│   │   │   ├── chat/                 # AI Tutor sessions + summaries
│   │   │   ├── notes/                # Vault note CRUD
│   │   │   ├── sync/                 # Cross-device state sync
│   │   │   ├── evaluation/           # Attempt recording + analytics
│   │   │   ├── diagram/ + kroki/     # Mermaid/Kroki SVG rendering
│   │   │   ├── web-search/           # Multi-backend web search proxy
│   │   │   ├── neet-bank/            # NEET question bank API
│   │   │   ├── jee-bank/             # JEE Main question bank API
│   │   │   ├── vault-bank/           # Vault sharing (admin → aclose)
│   │   │   ├── md-bank/              # Admin .md file uploads
│   │   │   ├── profile/              # User profile CRUD
│   │   │   ├── onboarding/           # Post-signup survey + AI profile
│   │   │   ├── retrieval/            # Server-side vault retrieval
│   │   │   ├── embeddings/           # Text embedding API
│   │   │   └── roc2/                 # Backup/alert/migrate utilities
│   │   ├── tutor/                    # AI Tutor page
│   │   ├── reader/[chapter]/         # Vault reader with notes
│   │   ├── questions/[chapter]/      # Practice questions
│   │   ├── quizzes/                  # Timed quizzes
│   │   ├── tests/[chapter]/          # Mock tests
│   │   ├── flashcards/[chapter]/     # Spaced repetition flashcards
│   │   ├── dashboard/                # Main analytics dashboard
│   │   ├── analytics/                # Deep analytics page
│   │   ├── graph/                    # Knowledge graph visualization
│   │   ├── note-agent/               # AI Note Generator
│   │   ├── notes-bank/               # Shared vaults (Vault Bank)
│   │   ├── login/                    # Authentication
│   │   ├── onboarding/               # Post-signup flow
│   │   ├── settings/                 # Profile + preferences
│   │   └── layout.tsx                # Root layout with providers
│   ├── components/
│   │   ├── layout/                   # Sidebar, bottom nav, auth gate
│   │   ├── dashboard/                # Dashboard widgets
│   │   ├── reader/                   # Markdown renderer, note client
│   │   ├── ai-tutor-sidebar.tsx      # Reader-context AI tutor
│   │   └── ...
│   ├── lib/
│   │   ├── note-agent/               # AI Note Agent (worker, bridge, RAG)
│   │   ├── supabase/                 # Server + client, migrations
│   │   ├── ai-*.ts                   # AI retrieval, cache, config
│   │   ├── chat-store.ts             # Tutor chat persistence
│   │   ├── study-state.ts            # Study analytics state machine
│   │   ├── spaced-repetition.ts      # SM-2 algorithm
│   │   ├── vault-parser.ts           # Markdown → structured data
│   │   ├── exam-presets.ts           # JEE/NEET/CBSE/SAT/AP/IB/GCSE/A-Level
│   │   └── ...
│   ├── stores/                       # Zustand stores (theme, vault)
│   ├── hooks/                        # Custom React hooks
│   └── types/                        # TypeScript interfaces
├── public/
│   ├── skills/                       # AI skill definitions
│   │   ├── study-ult/skill.md        # Main study generation skill
│   │   └── mermaid/skill.md          # Mermaid diagram syntax skill
│   ├── chapter-params.json           # Static vault manifest
│   ├── reader-params.json            # Reader route params
│   ├── vault-data.json               # Default vault content
│   └── sw.js                         # Service worker
├── scripts/                          # Build-time generators
├── physics-ch1/                      # Obsidian vault (source)
├── manim-scenes/                     # 3Blue1Brown-style animations
├── supabase-schema.sql               # Full database schema
└── components.json                   # shadcn/ui (CVA-based)
```

---

## 4. Pages & Routes Map

### Public Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `page.tsx` | Landing/home page |
| `/login` | `login/page.tsx` | Sign-in with Google OAuth |
| `/auth/callback` | `callback/route.ts` | OAuth redirect handler |

### Authenticated Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/onboarding` | `onboarding/page.tsx` | Post-signup survey (name, exams, subjects, goals) |
| `/dashboard` | `dashboard/page.tsx` | Analytics overview: streak, weak areas, todos, activity |
| `/tutor` | `tutor/page.tsx` | Full AI Tutor with chat history, sessions, session summaries |
| `/reader/[chapter]/[note]` | `reader-note-client.tsx` | Markdown note reader with wikilinks, backlinks, sidebar tutor |
| `/questions/[chapter]` | `questions-client.tsx` | MCQ/solved question practice with evaluation |
| `/quizzes` | `quizzes/page.tsx` | Timed mixed subject quizzes with scoring |
| `/tests/[chapter]` | `tests-client.tsx` | Full mock tests with grading |
| `/flashcards/[chapter]` | `flashcards-client.tsx` | SM-2 spaced repetition flashcards |
| `/analytics` | `analytics/page.tsx` | Deep analytics: trends, topic accuracy, charts |
| `/graph` | `graph/page.tsx` | Interactive D3 force-directed knowledge graph |
| `/note-agent` | `note-agent/page.tsx` | AI note generator with .md bank + vault bank tabs |
| `/notes-bank` | Notes bank page | Shared vault repository (aclose role) |
| `/settings` | `settings/page.tsx` | Profile, theme, vault roots, data management |
| `/roc2` | `roc2/page.tsx` | Admin utility page (backup, alerts, migration) |

### Loading States

Every page implements loading skeletons matching its content structure for perceived performance on mobile.

---

## 5. API Layer

### Route Overview

All API routes run on **Edge Runtime** for low latency.

| API Route | Methods | Auth Required | Purpose |
|-----------|---------|---------------|---------|
| `/api/llm` | POST | Yes | Server-configured AI model proxy |
| `/api/llm/models` | GET | No | Returns `{ enabled: true }` (hides model name) |
| `/api/llm/config` | GET | Yes | Returns server AI config (no secrets) |
| `/api/chat` | GET, POST | Yes | Chat messages + session CRUD |
| `/api/chat/summary` | POST | Yes | AI-powered session summarization |
| `/api/notes` | GET, POST, DELETE | Yes | Vault note CRUD with content hashing |
| `/api/sync` | GET, POST | Yes | Full state sync (study, cognitive, profile) |
| `/api/sync/route` | - | Yes | Cross-device state hydration |
| `/api/profile` | GET, PUT | Yes | User profile read/update |
| `/api/onboarding` | POST | Yes | Save survey + generate AI learning profile |
| `/api/onboarding/check-username` | GET | Yes | Username availability |
| `/api/evaluation` | POST | Yes | Record attempts, update mastery, misconceptions |
| `/api/retrieval` | GET | Yes | Server-side vault chunk retrieval |
| `/api/embeddings` | POST | Yes | Text embedding generation |
| `/api/diagram` | POST | Yes | Mermaid → SVG via Kroki proxy |
| `/api/kroki` | POST | Yes | Legacy diagram rendering |
| `/api/web-search` | POST | Yes | Multi-backend web search for note agent |
| `/api/md-bank` | GET, POST, DELETE | Admin | Admin markdown file management |
| `/api/neet-bank` | GET | Yes | NEET question bank (vector search) |
| `/api/jee-bank` | GET | Yes | JEE Main question bank (vector search) |
| `/api/vault-bank` | GET, POST | Admin/AClose | Publish/save chapter vaults |
| `/api/vault-bank/save` | GET, POST | AClose | Copy published vault to personal vault |
| `/api/roc2` | GET | Admin | ROC2 data access |
| `/api/roc2/alert` | POST, GET | Admin | Alert management |
| `/api/roc2/backup` | POST, GET | Admin | Backup management |
| `/api/roc2/migrate` | POST, GET | Admin | Data migration |

### Key API Design Patterns

- **All API routes** validate Supabase authentication at the start
- **Request logging** via `logRequest()` helper
- **Content identity** via SHA-256 hashing (`content-identity.ts`)
- **Canonical slugs** for deduplication (`canonicalSlug()`)
- **Payload limits** enforced server-side (e.g., `/api/llm` caps messages at 50, 32K per message)
- **Idempotent upserts** using `(user_id, path)` and `(user_id, content_hash)` unique constraints

---

## 6. Database Schema

The Supabase PostgreSQL schema has **~45 tables** organized into logical domains.

### Core User Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile (name, username, role, avatar, social links, onboarding) |
| `user_points` | Gamification points |
| `user_notes` | Private vault notes (chapter, path, content, hash, author) |
| `study_streaks` | Current/longest streak tracking |

### Study State Tables

| Table | Purpose |
|-------|---------|
| `study_sessions` | Daily study minutes |
| `quiz_scores` | Quiz results (score, total, net score) |
| `test_scores` | Mock test results per chapter |
| `study_state_snapshots` | Full state JSON blob for cross-device sync |
| `activity_snapshots` | Activity timeline entries |
| `topic_accuracy` | Per-topic accuracy tracking |

### AI Memory & Chat Tables

| Table | Purpose |
|-------|---------|
| `chat_sessions` | Scoped AI tutor conversation roots |
| `chat_messages` | Individual chat messages per session |
| `chat_context_summaries` | Compressed session summaries |
| `interaction_memory` | Retrievable scoped memories |

### Student Cognitive State Tables

| Table | Purpose |
|-------|---------|
| `student_learning_state` | Full cognitive state (mastery, weaknesses, velocity) |
| `student_mastery` | Per-concept mastery scores (0-100) |
| `student_misconceptions` | Detected misconception patterns |
| `student_focus_queue` | Prioritized concept recovery queue |
| `student_recovery_tasks` | AI-generated recovery tasks |
| `student_ai_profiles` | Tutor personality + learning profile |
| `student_goal_profiles` | Exam goals + difficulty preferences |

### Vault & Retrieval Tables

| Table | Purpose |
|-------|---------|
| `vault_documents` | Canonical document store (dedup via content_hash) |
| `vault_chunks` | Document chunks for retrieval |
| `vault_nodes` | Graph nodes from vault content |
| `vault_edges` | Graph edges between nodes |
| `vault_ingestion_logs` | Ingestion audit trail |
| `content_embeddings` | Embedded chunk vectors |
| `question_embeddings` | Embedded question vectors |
| `concept_relationships` | Cross-concept relationships |
| `semantic_clusters` | Grouped concept clusters |

### Analytics Tables

| Table | Purpose |
|-------|---------|
| `daily_learning_metrics` | Daily aggregates (attempts, correct, minutes, points) |
| `attempt_analytics` | Per-attempt records with misconceptions |
| `topic_velocity` | Topic learning velocity tracking |
| `performance_trends` | Time-series performance data |
| `attention_patterns` | Attention/context switch tracking |
| `chapter_progress` | Per-chapter completion metrics |
| `weak_areas` | Identified weak topics |
| `student_mastery` | Concept mastery levels |

### Question Bank Tables

| Table | Purpose |
|-------|---------|
| `md_bank` | Admin-uploaded .md reference files |
| `neet_bank` | NEET question bank with vector search |
| `jee_main_bank` | JEE Main question bank with vector search |

### Security Features

- **RLS (Row-Level Security)** on every table
- **Role-based access**: `user` (default), `admin`, `aclose` (restricted shared access)
- **md_bank**: all authenticated can read, only admin can write
- **user_notes**: `"Own or shared via vault bank"` policy — own rows OR shared_to_aclose rows
- **Public read** on leaderboard-related data (profiles, user_points)
- **Vault Bank** extension modifies user_notes RLS to allow aclose users to SELECT shared rows

---

## 7. AI Systems Architecture

### 7.1 AI Model Proxy (`/api/llm`)

```
Client (messages + options)
  → /api/llm (Edge Runtime)
    → Auth check (Supabase session)
    → Rate limit / payload validation
    → OpenAI-compatible API call (server-configured)
      → Base URL: https://opencode.ai/zen (default)
      → Model: deepseek-v4-flash-free (default)
      → API Key: OPENCODE_API_KEY env var
    → Streaming response (SSE)
      → parseStreamingResponse() handles deltas, tool_calls, finish_reason
    → Session response caching (SHA-256 digest key)
  → Client receives streamed tokens + tool calls
```

**Key design decisions:**
- Model, base URL, and API key are **never exposed to the browser**
- Default 8K max_tokens, configurable via `AI_MODEL` env var
- Client-side 4K output token request cap, 8K server cap
- Response caching via SHA-256 digest of full message payload
- No provider switching in the browser — all server-configured

### 7.2 AI Tutor

The Tutor has **two surfaces**:
1. **Full Tutor page** (`/tutor`) — dedicated chat interface with session history
2. **Reader sidebar** (`ai-tutor-sidebar.tsx`) — contextual tutor for current note

**Architecture:**
- Chat sessions with scoped memory and types (physics_tutor, concept_discussion, etc.)
- Session summaries compressed via AI (`chat_context_summaries`)
- Structured tutor payloads: student state + retrievals + scoped memories
- Quick actions: "Explain this concept", "Visualize as mind map", "Make a problem", "Evaluate my answer"
- Asynchronous chat sync (debounced, batched, idempotent)
- New Chat / Chat History controls with local fallback

### 7.3 AI Note Agent

The Note Agent is a **SharedWorker** that persists across page navigations:

```
note-agent/page.tsx
  → agent-engine.ts (controls worker lifecycle)
    → agent-worker.ts (SharedWorker)
      → /api/llm (streaming)
      → TOOLS: write_file, read_file, list_workspace, search_web, assess_quality, list_neet_chapters, neet_bank_search, list_jee_main_chapters, jee_main_bank_search
      → RAG store (IndexedDB, 3-tier embedding: provider → local → TF-IDF)
      → Compaction at 1M tokens (LLM-powered, preserves tail 1 turn)
```

**Skill system:** The agent loads skills from `public/skills/`:
- `study-ult/skill.md` — Complete study material generation (43KB)
- `mermaid/skill.md` — Mermaid syntax reference for diagrams

**Note Agent capabilities:**
- Writes complete chapter vaults (core.md, notes, questions, MCQs, flashcards, quizzes, revision)
- Searches real NEET/JEE question banks and adapts to real exam patterns
- Generates multi-topic / multi-formula questions (15-20% of question sets)
- Assessments at end of writing phase (write-then-assess pipeline)
- Web search for topic research (with empty-result guard)
- Content compaction at 1M tokens to prevent context overflow

### 7.4 AI Evaluation Engine

```
User submits answer
  → /api/evaluation
    → Record attempt (attempt_analytics)
    → Update concept mastery (student_mastery)
    → Update misconceptions on wrong answers (student_misconceptions)
    → Create recovery tasks for weak areas (student_recovery_tasks)
    → Update daily metrics (daily_learning_metrics)
    → Update topic velocity (topic_velocity)
    → Append performance trend points (performance_trends)
  → UI shows feedback + updated weak areas
```

### 7.5 Mermaid Diagram Pipeline

```
Tutor generates Mermaid diagram
  → markdown-renderer.tsx detects Mermaid block
    → findMermaidBlock() extracts diagram source
  → mermaid-diagram.tsx
    → Validates diagram type (flowchart, mindmap, sequenceDiagram, etc.)
    → POST /api/diagram
      → Server requests https://kroki.io/mermaid/svg
      → SVG sanitized (scripts, event handlers, javascript: hrefs removed)
    → Renders SVG or shows error fallback
```

**Supported diagram types:** flowchart, mindmap, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, timeline, gitgraph, quadrantChart, xyChart, journey

### 7.6 RAG (Retrieval Augmented Generation)

Local IndexedDB-based RAG with 3-tier embedding fallback:

1. **Provider** (primary) — `/api/embeddings` route
2. **Local** (fallback 1) — `@xenova/transformers` in Web Worker (all-MiniLM-L6-v2)
3. **TF-IDF** (fallback 2) — Term frequency × IDF (sparse)

**Chunking:** Paragraph-aware sliding window, 512 tokens per chunk, 50 token overlap.

---

## 8. Authentication & Authorization

### Auth Flow

```
User visits login page
  → Google OAuth via Supabase
  → Redirect to /auth/callback
  → Supabase session stored
  → Check profiles.onboarding_completed
    → If false → redirect to /onboarding
    → If true → redirect to /dashboard
```

### Auth Gate (`auth-gate.tsx`)

- Wraps all authenticated pages
- Handles Capacitor native auth (Android) and web OAuth
- Google Sign-In via `@capawesome/capacitor-google-sign-in` on native
- Session refresh on focus/visibility change
- Routes to onboarding if profile incomplete

### Role System

| Role | Capabilities |
|------|-------------|
| `user` | Default role. Own vault, tutor, practice, flashcards, quizzes, tests |
| `admin` | Full access. Upload md_bank, publish vaults, manage all system content |
| `aclose` | Restricted. Browse/publish Vault Bank, save shared vaults to own vault |

### RLS Strategy

- **All user-owned tables**: `auth.uid() = user_id`
- **md_bank**: All authenticated SELECT, admin-only INSERT/UPDATE/DELETE
- **user_notes**: Extended policy — own rows OR shared_to_aclose=true (for Vault Bank)
- **Public**: Leaderboard profiles and points readable by anyone
- **admin_user view**: Exposes admin user_id for Vault Bank queries

---

## 9. Mobile Architecture

### Capacitor Integration

StudyUlt2 runs as an **Android WebView app** via Capacitor:

- `capacitor.config.ts` — App configuration
- `@capacitor/core` — Native runtime bridge
- `@capacitor/app` — App lifecycle (pause, resume, back button, deep links)
- `@capawesome/capacitor-google-sign-in` — Native Google Sign-In (uses Android Credential Manager)
- `@capacitor/android` — Android platform build

### Mobile UX Patterns

| Pattern | Implementation |
|---------|---------------|
| **Bottom navigation** | 5-tab glass bar (Home, Reader, Practice, Tutor, Settings) |
| **Reader tutor** | Full-width drawer on mobile, side panel on desktop |
| **Tutor page** | `100dvh` height, scrollable messages, pinned input |
| **Graph** | Bottom sheet for details (mobile), side panel (desktop) |
| **Safe areas** | env(safe-area-inset-*) throughout |
| **Touch targets** | Minimum 44px tap targets, disabled tap-highlight |
| **Markdown tables** | Horizontal scroll, responsive cell padding |
| **Loading skeletons** | All pages have mobile-optimized skeleton states |

### Service Worker

- `public/sw.js` — Cache-first strategy for vault data and static assets
- IndexedDB cache for vault data with stale-while-revalidate pattern

---

## 10. State Management & Sync

### Three-Layer State Architecture

```
Layer 1: React State (useState/useReducer)
  → UI-specific state (active tab, modal open, form input)
  
Layer 2: Zustand Stores
  → theme-store.ts — Theme (dark/light)
  → vault-store.ts — Vault notes, chapters, graph data (IndexedDB-backed)
  
Layer 3: study-state.ts (localStorage + Supabase sync)
  → Streaks, study minutes, points, achievements
  → Question attempts, topic accuracy, weak/strong areas
  → AI todos, user todos, activity log
  → Quiz scores, test scores
  → AI conversations (local only)
  → Cross-device sync via study_state_snapshots
```

### Sync Architecture

```
study-state.ts (client)
  → Loads from localStorage (instant)
  → Schedules sync: 1.5s after page load, then every 30s
  → On tab close: sendBeacon to /api/sync
  → On profile load: pullRemoteState merges DB → local

/api/sync
  → POST: upserts study state fields, cognitive state
  → GET: returns persisted state for device hydration
```

### Content Identity & Deduplication

- `sha256Hex()` — SHA-256 of content string
- `canonicalSlug()` — Normalized slug from content/title
- `(user_id, content_hash)` — Unique index prevents duplicate note ingestion
- `(user_id, path)` — Unique constraint prevents path collisions
- Vault documents/chunks use same content hash dedup pattern

---

## 11. Feature Inventory

### 📖 Content & Vault

| Feature | Status | Details |
|---------|--------|---------|
| Obsidian vault import | ✅ | Physics ch1 vault, wikilinks, backlinks |
| Markdown rendering | ✅ | react-markdown + KaTeX + Mermaid + tables |
| Vault bank (shared chapters) | ✅ | Admin publishes, aclose saves |
| .md bank (admin uploads) | ✅ | Reference materials for note agent |
| Custom vault roots | ✅ | Settings-configurable vault sources |
| Static vault manifests | ✅ | Build-time generation for fast loads |

### 🤖 AI Features

| Feature | Status | Details |
|---------|--------|---------|
| AI Tutor (page) | ✅ | Full chat with sessions, history, summaries |
| AI Tutor (sidebar) | ✅ | Reader context, chapter-scoped |
| Note Agent | ✅ | Generates complete chapter materials |
| Spaced Repetition (SM-2) | ✅ | Flashcard scheduling algorithm |
| RAG (Retrieval) | ✅ | 3-tier embedding, IndexedDB store |
| Web search integration | ✅ | 4-backend chain (DDG → Wikipedia → raw) |
| Mermaid diagram rendering | ✅ | 14 diagram types via Kroki |
| AI evaluation engine | ✅ | Misconception detection, mastery updates |
| NEET question bank search | ✅ | Vector similarity search |
| JEE Main question bank search | ✅ | Vector similarity search |
| Session summarization | ✅ | AI-compressed chat summaries |
| Cross-device cognitive state | ✅ | Sync mastery, weak areas, velocity |

### 📝 Study Tools

| Feature | Status | Details |
|---------|--------|---------|
| Flashcards with SM-2 | ✅ | Due/new/learning/mastered tracking |
| MCQ practice | ✅ | Assertion-reason, matching, comprehension |
| Timed quizzes | ✅ | Mixed subjects, scoring |
| Mock tests | ✅ | Chapter-level full tests |
| Knowledge graph | ✅ | D3 force-directed, wikilinks, backlinks |
| Solved questions | ✅ | Given/Find/Solution format |
| Gamification | ✅ | Points, streaks, achievements, activity log |

### 📊 Analytics & Insights

| Feature | Status | Details |
|---------|--------|---------|
| Dashboard | ✅ | Streak, weak areas, activity, performance |
| Deep analytics | ✅ | Trends, topic accuracy, velocity, attention |
| AI-generated todos | ✅ | From weak area detection |
| Mastery tracking | ✅ | Per-concept mastery scores |
| Misconception detection | ✅ | Pattern-based misconception recording |
| Learning velocity | ✅ | Topic velocity tracking |
| Recovery tasks | ✅ | AI-generated study plans |

### 👤 User Management

| Feature | Status | Details |
|---------|--------|---------|
| Google OAuth | ✅ | Web + Android native |
| Onboarding survey | ✅ | Exam goals, subjects, difficulty, learning style |
| AI learning profile | ✅ | Generated from survey responses |
| Profile settings | ✅ | Name, username, avatar, social links |
| Role-based access | ✅ | user / admin / aclose |
| Cross-device sync | ✅ | Study state + cognitive state |

### 📱 Mobile

| Feature | Status | Details |
|---------|--------|---------|
| Android WebView app | ✅ | Capacitor build |
| Bottom navigation | ✅ | 5-tab glass bar |
| Native Google Sign-In | ✅ | Android Credential Manager |
| Safe area support | ✅ | Notch, bottom nav, keyboard |
| Loading skeletons | ✅ | All major pages |
| Responsive layouts | ✅ | All pages adapt to mobile |
| Touch optimization | ✅ | 44px targets, disabled highlight |

---

## 12. Security Audit

### Current Protections

| Concern | Status | Implementation |
|---------|--------|----------------|
| RLS on all tables | ✅ | Every table enabled + policy |
| AI config server-only | ✅ | Model/API key never in browser |
| SVG sanitization | ✅ | Script/event/javascript href removal |
| Diagram timeout | ✅ | 10s network timeout for Kroki |
| Payload size limits | ✅ | Server-side message caps |
| Auth on all API routes | ✅ | Supabase session verification |
| Content deduplication | ✅ | SHA-256 hash prevents duplicates |
| Rate limiting (planned) | ⚠️ | Not yet durable; in-memory cache |
| Prompt injection defense | ⚠️ | Basic but no formal eval suite |
| Cross-user retrieval | ✅ | RLS + user-scoped queries |

### Recommended Improvements

1. **Durable rate limiting** — Replace in-memory cache with KV store for `/api/llm`, `/api/chat/summary`, `/api/diagram`
2. **Prompt injection eval** — Create test suite for prompt injection resistance
3. **SVG sanitizer** — Replace regex with strict XML sanitizer library (e.g., DOMPurify)
4. **API key rotation** — Add key expiry and rotation mechanism
5. **Audit logging** — Add structured audit trail for admin actions (md_bank, vault-bank publishes)
6. **CORS hardening** — Ensure only expected origins can access APIs
7. **Input validation** — Add Zod schemas for all API route inputs

---

## 13. Performance Considerations

### Current Strengths

- **Edge Runtime** for all APIs — globally distributed, low cold starts
- **Stale-while-revalidate** vault loading — instant cache, background refresh
- **IndexedDB caching** — versioned, per-root, with metadata
- **Debounced chat sync** — batches writes, avoids per-message requests
- **1M token compaction** — AI Note Agent handles long contexts gracefully
- **Content hashing** — prevents unnecessary re-indexing
- **Loading skeletons** — perceived performance improvement
- **Service worker** — cache-first for static assets

### Bottlenecks

1. **Client-side RAG** — IndexedDB search is O(n) over all chunks; scales poorly beyond 10K chunks
2. **localStorage state** — Study state JSON can exceed 5MB with large activity logs
3. **Vault loading** — Initial vault load reads all note contents; should lazy-load
4. **No paginated search** — `/api/neet-bank` and `/api/jee-bank` could return large result sets
5. **Bundle size** — D3, recharts, katex, and react-markdown add significant JS weight
6. **No image optimization** — No Next.js Image component usage noted
7. **Analytics queries** — Rely on client-side aggregation of raw data

### Optimization Recommendations

1. Move RAG search to server-side Supabase + pgvector for O(log n) similarity search
2. Implement virtual scrolling for long lists (chat messages, question lists)
3. Add bundle analysis + code splitting for heavy visualization libraries
4. Lazy-load chapter note content on scroll
5. Add server-side pagination to all bank/search APIs
6. Add CDN caching for static vault manifests and diagram SVGs
7. Implement Web Worker for study-state serialization

---

## 14. Known Issues & Technical Debt

### Issues

1. **Android OAuth callback URL** must be added to Supabase Auth URL Configuration before deep-link flow works
2. `@capacitor/app` `pluginHeader` captured at import time, not call time — 300ms delay mitigates but doesn't eliminate race condition
3. Second `useEffect` in `auth-gate.tsx` fires on every pathname change unnecessarily
4. ESLint reports `react-hooks/set-state-in-effect` warnings for 22 instances of synchronous setState in effects (Note Agent page)
5. `adminFileInputRef` declared but never used in `note-agent/page.tsx`

### Technical Debt

| Area | Issue | Priority |
|------|-------|----------|
| **Types** | `auth-gate.tsx` casts `(event: { url: string })` without proper type | Low |
| **Error handling** | `login/page.tsx` silently swallows auth errors via `.catch(() => {})` | Medium |
| **Centralization** | `isNative()` check duplicated across files; should be in `src/lib/platform.ts` | Low |
| **Supabase** | Client creation duplicated; should be singleton with connection pooling | Low |
| **Prompts** | AI system prompts in `ai-config.ts` should be DB-sourced for easy editing | Medium |
| **State** | Study state snapshot JSON blob grows unbounded; needs pruning | Medium |
| **Embedding** | 100 req/min, 1000 req/day embedding quota — no rate-limit awareness | Low |
| **CSS** | mix of old `style-*.ts` and new `globals.css` patterns | Low |

---

## 15. Development Roadmap Alignment

### Current Phase: Stability & AI Quality

Based on `MASTER.md` and `futureplans.md`:

**Phase 1 (Stability) — Mostly Complete**
- ✅ Vault deduplication (content hashing)
- ✅ Schema normalization (cognitive state, chat, retrieval tables)
- ✅ Security/RLS audit (all tables enabled)
- ✅ Chat sessions and scoped memory
- ✅ Content identity pipeline
- ✅ Server-configured AI boundary
- ⚠️ Retrieval optimization (client-side only, needs server-side)

**Phase 2 (AI Quality) — In Progress**
- ✅ Misconception detection (evaluation engine)
- ✅ Compressed memory (chat summaries)
- ✅ Adaptive recommendations (cognitive state sync)
- ⚠️ Retrieval ranking (client-side only)
- ✅ Evaluation schemas (attempt_analytics, mastery, etc.)

**Phase 3 (Experience) — Started**
- ✅ Onboarding flow
- ✅ Motion system (framer-motion)
- ✅ Mobile responsive (all pages)
- ✅ Loading states
- ⚠️ UI redesign pass (some pages still pre-polish)

**Phase 4 (Advanced) — Started**
- ✅ Spaced repetition engine (SM-2)
- ✅ Predictive weak areas (from topic accuracy)
- ✅ Graph intelligence (D3 force graph with wikilinks)
- ❌ Learning forecasting (planned but not implemented)
- ❌ Multi-agent orchestration (planned, note agent uses single agent)

### Future Plans

From `futureplans.md`:
- iOS native auth
- Biometric unlock for returning users
- Offline-first auth with encrypted local storage
- Leaderboard page
- Collaborative study rooms
- Mentor/teacher dashboard
- Premium subscription tier
- Public leaderboard with weekly resets
- iOS and Android app store releases

---

## Appendix A: Environment Variables Required

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `OPENCODE_API_KEY` | AI model API key | Yes (or AI_BASE_URL + AI_API_KEY) |
| `AI_BASE_URL` | Custom AI endpoint (optional) | No |
| `AI_MODEL` | Custom AI model name (optional) | No |
| `AI_API_KEY` | Custom AI key (optional) | No |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth client ID | Yes (for auth) |

## Appendix B: SQL Migrations Required

| Migration | File | Purpose |
|-----------|------|---------|
| Base schema | `supabase-schema.sql` | All tables, RLS, indexes |
| 004 | `src/lib/supabase/migration-004-neet-bank.sql` | NEET question bank table + vector search |
| 005 | `src/lib/supabase/migration-005-jee-main-bank.sql` | JEE Main question bank table + vector search |
| 006 | `src/lib/supabase/migration-006-vault-bank.sql` | Vault Bank (shared_to_aclose, RLS update, admin_user view) |
