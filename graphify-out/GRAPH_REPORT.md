# Graph Report - .  (2026-05-31)

## Corpus Check
- 142 files · ~184,316 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 795 nodes · 1549 edges · 62 communities (39 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Agent Engine|Agent Engine]]
- [[_COMMUNITY_Dashboard & Graph|Dashboard & Graph]]
- [[_COMMUNITY_Exam Presets & Config|Exam Presets & Config]]
- [[_COMMUNITY_Cache Layer|Cache Layer]]
- [[_COMMUNITY_Auth & Navigation|Auth & Navigation]]
- [[_COMMUNITY_Skill Documentation|Skill Documentation]]
- [[_COMMUNITY_AI Tutor|AI Tutor]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Manim Scenes|Manim Scenes]]
- [[_COMMUNITY_Flashcards|Flashcards]]
- [[_COMMUNITY_Tests|Tests]]
- [[_COMMUNITY_Reader & Mermaid|Reader & Mermaid]]
- [[_COMMUNITY_Questions|Questions]]
- [[_COMMUNITY_Analytics & Search|Analytics & Search]]
- [[_COMMUNITY_API Routes|API Routes]]
- [[_COMMUNITY_Evaluation Pipeline|Evaluation Pipeline]]
- [[_COMMUNITY_Page Components|Page Components]]
- [[_COMMUNITY_Content Index|Content Index]]
- [[_COMMUNITY_Onboarding|Onboarding]]
- [[_COMMUNITY_Graph Data Model|Graph Data Model]]
- [[_COMMUNITY_Diagram Service|Diagram Service]]
- [[_COMMUNITY_Chat Sessions|Chat Sessions]]
- [[_COMMUNITY_Web Search Proxy|Web Search Proxy]]
- [[_COMMUNITY_Chemistry Animations|Chemistry Animations]]
- [[_COMMUNITY_Theme System|Theme System]]
- [[_COMMUNITY_Simulations|Simulations]]
- [[_COMMUNITY_Design Tokens|Design Tokens]]
- [[_COMMUNITY_Chat API|Chat API]]
- [[_COMMUNITY_Profile API|Profile API]]
- [[_COMMUNITY_Theme Store|Theme Store]]
- [[_COMMUNITY_Service Worker|Service Worker]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Derivative Scene|Derivative Scene]]
- [[_COMMUNITY_Gauss Law Scene|Gauss Law Scene]]
- [[_COMMUNITY_LLM Models API|LLM Models API]]
- [[_COMMUNITY_Embeddings API|Embeddings API]]
- [[_COMMUNITY_Chat Summary API|Chat Summary API]]
- [[_COMMUNITY_Coulombs Law Scene|Coulombs Law Scene]]
- [[_COMMUNITY_Electric Dipole Scene|Electric Dipole Scene]]
- [[_COMMUNITY_Electric Field Scene|Electric Field Scene]]
- [[_COMMUNITY_Kinematics Scene|Kinematics Scene]]
- [[_COMMUNITY_Optics Scene|Optics Scene]]
- [[_COMMUNITY_Pendulum Scene|Pendulum Scene]]
- [[_COMMUNITY_SHM Scene|SHM Scene]]
- [[_COMMUNITY_Vectors 3D Scene|Vectors 3D Scene]]
- [[_COMMUNITY_Conic Sections Scene|Conic Sections Scene]]
- [[_COMMUNITY_Doppler Scene|Doppler Scene]]
- [[_COMMUNITY_Function Graph Scene|Function Graph Scene]]
- [[_COMMUNITY_Integration Scene|Integration Scene]]
- [[_COMMUNITY_Kinetics Scene|Kinetics Scene]]
- [[_COMMUNITY_Limits Scene|Limits Scene]]
- [[_COMMUNITY_Projectile Scene|Projectile Scene]]
- [[_COMMUNITY_Pythagorean Scene|Pythagorean Scene]]
- [[_COMMUNITY_Trigonometry Scene|Trigonometry Scene]]
- [[_COMMUNITY_Wave Scene|Wave Scene]]

## God Nodes (most connected - your core abstractions)
1. `useVaultStore` - 38 edges
2. `cn()` - 34 edges
3. `StudyUlt Skill` - 31 edges
4. `write_scene()` - 23 edges
5. `replace()` - 21 edges
6. `updateStudyState()` - 21 edges
7. `Header()` - 19 edges
8. `useLlm()` - 17 edges
9. `getVault()` - 17 edges
10. `searchDocuments()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `StudyUlt App Logo` --conceptually_related_to--> `StudyUlt Skill`  [INFERRED]
  public/app-logo.png → public/skills/study-ult/skill.md
- `StudyUlt Splash Screen Logo` --conceptually_related_to--> `StudyUlt Skill`  [INFERRED]
  public/splash-screen-logo.png → public/skills/study-ult/skill.md
- `StudyUlt Skill` --cites--> `RAG Architecture (3-tier Embedding)`  [INFERRED]
  public/skills/study-ult/skill.md → src/lib/note-agent/RAG-ARCHITECTURE.md
- `DashboardPage()` --calls--> `useVaultStore`  [EXTRACTED]
  src/app/dashboard/page.tsx → src/stores/vault-store.ts
- `FlashcardsRootPage()` --calls--> `useVaultStore`  [EXTRACTED]
  src/app/flashcards/page.tsx → src/stores/vault-store.ts

## Import Cycles
- 2-file cycle: `src/lib/study-state.ts -> src/lib/sync.ts -> src/lib/study-state.ts`
- 3-file cycle: `src/lib/ai-retrieval.ts -> src/lib/study-state.ts -> src/lib/sync.ts -> src/lib/ai-retrieval.ts`

## Communities (62 total, 23 thin omitted)

### Community 0 - "Agent Engine"
Cohesion: 0.05
Nodes (81): AgentAbortError, AgentEngineCallbacks, autoFillWriteFileArgs(), extractFilePath(), extractMarkdown(), findTailStartIndex(), formatToolError(), GARBAGE_RESULTS (+73 more)

### Community 1 - "Dashboard & Graph"
Cohesion: 0.07
Nodes (49): DashboardWidgetsProps, GraphPage(), GraphPanel(), PALETTE, SimLink, SimNode, generateChapterParams(), generateReaderParams() (+41 more)

### Community 2 - "Exam Presets & Config"
Cohesion: 0.06
Nodes (42): EXAM_PRESETS, ExamPreset, getDefaultPreset(), AGENT_SYSTEM_PROMPT, AgentConfig, AgentStep, getAgentSystemPrompt(), NOTE_AGENT_TOOLS (+34 more)

### Community 3 - "Cache Layer"
Cohesion: 0.08
Nodes (37): CacheEntry, evictIfNeeded(), idbClear(), idbEntries(), idbGet(), idbRemove(), idbSet(), isCacheStale() (+29 more)

### Community 4 - "Auth & Navigation"
Cohesion: 0.08
Nodes (31): AuthGate(), PUBLIC_ROUTES, SHELLLESS_ROUTES, SplashScreen(), mobilePrimaryNav, navItems, Sidebar(), buildStructuredTutorContext() (+23 more)

### Community 5 - "Skill Documentation"
Cohesion: 0.05
Nodes (44): StudyUlt App Logo, StudyUlt Splash Screen Logo, Flashcard Parser Structure, Flashcard Types (Conceptual/Formula/Comparison/Memory Trick/Common Mistake), Note Callout Types, Required Note Sections, Full Note Template (400+ lines), Question Parser Format (+36 more)

### Community 6 - "AI Tutor"
Cohesion: 0.14
Nodes (30): AiTutorSidebar(), AiTutorSidebarProps, ChatMessage, ChatSessionType, ChatSyncOptions, chatSyncQueue, clearChat(), createId() (+22 more)

### Community 7 - "Root Layout"
Cohesion: 0.10
Nodes (19): geistMono, geistSans, metadata, ErrorBoundary, Props, State, GalaxyBackground(), ServiceWorkerRegister() (+11 more)

### Community 8 - "Manim Scenes"
Cohesion: 0.21
Nodes (24): build_conic_scene(), build_coulombs_law_scene(), build_derivative_scene(), build_doppler_scene(), build_electric_dipole_scene(), build_electric_field_scene(), build_gauss_law_scene(), build_graph_scene() (+16 more)

### Community 9 - "Flashcards"
Cohesion: 0.17
Nodes (19): saveAnswer(), FlashcardsRootPage(), CardSchedule, getDueFlashcards(), getFlashcardSchedule(), getFlashcardStats(), getToday(), qualityFromRating() (+11 more)

### Community 10 - "Tests"
Cohesion: 0.12
Nodes (9): QUESTION_COUNTS, TestQuestion, TestTakePage(), TIME_LIMITS, CustomSimulation(), PROMPTS, useLlm(), QuizPage() (+1 more)

### Community 11 - "Reader & Mermaid"
Cohesion: 0.13
Nodes (12): ReaderPage(), MermaidDiagram(), MermaidDiagramProps, SelectionToolbar(), SelectionToolbarProps, CalloutBlock(), calloutConfig, findMermaidBlock() (+4 more)

### Community 12 - "Questions"
Cohesion: 0.16
Nodes (12): AiSection(), AiStructured, QuestionCard(), QuestionsPage(), CachedAiResponse, clearAiCache(), getAiCache(), loadCache() (+4 more)

### Community 13 - "Analytics & Search"
Cohesion: 0.20
Nodes (12): AnalyticsPage(), GlobalSearch(), SearchResult, DashboardWidgets(), WidgetCard(), DashboardPage(), HeaderProps, cn() (+4 more)

### Community 15 - "Evaluation Pipeline"
Cohesion: 0.22
Nodes (12): clamp(), EvaluationPayload, POST(), toNumber(), canonicalSlug(), sha256Hex(), buildChunks(), getUnknownPath() (+4 more)

### Community 16 - "Page Components"
Cohesion: 0.22
Nodes (7): FlashcardsPage(), ReaderChapterPage(), Header(), QuestionsRootPage(), ReaderRootPage(), useVaultStore, TestsRootPage()

### Community 17 - "Content Index"
Cohesion: 0.24
Nodes (9): ChapterIndex, CONTENT_ROOT, ContentFile, ContentIndex, ensureDir(), initializeContentDirs(), scanContent(), scanDirectory() (+1 more)

### Community 18 - "Onboarding"
Cohesion: 0.18
Nodes (9): Chip(), DIFFICULTIES, EXAMS, OnboardingPage(), PACES, slideVariants, STEPS, STYLES (+1 more)

### Community 19 - "Graph Data Model"
Cohesion: 0.20
Nodes (9): chapters, conceptConnections, flashcards, graphData, links, nodes, notes, questions (+1 more)

### Community 20 - "Diagram Service"
Cohesion: 0.42
Nodes (6): encodeDeflateBase64(), POST(), POST(), isMermaidSource(), MERMAID_STARTERS, sanitizeSvg()

### Community 21 - "Chat Sessions"
Cohesion: 0.25
Nodes (6): CHAT_TYPES, ChatSessionType, IncomingMessage, IncomingSession, normalizeSession(), POST()

### Community 22 - "Web Search Proxy"
Cohesion: 0.33
Nodes (7): fetchDdg(), GARBAGE_PATTERNS, parseDdgHtml(), parseLiteTable(), POST(), SearchResult, searchWikipedia()

### Community 23 - "Chemistry Animations"
Cohesion: 0.29
Nodes (4): Scene, LimitsVisual, MolecularStructure, PeriodicTrends

### Community 24 - "Theme System"
Cohesion: 0.38
Nodes (4): Theme, ThemeContext, useTheme(), useThemeColors()

### Community 25 - "Simulations"
Cohesion: 0.33
Nodes (5): getDefaultParams(), SimType, Simulation(), SimulationProps, STRING_PARAMS

### Community 26 - "Design Tokens"
Cohesion: 0.29
Nodes (6): animations, colors, glassStyles, glowStyles, radii, spacing

### Community 27 - "Chat API"
Cohesion: 0.40
Nodes (3): ChatMessage, getServerAiBaseUrl(), POST()

### Community 28 - "Profile API"
Cohesion: 0.60
Nodes (5): cleanText(), fallbackProfile(), generateAiProfile(), OnboardingBody, POST()

### Community 29 - "Theme Store"
Cohesion: 0.40
Nodes (4): Theme, ThemeInitializer(), ThemeState, useThemeStore

### Community 30 - "Service Worker"
Cohesion: 0.60
Nodes (4): cacheThenNetwork(), DATA_URLS, fetchAndCache(), networkThenCache()

### Community 31 - "Auth Middleware"
Cohesion: 0.60
Nodes (3): config, proxy(), updateSession()

### Community 36 - "Chat Summary API"
Cohesion: 0.83
Nodes (3): fallbackSummary(), POST(), summarizeWithAi()

## Knowledge Gaps
- **158 isolated node(s):** `DATA_URLS`, `chapters`, `notes`, `questions`, `flashcards` (+153 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Analytics & Search` to `Dashboard & Graph`, `Exam Presets & Config`, `Auth & Navigation`, `AI Tutor`, `Flashcards`, `Tests`, `Reader & Mermaid`, `Questions`, `Page Components`, `Onboarding`, `Simulations`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `useVaultStore` connect `Page Components` to `Dashboard & Graph`, `Exam Presets & Config`, `Cache Layer`, `Auth & Navigation`, `AI Tutor`, `Root Layout`, `Flashcards`, `Tests`, `Reader & Mermaid`, `Questions`, `Analytics & Search`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `AgentStep` connect `Exam Presets & Config` to `Agent Engine`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `StudyUlt Skill` (e.g. with `StudyUlt App Logo` and `StudyUlt Splash Screen Logo`) actually correct?**
  _`StudyUlt Skill` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `DATA_URLS`, `chapters`, `notes` to the rest of the system?**
  _158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.05170441546556852 - nodes in this community are weakly interconnected._
- **Should `Dashboard & Graph` be split into smaller, more focused modules?**
  _Cohesion score 0.07080200501253132 - nodes in this community are weakly interconnected._