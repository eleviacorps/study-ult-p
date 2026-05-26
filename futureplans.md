# Future Plans

## Auth & Platform Evolution

### Phase 1 — Stabilize OAuth (NOW)
- Add `com.studyult.app://auth/callback` to Supabase Auth → URL Configuration
- Verify `window.location.href` redirect works for both web and Android
- Test Google OAuth end-to-end on real device

### Phase 2 — In-WebView OAuth (DONE)
OAuth flow now stays entirely in the WebView (no system browser hand-off):
- Added `ysfmppybkccqkieielej.supabase.co` and `*.supabase.co` to `allowNavigation` in `capacitor.config.ts`
- Changed native `redirectTo` from `com.studyult.app://auth/callback` to `${location.origin}/auth/callback`
- Removed deep-link listener from `auth-gate.tsx` (no longer needed)
- Server-side `/auth/callback` Route Handler exchanges the auth code and sets session cookies
- The entire OAuth flow happens in the WebView — PKCE verifier cookie persists across origin navigations in cookie jar, server reads it from the request when the callback fires

### Phase 3 — Embedded Auth Session (SHORT TERM)
If in-WebView OAuth still has issues (cookie blocking, etc.), switch to plugin-based auth:
- **`@byteowls/capacitor-oauth2`** already installed
- Configure it with Supabase OAuth endpoint + `additionalParameters` for Google provider
- Plugin uses AppAuth's `startActivityForResult` — preserves JS context, no cross-domain cookie issues
- Requires Android Google Client ID from Google Cloud Console

### Phase 4 — Native Google Sign-In (MEDIUM TERM)
Full native auth via Credential Manager API:
- Custom Capacitor plugin wrapping Android `CredentialManager.getCredential()`
- Returns Google `idToken` directly — no browser opens, no redirects, no deep links
- Authenticate with Supabase via `supabase.auth.signInWithIdToken()`
- Web continues using browser OAuth unchanged
- iOS: `AuthenticationServices` framework + Apple/Google Sign-In SDKs

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

## Known Issues

- Android OAuth callback URL `com.studyult.app://auth/callback` must be added to Supabase Auth — URL Configuration before deep-link flow works
- `@capacitor/app` `pluginHeader` captured at import time, not call time — 300ms delay mitigates but doesn't eliminate race
- Second `useEffect` in `auth-gate.tsx` fires on every pathname change unnecessarily — does not re-init deep link listener, but runs auth check again
