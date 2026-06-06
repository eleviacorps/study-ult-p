<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/StudyUlt-Adaptive%20Learning%20OS-8B5CF6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgM0wzNyAxMUwyMCAxOUwzIDExTDIwIDNaIiBzdHJva2U9IiM4QjVDRjYiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0yMCAxOUwzNyAxMUwyMCAzN0wzIDExTDIwIDE5WiIgZmlsbD0iIzhCNUNGNiIgZmlsbC1vcGFjaXR5PSIwLjIiIHN0cm9rZT0iIzhCNUNGNiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+">
  </picture>
</p>

<h1 align="center">StudyUlt</h1>

<p align="center">
  <strong>The AI-Native Adaptive Learning Operating System</strong>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-ai-systems">AI Systems</a> •
  <a href="#-mobile">Mobile</a> •
  <a href="#-for-developers">For Developers</a>
</p>

<br>

> **StudyUlt transforms how you study.** Not another PDF reader, not another flashcard app. It's a complete AI-native learning OS that generates, evaluates, and adapts study materials around *you* — your exam, your level, your weak spots, your pace.

<br>

---

## ✨ Features

### 🤖 AI That Teaches, Not Just Answers

**AI Tutor** with persistent memory — it knows what you've struggled with, what you've mastered, and what you should review next. Two surfaces:

- **Full Tutor page** — dedicated deep-dive chat with session history, AI-compressed summaries, and quick actions (explain, visualize, quiz, evaluate)
- **Reader sidebar** — contextual tutor that discusses the exact note you're reading

**AI Note Agent** — generates complete study vaults from scratch. One command produces:

```
📁 Electrostatics/
├── core.md                      # Chapter overview + key formulas
├── notes/                       # Detailed topic notes
│   ├── coulombs-law.md
│   ├── electric-field.md
│   └── gauss-law.md
├── questions/100_questions.md   # Solved problems (Given/Find/Solution)
├── mcqs/100_mcqs.md             # MCQs with assertion-reason, matching, comprehension
├── flashcards/100_flashcards.md # Spaced-repetition ready
├── quizzes/100_quizzes.md       # Timed practice sets
└── revision/
    ├── one_shot.md              # One-shot revision guide
    ├── formula_sheet.md
    └── common_mistakes.md
```

### 📊 Analytics That Understand You

Not just "you studied 30 minutes today." StudyUlt's AI evaluation engine:

- Tracks **mastery** per concept (0-100%)
- Detects **misconception patterns** from wrong answers
- Calculates **learning velocity** — how fast you're improving per topic
- Generates **recovery tasks** — targeted exercises for weak areas
- Creates **adaptive recommendations** based on your performance trends
- Maintains **predicted weaknesses** using AI analysis

### 🧠 Spaced Repetition (SM-2)

- Full SM-2 algorithm implementation
- Per-card ease factors, intervals, and repetition tracking
- Visual breakdown: Due / New / Learning / Mastered
- Quality-based scoring (0-5) with gamification points

### 🎯 Exam-Specific Everything

Presets for **10+ exams** with tailored difficulty, question patterns, and content generation:

| Indian Exams | International Exams |
|-------------|-------------------|
| JEE Main & Advanced | SAT |
| NEET UG | AP (Advanced Placement) |
| CBSE Boards (Class 12) | IB (International Baccalaureate) |
| State Boards | GCSE |
| | A-Levels |

The AI knows the difference. JEE questions get multi-concept, integer/numerical-answer patterns. NEET gets biology-weighted assertion-reason. IB gets command terms and rubric-aware marking.

### 📚 Complete Question Ecosystem

- **MCQs** — single-correct, assertion-reason, matching, comprehension/passage-based
- **Solved questions** — Given/Find/Solution format with detailed explanations
- **Timed quizzes** — mixed subjects, configurable duration
- **Mock tests** — full chapter-length tests with scoring
- **Real exam bank search** — NEET and JEE Main question banks with vector similarity search
- **Worked solutions** — step-by-step with diagrams

### 🔗 Knowledge Graph

Interactive D3 force-directed graph showing how concepts connect:
- Wiki-style `[[backlinks]]` between notes
- Prerequisite → dependent concept relationships
- Topic clusters with semantic grouping
- Search, zoom, and pan
- Tap a node to see details and navigate

### 🤝 Shared Vaults (Vault Bank)

- Admin generates a chapter vault → publishes to Vault Bank
- Authorized users browse, preview, and "Save to vault"
- Preserves all content types (notes, questions, MCQs, flashcards, quizzes, revision)
- Full role-based access: admin publishes, aclose saves

### 📱 Mobile-First Design

Optimized for Android WebView with:
- Native bottom navigation (5-tab glass bar)
- Touch-optimized targets (44px minimum)
- Safe-area aware (notch, keyboard, nav bar)
- Loading skeletons on every page
- Responsive layouts that adapt to any screen
- Native Google Sign-In via Android Credential Manager

### 🔄 Cross-Device Sync

Study on your phone, pick up on desktop:
- Study state sync (streaks, points, activity)
- Cognitive state sync (mastery, weaknesses, velocity)
- Vault note sync (content, chapters, paths)
- Chat history sync (sessions, messages, summaries)
- `sendBeacon` flush on tab close

---

## 🚀 Quick Start

```bash
# Clone
git clone <repo-url>
cd studyult2

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your Supabase URL + anon key + AI API key

# Start dev server
npm run dev

# Build for production
npm run build
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENCODE_API_KEY=your_ai_api_key
NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_oauth_client_id
```

### Database Setup

Run `supabase-schema.sql` in your Supabase SQL Editor. Then apply migrations:

```
supabase-schema.sql            # Base schema (all tables, RLS, indexes)
migration-004-neet-bank.sql    # NEET question bank
migration-005-jee-main-bank.sql # JEE Main question bank
migration-006-vault-bank.sql   # Vault Bank sharing
```

### Android Build

```bash
npm run cap:init
npm run cap:sync
npm run cap:open
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App                        │
│                                                         │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Page    │ │  Components │ │  API Routes │ │  AI       │  │
│  │  Router  │ │  (UI kit)   │ │  (Edge RT)  │ │  Systems  │  │
│  └─────────┘ └──────────┘ └──────────┘ └───────────┘  │
│       │             │              │              │       │
│  ┌────┴─────────────┴──────────────┴──────────────┴────┐ │
│  │                    Data Layer                        │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │ Zustand  │  │  Study   │  │  IndexedDB       │   │ │
│  │  │ Stores   │  │  State   │  │  (RAG + Cache)   │   │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │ │
│  └───────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                   Supabase                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ PostgreSQL│  │   Auth   │  │  RLS Policies        │   │
│  │ (45+ tbls)│  │  (OAuth) │  │  (Every table)       │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Edge Runtime) |
| **Language** | TypeScript ^5 |
| **UI** | React 19, Tailwind CSS v4, Framer Motion |
| **Database** | Supabase (PostgreSQL + Auth + Realtime) |
| **AI Runtime** | OpenAI-compatible (DeepSeek via OpenCode) |
| **Mobile** | Capacitor 8 (Android WebView) |
| **State** | Zustand + localStorage + Supabase sync |
| **Charts** | Recharts, D3-force |
| **Math** | KaTeX |
| **Markdown** | react-markdown + remark-gfm + rehype-katex |

---

## 🤖 AI Systems

StudyUlt has **5 distinct AI systems** that work together:

### 1. AI Tutor (`/tutor`)
- Context-aware chat with session history
- AI-compressed session summaries
- Structured payloads: student state + retrievals + memories
- Quick actions: explain, visualize, problem, evaluate

### 2. AI Note Agent (`/note-agent`)
- SharedWorker-based persistent agent
- Generates complete chapter vaults autonomously
- Searches real question banks (NEET, JEE Main)
- Web search for topic research
- 3-tier RAG: Provider API → Local ONNX → TF-IDF fallback
- 1M token context compaction

### 3. AI Evaluation Engine
- Records every attempt → updates mastery
- Detects misconception patterns → creates recovery tasks
- Tracks learning velocity → updates performance trends
- Generates adaptive recommendations

### 4. AI Mermaid Pipeline
- Generates 14+ diagram types (flowcharts, mind maps, sequence, class, state, ER, Gantt, pie, timeline, git, quadrant, XY, journey)
- Kroki SVG rendering with security sanitization
- Automatically detected and rendered in chat

### 5. AI Onboarding Profile Generator
- Processes survey responses → generates learning profile
- Creates adaptive strategy and tutor personality prompt
- Deterministic fallback when AI unavailable

---

## 📱 Mobile

StudyUlt is built mobile-first with Capacitor for Android WebView.

```
┌─────────────────────┐
│    Status Bar       │
├─────────────────────┤
│                     │
│    Page Content     │
│    (scrollable)     │
│                     │
├─────────────────────┤
│ 🏠 📖 ✍️ 🤖 ⚙️    │
│  5-Tab Glass Nav    │
└─────────────────────┘
```

**Android features:**
- Native Google Sign-In (Credential Manager)
- Service worker for offline access
- IndexedDB vault cache (stale-while-revalidate)
- Safe-area aware throughout
- Touch-optimized (44px+ targets)

---

## 📁 Project Structure (Key Directories)

```
src/
├── app/              # Next.js App Router (20+ pages + 25+ API routes)
├── components/       # Reusable UI components
├── lib/              # Core logic
│   ├── note-agent/   # AI Note Agent (worker, bridge, RAG)
│   ├── supabase/     # DB clients + migrations
│   └── *.ts          # Study state, vault parser, SM-2, exam presets
├── stores/           # Zustand state stores
├── hooks/            # Custom React hooks
└── types/            # TypeScript interfaces
public/
├── skills/           # AI skill definitions (study-ult, mermaid)
└── *.json            # Build-generated manifests
scripts/              # Build-time generators
```

---

## 🛠 For Developers

### Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Production build (runs vault JSON generation)
npm run start         # Start production server
npm run lint          # ESLint check
npm run cap:init      # Initialize Capacitor
npm run cap:sync      # Sync web build to Android
npm run cap:open      # Open Android Studio
```

### Key Design Patterns

- **Edge Runtime** for all API routes
- **RLS everywhere** — every table has row-level security
- **Content identity via SHA-256** — deduplication by content hash
- **Server-configured AI** — model and API key never reach the browser
- **Hybrid state** — localStorage (fast cache) + Supabase (authoritative store)
- **SharedWorker** — AI Note Agent persists across page navigations
- **Idempotent upserts** — all writes are safe to repeat
- **Write-then-assess pipeline** — Note Agent writes all files first, then assesses at the end

### AI Skill System

Skills define how the AI behaves. Located in `public/skills/`:

```
public/skills/
├── study-ult/
│   └── skill.md      # 43KB — Complete study generation instructions
└── mermaid/
    └── skill.md      # 500+ lines — Mermaid syntax reference (13 diagram types)
```

### Contributing

1. Follow the architecture principles in `MASTER.md`
2. Keep changes small and verifiable
3. Document meaningful steps in `MASTER.md` execution ledger
4. Run `npx tsc --noEmit` before committing
5. Ensure RLS on any new user-scoped tables

---

## 📄 License

Private — All rights reserved.

---

<p align="center">
  <sub>Built with Next.js 16, React 19, Supabase, and DeepSeek AI.</sub>
  <br>
  <sub>StudyUlt — Learn what matters. Master everything else.</sub>
</p>
