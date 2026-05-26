# Future Plans

## Auth & Platform Evolution

### Phase 1 — Stabilize OAuth (NOW)
- Add `com.studyult.app://auth/callback` to Supabase Auth → URL Configuration
- Verify `window.location.href` redirect works for both web and Android
- Test Google OAuth end-to-end on real device

### Phase 2 — Native Google Sign-In (DONE)
Full native auth via `@capawesome/capacitor-google-sign-in` (uses Android Credential Manager):
- Returns Google `idToken` directly — no browser, no redirects, no deep links
- Authenticate with Supabase via `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`
- Web continues using `supabase.auth.signInWithOAuth()` unchanged
- Uses the Google **WEB** client ID (`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`) as required by both the plugin and Supabase
- No Chrome Custom Tab, no system browser, no Brave issue

### Phase 3 — iOS Native Auth (SHORT TERM)
- `@capawesome/capacitor-google-sign-in` supports iOS via Google Sign-In SDK
- Add `GIDClientID` to iOS Info.plist
- Add URL scheme for iOS client ID
- Same code path — `Capacitor.isNativePlatform()` already handles it

### Phase 4 — Platform Expansion (LONG TERM)
- iOS native auth via `@capacitor-community/apple-sign-in` or custom plugin
- Biometric unlock (fingerprint/face ID) for returning users
- Offline-first auth: session cached in encrypted local storage, sync on reconnect

---

## Feature Roadmap

### Short Term (1-2 weeks)
- [ ] Leaderboard page using `user_points` and `profiles` tables
- [ ] Profile settings — edit name, username, avatar, bio, social links (DONE)
- [ ] Badge/rewards system (earned for streaks, chapter completion, quiz scores)

### Medium Term (1-2 months)
- [ ] AI tutor conversation history persistence
- [ ] Note-taking agent with markdown export
- [ ] Custom study plans based on weak areas
- [ ] Spaced repetition algorithm refinement

### Long Term (3-6 months)
- [ ] Real-time collaborative study rooms
- [ ] Mentor/teacher dashboard
- [ ] Public leaderboard with weekly resets
- [ ] Premium subscription tier (extended AI, unlimited sync, advanced analytics)
- [ ] iOS App Store release
- [ ] Android Play Store release

---

## Technical Debt

### Immediate
- `auth-gate.tsx`: remove `(event: { url: string })` type cast — use the proper `@capacitor/app` type export
- `login/page.tsx`: the `.catch(() => { ... })` silently swallows auth errors — add `console.error` at minimum

### Backlog
- Centralize `isNative()` in a shared util (`src/lib/platform.ts`)
- Extract Supabase client creation into a singleton with connection pooling
- Add request timeout to all Supabase calls in the auth gate
- Move AI system prompts from `src/lib/ai-config.ts` into a database table for easy editing

---

## Platform Evolution

### Phase 5 — General Education Pivot
- [ ] **User Profile Survey**: Onboarding flow with exam type (JEE/NEET/UPSC/CUET/SAT/TOEFL/etc.), grade/class, subjects, goals, strengths/weaknesses → AI generates personalized system prompt stored in profile
- [ ] **AI Prompt Adaptation Module**: Separate service that reads user profile and prepends exam-appropriate context to all AI calls. Decoupled from note agent — works with tutor, quiz generator, and all other AI features. Dynamically swaps terminology ("JEE-level" → "exam-level", "JEE insight" → "exam insight") based on profile.
- [ ] **Remove JEE References**: Rename to "Ev Study" across layout.tsx, sidebar, capacitor config, AI config prompts, login page, settings page, reader, quizzes, tutor. Update ALL system prompts in ai-config.ts to be exam-agnostic.

---

## Known Issues

- Android OAuth callback URL `com.studyult.app://auth/callback` must be added to Supabase Auth — URL Configuration before deep-link flow works
- `@capacitor/app` `pluginHeader` captured at import time, not call time — 300ms delay mitigates but doesn't eliminate race
- Second `useEffect` in `auth-gate.tsx` fires on every pathname change unnecessarily — does not re-init deep link listener, but runs auth check again
