# Knowable — roadmap & build status

Living map of what's built and what's next. Last audited **2026-08-01** (code
QA pass) against `main`. Pair this with `CLAUDE.md` (stack, architecture,
gotchas).

Legend: ✅ built · 🟡 partial · ⬜ not built

## Where things stand

V1 + V1.5 are shipped and merged to `main`: the collage design system, all core
screens, the commonality engine, nudges, the three connect flows (bump / search /
SMS invite + claim), settings & privacy, and unit tests + CI. A **real
multi-user Supabase backend** (normalized schema, `auth.uid()`-scoped RLS,
passwordless phone auth) is built and opt-in via env vars, and connect
**creation** (NFC bump, Search send/accept, SMS-invite claim) is now wired to
that real backend too — see B0 below. Two V2 features (not-interested archive,
structured "where you met") and the mutual-friends graph also already landed.
The app runs on the iOS simulator/device.

A remote **code-level QA pass** (1C) has since walked every flow, fixed the
regressions it found, and re-verified tsc/tests/web bundle — see 1C's notes.
It could not exercise a physical device or a live Supabase project (the
sandbox that ran it has neither), so what's left is: the physical two-real-
account walkthrough against a live backend, shipping a beta (EAS/TestFlight +
push + analytics), real data-pull integrations, and launch prep.

## Status table

| # | Item | Status | Notes |
|---|------|--------|-------|
| — | V1 core (design system, screens, engine, nudges, connect flows, settings) | ✅ | merged |
| — | V1.5 (simulated data pull, connection types, event nudges, quests, claim) | ✅ | merged |
| — | Unit tests + CI (typecheck · jest · web bundle) | ✅ | `.github/workflows/ci.yml` |
| — | Local nudge notifications (on-device) | ✅ | `src/engine/notifications.ts`, `useNudgeReminders` |
| 1A | Supabase data layer (live) | ✅ | `supabase/migrations/`, `src/data/repository.ts` |
| 1B | Multi-user auth + owner-scoped RLS | ✅ | phone OTP, `auth.uid()` RLS, RPCs |
| B0 | Wire connect **creation** to backend | ✅ | `supabase/migrations/0003_connect_creation.sql` (`get_profile_preview`, `list_incoming_requests`, `preview_pending_connection`, `claim_pending_connection`, `confirm_connection`/`accept_request` gain `method`/`met_context`); `src/data/repository.ts` + `src/store/useStore.ts` (`previewCandidate`/`confirmNfcConnection`, `searchDirectory`, `sendConnectRequest`/`acceptIncoming`/`ignoreIncoming`, `claimInviteByToken`) branch on a signed-in `activeOwnerId`, falling back to the mock pool otherwise; `npx tsc --noEmit` clean, `npm test -- --ci` 52/52 passing, `EXPO_OFFLINE=1 CI=1 npx expo export --platform web` bundles clean. Not yet verified on a live device with two real accounts — see 1C. |
| 1C | On-device QA pass (post-merge, live backend, second real account) | 🟡 | Code-level pass done remotely (no device/live project available in-session) — walked bump/NFC, search, invite/claim, nudges/notifications, settings, not-interested, where-you-met, auth gate, connection profile. Fixed 3 regressions: (1) `app/_layout.tsx` — global `<StatusBar style="light" />` put white status-bar content on the light cream background on every screen except onboarding/auth; now switches on route segment. (2) `app/claim/[id].tsx` — the directory-preview fallback's "Get Knowable & connect"/"Maybe later" buttons had no `onPress` (dead buttons, reachable via a deep link with an arbitrary id even though no in-app route creates one); wired to `sendConnectRequest`/`router.back()`. (3) `src/store/useStore.ts`'s Supabase sync subscriber pushed an `updateConnectionMember` for every connection on any single connection edit; now diffs by object identity and pushes only the changed one(s), matching the module's own "per-action edits push their specific change" doc. Re-verified `npx tsc --noEmit` clean, `npm test -- --ci` 52/52 passing, `EXPO_OFFLINE=1 CI=1 npx expo export --platform web` bundles clean. **Still open:** the actual physical-device walkthrough with a live Supabase project and a second real account (NFC tap, SMS OTP receipt, real cross-device claim) — needs a human with hardware; nothing in this environment can do that part. |
| 2A | EAS Build + TestFlight | ⬜ | no `eas.json` / `projectId` |
| 2B | Push notifications | 🟡 | `src/notifications/` + `server/sendPush.ts` scaffolded; nothing calls them, no EAS id |
| 2C | Analytics + crash reporting | ⬜ | no PostHog/Sentry |
| 3A | Data-pull OAuth base + Spotify/Letterboxd | ⬜ | `datapull.ts` fully simulated |
| 3B | Remaining data-pull adapters | ⬜ | Strava/Goodreads/Bandsintown/Polarsteps/LinkedIn |
| 3C | Partiful + real mutual graph | 🟡 | mutual graph ✅ (`src/engine/social.ts`); Partiful ⬜ |
| 4A | App Store readiness | ⬜ | no privacy policy / Info.plist usage strings |
| 4B | Remaining V2 + Android | 🟡 | not-interested ✅ & where-you-met ✅; crush ⬜, Android ⬜ |

## Workflow (apply to every milestone)

1. **One milestone = one fresh chat**, branched **off `main`**.
2. Start by reading `CLAUDE.md`; finish by verifying `npx tsc --noEmit` +
   `npm test -- --ci` + `EXPO_OFFLINE=1 CI=1 npx expo export --platform web`,
   then commit, push, open a PR to `main`.
3. **Merge each PR before starting the next** — most items touch shared core
   files (`store`, `repository`, `_layout`). Parallel branches caused a painful
   12-branch consolidation once already.
4. **Parallel-safe** (isolated files): analytics/crash (2C), App Store assets
   (4A), and individual data-pull adapters (3B) once the OAuth base (3A) exists.

## Remaining work — ordered, with kickoff prompts

### 1C — Physical two-account device walkthrough  🟡  *(do first)*
```
Branch off main. Read CLAUDE.md + ROADMAP.md's 1C row (a remote code-level pass
already ran and fixed what it could find — see its notes). Goal: on a PHYSICAL
device with the live Supabase backend configured, using a SECOND real account,
verify connect creation end to end (NFC bump — needs real hardware and a dev-
client/prebuilt build, Search send/accept, SMS invite/claim with a real OTP)
plus nudges, notifications, settings, not-interested, where-you-met. Fix
anything a real device/live backend surfaces that static review couldn't catch
(timing, permissions prompts, deep links, push delivery). Verify tsc + tests +
web bundle. PR to main.
```

### 2A — EAS Build + TestFlight  ⬜
```
Branch off main. Read CLAUDE.md. Goal: set up EAS (eas.json + project id) and
produce an iOS build submitted to TestFlight; configure signing + internal
distribution. Document build/submit steps in CLAUDE.md. PR to main.
```

### 2B — Wire push notifications end-to-end  🟡→✅
```
Branch off main. Read CLAUDE.md. Goal: finish push (scaffolded in src/notifications/
+ server/sendPush.ts). With the EAS project id set (2A), register device tokens,
add a Supabase edge function that calls sendPush for nudges / connection-confirmed /
new-commonality, and deep-link taps. Gate on settings. Verify tsc + tests + web
bundle. PR to main.
```

### 2C — Analytics + crash reporting  ⬜  *(parallel-safe)*
```
Branch off main. Read CLAUDE.md. Goal: add PostHog (product analytics) + Sentry
(crash/error). Instrument key events (connect made, nudge acted on, data-pull
connected, onboarding completed). Keys via EXPO_PUBLIC_* env; no-op when unset.
Verify tsc + tests + web bundle. PR to main.
```

### 3A — Data-pull OAuth base + first adapters  ⬜
```
Branch off main. Read CLAUDE.md. Goal: make data-pull real, replacing the
simulation in src/data/datapull.ts while keeping the SAME PulledData shape
(engine/UI unchanged). Build OAuth/token infra + secure token storage, then
implement Letterboxd and Spotify. Keep simulatePull as dev fallback. Verify tsc +
tests + web bundle. PR to main. (I'll supply Spotify developer keys.)
```

### 3B — Remaining data-pull adapters  ⬜  *(parallel-safe after 3A)*
```
Branch off main. Read CLAUDE.md. Goal: add ONE real data-pull adapter on the
OAuth base from 3A — [Strava | Goodreads | Bandsintown | Polarsteps | LinkedIn].
Same PulledData shape, sim fallback. Verify tsc + tests + web bundle. PR to main.
```

### 3C — Partiful integration  ⬜  *(mutual graph already ✅)*
```
Branch off main. Read CLAUDE.md. Goal: surface shared Partiful events as a
commonality source, feeding the existing engine. (Real mutual-friends graph is
already built in src/engine/social.ts.) Verify tsc + tests + web bundle. PR to main.
```

### 4A — App Store readiness  ⬜  *(parallel-safe)*
```
Branch off main. Read CLAUDE.md. Goal: App Store prep — privacy policy + data
disclosures (contacts/phone), app icon/screenshots/listing copy, and required
Info.plist usage strings (NFC, contacts, notifications). PR to main + a checklist
of manual submission steps.
```

### 4B — Crush mechanic / Android  🟡
```
Branch off main. Read CLAUDE.md. Goal: pick ONE — (a) crush mechanic (mutual
opt-in, neither notified unless both match), or (b) an Android build/QA pass.
Tell me which at the start. Verify tsc + tests + web bundle. PR to main.
```

## Recommended order

**1C** (verify the real backend end to end, two accounts) → **2A → 2B → 2C**
(beta + instrumentation) → **3A → 3B×N → 3C** (integrations) → **4A → 4B**
(launch/expand). Do shared-core items in sequence; fan out the parallel-safe
ones as convenient.
