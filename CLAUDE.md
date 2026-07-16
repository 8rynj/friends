# Knowable — project guide for Claude

Knowable helps people turn good conversations into real friendships: capture a
connection when you meet (NFC bump / search / SMS invite), surface what you have
in common as icebreakers, and nudge timely follow-up. This repo is the React
Native (Expo) app. It currently runs on **mock data** (no backend/auth yet).

## Stack

- **Expo SDK 56**, **React Native 0.85**, **React 19**, **TypeScript**
- **Expo Router** (file-based, `app/`)
- **Zustand** + **AsyncStorage** for state/persistence (`src/store/useStore.ts`)
- **react-native-svg** (outline text, halftone, icons), **react-native-reanimated**
  (animations; needs `react-native-worklets`), **expo-haptics**, **expo-font**
- **expo-notifications** + **expo-device** for push registration/deep links
  (`src/notifications/`); the backend send function lives in `server/`
- **Space Grotesk** via `@expo-google-fonts/space-grotesk` — used everywhere

## Run & verify

```bash
npm install --legacy-peer-deps     # the flag is REQUIRED (SDK 56 react/react-dom peer mismatch)
npx expo start                     # Metro; press i (iOS), w (web)
npx expo run:ios                   # full native build + simulator (needs macOS + Xcode 16+)
```

Fast verification loop used in this project (no device needed):

```bash
npx tsc --noEmit                                   # typecheck
EXPO_OFFLINE=1 CI=1 npx expo export --platform web # bundles every route via Metro — catches import/runtime errors
```

CI (`.github/workflows/ci.yml`) runs exactly those two on every PR. There is no
test runner yet.

**Cost note:** prefer typecheck + web bundle + text assertions for verification;
screenshots are token-expensive — only use them for genuinely visual changes.

## Project structure

```
app/                      Expo Router routes
  _layout.tsx             Root stack; loads fonts; hides splash (see gotchas)
  (tabs)/                 Bottom nav: index (Home), connections (People), you (You)
  onboarding/index.tsx    4-step dark-mode onboarding (name → hobbies → top 5 → handles)
  connection/[id].tsx     Connection profile (commonalities, cadence, type, mutuals)
  icebreaker.tsx          Post-bump / post-connect commonalities
  add.tsx, find.tsx, invite.tsx, claim/[id].tsx   Connect flows (bump/search/SMS/claim)
  connect.tsx             V1.5 data-pull manager (simulated)
  edit/[facet].tsx        Parametrized profile-section editor
  settings.tsx            Settings & privacy
src/
  theme/                  colors, typography, layout/motion tokens (reference roles, not hex)
  components/             collage design-system primitives + UI (barrel: index.ts)
  data/                   types.ts, mock.ts, catalog.ts (hobbies/bucket/cert lists), datapull.ts
  engine/                 commonality.ts (the matching engine), nudges.ts
  notifications/          push token registration, copy builders, tap-to-open deep links
  hooks/                  useReducedMotion
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
  `name` version when the persisted shape changes (currently `knowable-store-v6`).
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

SMS magic-link auth, real NFC bump, backend/persistence, live data-pull
integrations (currently simulated in `src/data/datapull.ts`), unit tests.
Push notifications are scaffolded (`src/notifications/`, `server/sendPush.ts`)
but not wired to a live backend — no EAS project id, no server calling
`sendPush.ts` yet. Types are shaped to accommodate these.
