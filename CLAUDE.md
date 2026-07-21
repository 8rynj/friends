# Knowable — project guide for Claude

Knowable helps people turn good conversations into real friendships: capture a
connection when you meet (NFC bump / search / SMS invite), surface what you have
in common as icebreakers, and nudge timely follow-up. This repo is the React
Native (Expo) app. It runs on **mock data by default, no sign-in required** —
a Supabase-backed data layer and passwordless phone auth can both be enabled
behind the same store API via env vars, and are no-ops until then — see
[Supabase (optional backend)](#supabase-optional-backend).

## Stack

- **Expo SDK 56**, **React Native 0.85**, **React 19**, **TypeScript**
- **Expo Router** (file-based, `app/`)
- **Zustand** + **AsyncStorage** for state/persistence (`src/store/useStore.ts`)
- **react-native-svg** (outline text, halftone, icons), **react-native-reanimated**
  (animations; needs `react-native-worklets`), **expo-haptics**, **expo-font**
- **react-native-nfc-manager** (NFC bump — real tap-to-connect, `src/nfc/tapConnect.ts`)
  via its Expo config plugin, registered in `app.json` → `plugins`
- **expo-notifications** + **expo-device** for push registration/deep links
  (`src/notifications/`); the backend send function lives in `server/`
- **Space Grotesk** via `@expo-google-fonts/space-grotesk` — used everywhere

## Run & verify

```bash
npm install --legacy-peer-deps     # the flag is REQUIRED (SDK 56 react/react-dom peer mismatch)
npx expo start                     # Metro; press i (iOS), w (web) — NFC bump is a no-op here, see Gotchas
npx expo run:ios                   # full native build + simulator (needs macOS + Xcode 16+)
```

NFC needs a real dev-client/prebuilt build on a **physical device** to test —
regenerate native projects after touching the `react-native-nfc-manager` plugin
config in `app.json`:

```bash
npx expo prebuild --clean          # picks up app.json plugin config (NFC entitlements/permissions)
npx expo run:ios --device          # or run:android --device; install + launch on hardware
```

Fast verification loop used in this project (no device needed):

```bash
npx tsc --noEmit                                   # typecheck
npm test                                           # Jest unit tests (engine + store)
EXPO_OFFLINE=1 CI=1 npx expo export --platform web # bundles every route via Metro — catches import/runtime errors
```

CI (`.github/workflows/ci.yml`) runs exactly those three on every PR. Tests use
**jest-expo** and live in `src/**/__tests__/*.test.ts`; they cover the pure logic
layers (commonality engine, nudges, Zustand store) — not RN screens. AsyncStorage
is mocked in `jest.setup.js` so the persisted store imports under Node.

**Cost note:** prefer typecheck + web bundle + text assertions for verification;
screenshots are token-expensive — only use them for genuinely visual changes.

## Project structure

```
app/                      Expo Router routes
  _layout.tsx             Root stack; loads fonts; hides splash; conditional auth gate (see gotchas)
  (tabs)/                 Bottom nav: index (Home), connections (People), you (You)
  onboarding/index.tsx    4-step dark-mode onboarding (name → hobbies → top 5 → handles)
  connection/[id].tsx     Connection profile (commonalities, cadence, type, mutuals)
  icebreaker.tsx          Post-bump / post-connect commonalities
  add.tsx, find.tsx, invite.tsx, claim/[id].tsx   Connect flows (bump/search/SMS/claim)
  connect.tsx             V1.5 data-pull manager (simulated)
  edit/[facet].tsx        Parametrized profile-section editor
  settings.tsx            Settings & privacy
  auth/phone.tsx, auth/verify.tsx   Passwordless phone sign-in (only reachable when Supabase is configured)
src/
  theme/                  colors, typography, layout/motion tokens (reference roles, not hex)
  components/             collage design-system primitives + UI (barrel: index.ts)
  data/                   types.ts, mock.ts, catalog.ts (hobbies/bucket/cert lists), datapull.ts,
                          repository.ts (Supabase repository behind the store)
  lib/                    supabase.ts (client + isSupabaseConfigured), auth.ts (phone OTP calls),
                          phone.ts (E.164 normalize/validate)
  engine/                 commonality.ts (the matching engine), nudges.ts
  notifications/          push token registration, copy builders, tap-to-open deep links
  hooks/                  useReducedMotion
  nfc/                    tapConnect.ts — react-native-nfc-manager wrapper (native-only)
supabase/
  schema.sql              users, connections, nudges, pending_connections, requests tables + RLS
server/
  sendPush.ts             Backend push-send function (Expo Push API) — not yet wired to a live backend
```

## Architecture notes

- **Commonality engine (`src/engine/commonality.ts`)** is the single source of
  truth for "what you have in common". Screens compute it live from
  `currentUser` ↔ a connection's profile (so it updates as profiles grow);
  `Connection.commonalities` is not read. It scores all facets (top hobbies,
  hobbies, bucket list, certs, life experiences, travel, shared platforms, and
  V1.5 data-pull signals: artists/films/books/activities) and re-weights by
  connection type (friend/professional/acquaintance/romantic).
- **Store (`src/store/useStore.ts`)** seeds from `src/data/mock.ts`, persists a
  subset, and is the backbone backend/auth/NFC will plug into. Bump the persist
  `name` version when the persisted shape changes (currently `knowable-store-v8`).
  Auth session state lives separately in `src/store/useAuthStore.ts` (mirrors
  Supabase's session, not app/profile data).
- **NFC tap-to-connect (`src/nfc/tapConnect.ts`)** wraps `react-native-nfc-manager`;
  every export is `Platform.OS === 'web'`-guarded so the native module is never
  required on web (would crash — RNW has no `NativeModules.NfcManager`). `app/add.tsx`
  gates the whole bump flow on `settings.nfcEnabled`, scans one NDEF tag
  (`knowable:<personId>` text record), resolves the id against the local
  `newCandidates` mock pool (no backend yet — swap for a real directory lookup
  later), then requires an explicit **Connect** tap (mutual confirmation) before
  `addConnection` → `/icebreaker`. A cancelled/failed scan surfaces inline, never
  silently no-ops.
- **Push notifications (`src/notifications/`, `server/sendPush.ts`)** — the
  client registers/clears an Expo push token as the Settings `pushNudges` /
  `pushUpdates` toggles change (`app/_layout.tsx`), and routes a tapped
  notification's `data.connectionId` to that connection's profile. The backend
  send function (nudge/connection/new-commonality, Expo Push API) is real and
  deployable but has no live caller yet — it's the shape the backend (once
  built) calls after checking a recipient's stored settings.
- **Catalog (`src/data/catalog.ts`)** holds the curated, de-duplicated hobby /
  bucket-list / certification lists + item→section lookups. Don't re-paste these;
  edit the file.
- **Design system** = a clean functional skeleton with an expressive collage
  layer. Hard offset shadows (no blur — see `HardShadow`), subtle card tilt
  (±0.4–0.6°), tape/scraps/halftone, Space Grotesk, outline text via SVG. Never
  pure white (cream/off-white), yellow is accent-only, flat color blocks (no
  gradients). Keep decoration off readable text and off navigation.

## Supabase (optional backend)

The Zustand store (`src/store/useStore.ts`) can be backed by Supabase without
any screen or action changing, and passwordless phone auth (Auth → Providers →
Phone + Twilio) can gate the app once that data layer exists. Both are
entirely additive and opt-in via the same two env vars — with neither set,
the app behaves exactly as before (mock seed + AsyncStorage only, zero
network calls, no sign-in screen).

**Setup:**

1. Create a project at supabase.com (or use an existing one).
2. In the SQL editor, run `supabase/schema.sql` — creates `users`,
   `connections`, `nudges`, `pending_connections`, `requests`, with RLS enabled
   and permissive dev policies (see the file's RLS comment — there's no
   owner-scoping yet since sync is single-tenant; tighten before shipping
   with real multi-user accounts).
3. Copy `.env.example` to `.env.local` and fill in `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the project's Settings → API page.
4. To also enable phone sign-in, turn on Auth → Providers → Phone and set
   Twilio as the SMS provider — same two env vars, no extra config.
5. Restart Metro (`npx expo start -c` to clear the env cache).

**How it works:**

- `src/lib/supabase.ts` builds the client from the env vars; `isSupabaseConfigured`
  is false (client is `null`) when either is missing. Everything below — data
  sync and the auth gate — keys off this single flag.
- `src/data/repository.ts` maps between the store's TypeScript shapes and the
  Supabase row shapes (a connection's embedded `user` profile is stored as a
  `profile` jsonb column, not normalized — sync is single-tenant, so
  connections aren't necessarily linked to another `users` row).
- `useStore.ts` calls the repository in exactly two places, both additive:
  once at module load to hydrate remote state over the local/mock state (and
  to seed a fresh project from the mock data if it's empty), and once via
  `useStore.subscribe` to push each changed slice (user, connections, nudges,
  pending connections, requests) to Supabase in the background after every
  action. No store action was rewritten — this is why screens are unaffected.
- Sync is single-user / single-tenant (owner id is always the seeded `me`
  user's id) until real multi-user auth + owner-scoped RLS lands.
- **Auth gate (`app/_layout.tsx` + `src/store/useAuthStore.ts`):** when
  `isSupabaseConfigured` is true, `useAuthStore` subscribes to
  `supabase.auth.onAuthStateChange` and the root layout redirects every route
  to `/auth/phone` while signed out (except the auth screens themselves and
  the `claim/[id]` preview, which stays reachable per Spec §5C's "no account
  needed to preview" — only the claim action itself requires sign-in). When
  Supabase isn't configured, `useAuthStore.status` resolves straight to
  `'unconfigured'` and the gate is skipped entirely — the app runs exactly as
  it did before phone auth existed.

## Gotchas (learned the hard way)

- **Installs need `--legacy-peer-deps`.** Plain `npm install` aborts on a
  react/react-dom peer conflict. CI uses `npm ci --legacy-peer-deps`.
- **iOS build needs Xcode 16+** (RN 0.85 + New Architecture). Older Xcode = a
  flood of C++ compile errors.
- **Splash / blank screen:** the root layout hides the splash via the root
  view's `onLayout` + a ready gate with a 3s timeout. A JS reload does NOT reset
  a pinned native splash — if you edit `app/_layout.tsx` and the splash sticks,
  **cold-relaunch** the app (kill it in the simulator and reopen).
- **No `ios/` folder in git** (gitignored). Regenerate with
  `npx expo prebuild -p ios --clean`; bundle id is `com.knowable.app`.
- **NFC only works in a dev-client/prebuilt build on real hardware** — not in
  Expo Go (custom native module isn't present), not in the iOS/Android
  simulators (no NFC radio), not on web. `isNfcAvailable()` resolves `false`
  everywhere else so bump degrades to an in-app "NFC isn't available here"
  message instead of throwing. iOS also needs a paid Apple Developer account
  for the Core NFC entitlement to actually work on-device.
- **Yoga ≠ web layout:** the marquee single-line fix measures width off-screen
  and renders fixed-width copies because `alignSelf`/`numberOfLines` shrink-wrap
  differently than on web. Watch for similar web-vs-native layout gaps.
- **Push tokens need an EAS project id.** `getExpoPushTokenAsync` wants
  `extra.eas.projectId` in `app.json`; there isn't one yet (no EAS project
  configured), so `registerForPushTokenAsync` fails closed (returns `null`)
  rather than throwing. Real device tokens will start flowing once EAS is set up.

## Git / workflow

- Work on branch **`claude/react-native-app-build-swtzi8`**; PR **#1** targets `main`.
- Commit + push when a unit of work is done and verified. Keep sessions scoped to
  one milestone; start a fresh session for the next (the repo is the context).

## Not built yet

Multi-user accounts (owner-scoped RLS), live data-pull integrations (currently
simulated in `src/data/datapull.ts`). Types are shaped to accommodate these.

NFC bump (`src/nfc/tapConnect.ts`) is real — it scans an actual NDEF tag via
`react-native-nfc-manager` — but the id it reads is still resolved against the
local `newCandidates` mock pool rather than a backend directory, since there's
no multi-user backend yet.

Local nudge reminders ARE wired (`src/engine/notifications.ts` +
`src/hooks/useNudgeReminders.ts`): expo-notifications schedules an on-device
reminder per connection's `nextNudge`, gated by the "Nudge reminders" setting
and OS permission. Native-only (no-op on web), so it doesn't affect the web
bundle/CI.

Push notifications are scaffolded (`src/notifications/`, `server/sendPush.ts`)
but not wired to a live backend — no EAS project id (so `registerForPushTokenAsync`
fails closed), no server calling `sendPush.ts` yet.

A Supabase-backed data layer and passwordless phone auth both exist (see
above) but are single-tenant / keyed to a fixed dev user — multi-user support
needs Supabase Auth-driven, owner-scoped RLS policies (today's policies are
permissive dev defaults, not per-user).
