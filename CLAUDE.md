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
  (Node-callable reference) and its live deployed counterpart is a Supabase
  Edge Function (`supabase/functions/send-push/`)
- **posthog-react-native** (product analytics) + **@sentry/react-native**
  (crash/error reporting) — both configured via `EXPO_PUBLIC_*` env vars and
  no-ops when unset (`src/lib/analytics.ts`, `src/lib/sentry.ts`)
- **expo-auth-session** + **expo-web-browser** (OAuth Authorization Code +
  PKCE for real data-pull adapters) + **expo-crypto** (PKCE verifier/challenge)
  + **expo-secure-store** (Keychain/Keystore-backed token storage) —
  `src/data/oauth/`, `src/lib/secureStore.ts`
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
    adapters/             Real per-platform data-pull adapters: letterboxd.ts (public RSS,
                          no auth), spotify.ts (OAuth via oauth/), strava.ts (OAuth via oauth/)
    oauth/                Reusable OAuth base for adapters: authorizationCode.ts (Authorization
                          Code + PKCE flow), pkce.ts (verifier/challenge), tokenStore.ts
                          (per-source token persistence on secureStore.ts)
  lib/                    supabase.ts (client + isSupabaseConfigured), auth.ts (phone OTP calls),
                          phone.ts (E.164 normalize/validate), analytics.ts (PostHog),
                          sentry.ts (crash reporting), secureStore.ts (Keychain/Keystore-backed
                          key-value store, web falls back to AsyncStorage)
  engine/                 commonality.ts (the matching engine), nudges.ts
  notifications/          push token registration, copy builders, tap-to-open deep links
  hooks/                  useReducedMotion
  nfc/                    tapConnect.ts — react-native-nfc-manager wrapper (native-only)
supabase/
  migrations/             0001_baseline.sql, 0002_extend.sql — real multi-user
                          schema (profiles, connections, connection_members,
                          contact_log, handles, nudges, pending_connections,
                          requests) with auth.uid()-scoped RLS + RPCs;
                          0003_connect_creation.sql — NFC/search/SMS connect
                          creation RPCs; 0004_push_notifications.sql —
                          push_tokens table + triggers/cron that dispatch to
                          the send-push edge function (see below)
  functions/send-push/    Edge function: looks up a recipient's settings +
                          device tokens and calls the Expo Push API — the
                          live counterpart of server/sendPush.ts (see
                          "Push notifications (server-driven)" below)
server/
  sendPush.ts             Node-callable reference push-send function (Expo Push API);
                          supabase/functions/send-push/ is what's actually deployed
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
- **Push notifications (`src/notifications/`, `server/sendPush.ts`,
  `supabase/functions/send-push/`, `supabase/migrations/0004_push_notifications.sql`)**
  — the client registers/clears an Expo push token as the Settings
  `pushNudges` / `pushUpdates` toggles change (`app/_layout.tsx`), the store's
  Supabase sync subscriber (`src/store/useStore.ts`) pushes that token to the
  `push_tokens` table whenever it changes (`src/data/repository.ts`'s
  `savePushTokenRemote`, keyed by token so re-registering on a reused device
  reassigns ownership), and a tapped notification's `data.connectionId` routes
  to that connection's profile (`useNotificationDeepLinks`). Server-side,
  0004's `confirm_connection` (new connections), `profiles` update trigger
  (new commonalities — diffs a profile's self-reported facets old vs new
  against each connection's other side) and a 15-minute `pg_cron` job (due
  nudges) all fire-and-forget POST to `supabase/functions/send-push/` via
  `pg_net`, which looks up the recipient's settings/tokens with the service
  role key and calls the Expo Push API — see "Push notifications
  (server-driven)" below for the one-time deploy/config steps a human needs
  to run against a live project (same shape of gap as 2A). `server/sendPush.ts`
  stays as the Node-callable reference implementation the edge function
  mirrors (Edge Functions run in an isolated Deno bundle, so it can't import
  the RN app's TS tree directly — keep nudge/connection/commonality copy in
  sync between `src/notifications/copy.ts` and the edge function if it changes).
- **Analytics + crash reporting (`src/lib/analytics.ts`, `src/lib/sentry.ts`)**
  — both configured entirely through `EXPO_PUBLIC_*` env vars (see
  `.env.example`) and no-ops when unset, same pattern as Supabase.
  `initSentry()` runs at module load in `app/_layout.tsx` (before any render);
  `ErrorBoundary` reports caught render errors via `captureException`. Four
  key product events are tracked at their single source of truth: `connect_made`
  (`{ method: 'nfc' | 'search' | 'sms' }`, every path in `useStore.ts` that
  creates a connection — NFC confirm, search send/accept, SMS claim),
  `nudge_acted_on` (`{ response }`, `respondToNudge`), `data_pull_connected`
  (`{ source }`, `connectDataPull`), and `onboarding_completed`
  (`app/onboarding/index.tsx`'s `finish()`). Analytics identity is tied to the
  auth session in `app/_layout.tsx` (`identifyUser`/`resetAnalytics`).
- **Data pull (`src/data/datapull.ts`, `src/data/adapters/`, `src/data/oauth/`)**
  — `runDataPull(source, input)` is what screens call; it routes to a real
  adapter when one exists and is usable, else falls back to `simulatePull`
  (still the only path for Bandsintown/Polarsteps/LinkedIn).
  Letterboxd (`adapters/letterboxd.ts`) reads a member's public RSS diary feed
  — no auth, since Letterboxd's real API is by-application-only. Goodreads
  (`adapters/goodreads.ts`) is the same shape — Amazon closed the Goodreads
  Developer API to new applicants in 2020, so it reads a member's public
  `currently-reading`/`read` shelf RSS feeds (keyed by the numeric user id in
  their profile URL) instead of calling an API. Spotify
  (`adapters/spotify.ts`) and Strava (`adapters/strava.ts`) both run a real
  Authorization Code OAuth flow on the reusable base in `src/data/oauth/`:
  `authorizationCode.ts` opens the provider's consent screen via
  `expo-web-browser`'s `openAuthSessionAsync` (`ASWebAuthenticationSession` on
  iOS / Custom Tabs on Android) and redirects back through the app's
  `knowable://` scheme, `pkce.ts` generates the verifier/challenge via
  `expo-crypto`, and `tokenStore.ts` persists the resulting access/refresh
  tokens through `src/lib/secureStore.ts` (Keychain/Keystore on native;
  AsyncStorage on web, where there's no equivalent secure-at-rest API — fine
  for the CI web-bundle check, the shipped app is native). Spotify is a pure
  PKCE public-client flow (`isSpotifyConfigured` needs only
  `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`, no secret ships in the app); Strava's token
  endpoint has no PKCE-only option and requires `client_secret` on every
  exchange/refresh (`OAuthProviderConfig.clientSecret`,
  `isStravaConfigured` needs both `EXPO_PUBLIC_STRAVA_CLIENT_ID` and
  `EXPO_PUBLIC_STRAVA_CLIENT_SECRET`) — that secret ships in the app bundle
  like any `EXPO_PUBLIC_*` var, the same trade-off every mobile Strava
  integration makes absent a backend proxy. Every adapter throws a typed
  `*Error` with a user-facing message on failure (network down, auth
  cancelled, profile private/empty, ...) rather than silently substituting
  simulated data under the user's real identity — `connectDataPull`
  (`useStore.ts`) surfaces it to `app/connect.tsx` instead of writing
  anything to the profile. The OAuth base is provider-agnostic — the
  remaining adapters (ROADMAP 3B: Bandsintown/Polarsteps/LinkedIn) reuse
  `oauth/` rather than hand-rolling their own token-exchange/refresh, unless
  (like Letterboxd/Goodreads) a public-profile feed turns out to fit better.
- **Catalog (`src/data/catalog.ts`)** holds the curated, de-duplicated hobby /
  bucket-list / certification lists + item→section lookups. Don't re-paste these;
  edit the file.
- **Design system** = a clean functional skeleton with an expressive collage
  layer. Hard offset shadows (no blur — see `HardShadow`), subtle card tilt
  (±0.4–0.6°), tape/scraps/halftone, Space Grotesk, outline text via SVG. Never
  pure white (cream/off-white), yellow is accent-only, flat color blocks (no
  gradients). Keep decoration off readable text and off navigation.

## Supabase (real multi-user backend)

The Zustand store (`src/store/useStore.ts`) is backed by a real, normalized,
multi-user Supabase schema — passwordless phone auth (Auth → Providers →
Phone + Twilio) gates the app, and every table is scoped to `auth.uid()` via
RLS, not a fixed dev user. It's still opt-in via the same two env vars — with
neither set, the app behaves exactly as it always has (mock seed + AsyncStorage
only, zero network calls, no sign-in screen) — but once configured, it's live,
not a demo.

**Setup:**

1. Create a project at supabase.com (or use an existing one).
2. In the SQL editor, run `supabase/migrations/0001_baseline.sql` then
   `supabase/migrations/0002_extend.sql`, in order. Both are idempotent
   (`create table if not exists`, `create or replace function`, drop-then-create
   for policies) — safe to re-run.
3. Copy `.env.example` to `.env.local` and fill in `EXPO_PUBLIC_SUPABASE_URL` /
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the project's Settings → API page.
4. Turn on Auth → Providers → Phone and set Twilio as the SMS provider — phone
   sign-in is required for sync (RLS has no anonymous access path).
5. Restart Metro (`npx expo start -c` to clear the env cache).

**Schema (`supabase/migrations/`):** `profiles` (`id = auth.uid()`, one row per
user — `handle_new_user()` auto-creates a stub on signup), `connections` (one
canonical row per pair, `user_a < user_b`), `connection_members` (the per-side
view — type/cadence/sharing/archive/outreach state, since two people can see
the same connection differently), `contact_log`, `handles`, `nudges`,
`pending_connections` (SMS-invite tokens), `requests` (Search send/accept
handshake). Multi-table invariants go through `security definer` RPCs rather
than raw client writes: `confirm_connection` (create/find a connection, seed
its nudge sequence), `log_outreach` (log contact + advance `next_nudge` from
cadence), `accept_request`, `search_profiles`.

**How it works:**

- `src/lib/supabase.ts` builds the client from the env vars; `isSupabaseConfigured`
  is false (client is `null`) when either is missing.
- `src/data/repository.ts` maps between the store's TypeScript shapes and the
  normalized row shapes — joining `connection_members` + `connections` +
  `profiles` + `contact_log` to reconstruct a `Connection`, since the other
  person's profile is a real linked row now, not an embedded snapshot.
- **Sync is gated on a real signed-in session, not just `isSupabaseConfigured`**
  — every RLS policy keys off `auth.uid()`, so there's nothing valid to read/write
  before sign-in. `app/_layout.tsx` calls `useStore.ts`'s `startSupabaseSync(userId)`
  once `useAuthStore` reports `signedIn` (and sets the store's `user.id` to that
  same `auth.uid()`, since `profiles.id` must match it), and `stopSupabaseSync()`
  on sign-out — see `settings.tsx`'s `signOut`, which stops sync *before* resetting
  local state so the mock-seed reset never reads as real deletes.
- `connections`/`nudges`/`pendingConnections` are **read-hydrated, not pushed
  wholesale**: they can only be populated by a real counterpart going through
  `confirm_connection`, so the repository never manufactures them from local/mock
  state. Per-action edits push their specific change instead (cadence/type/archived
  → `connection_members` update; `logOutreach` → the RPC; `respondToNudge` →
  `nudges` update; new/cancelled invites → `pending_connections` insert/delete).
  `profiles` (this user's own row) is the exception and stays a full push-on-change
  mirror, upserted on first load if missing.
- **Auth gate (`app/_layout.tsx` + `src/store/useAuthStore.ts`):** when
  `isSupabaseConfigured` is true, `useAuthStore` subscribes to
  `supabase.auth.onAuthStateChange` and the root layout redirects every route
  to `/auth/phone` while signed out (except the auth screens themselves and
  the `claim/[id]` preview, which stays reachable per Spec §5C's "no account
  needed to preview" — only the claim action itself requires sign-in). When
  Supabase isn't configured, `useAuthStore.status` resolves straight to
  `'unconfigured'` and the gate is skipped entirely — the app runs exactly as
  it did before phone auth existed.
- **NFC bump, Search send/accept, and SMS-invite claim are wired to the real
  backend** when signed in (`src/store/useStore.ts`'s `previewCandidate`/
  `confirmNfcConnection`, `sendConnectRequest`/`acceptIncoming`/
  `ignoreIncoming`, `claimInviteByToken`) — see
  `supabase/migrations/0003_connect_creation.sql` for the RPCs
  (`get_profile_preview`, `list_incoming_requests`,
  `preview_pending_connection`, `claim_pending_connection`, plus
  `confirm_connection`/`accept_request` gaining `method`/`met_context`). Each
  action falls back to the local mock pool (`src/data/mock.ts`) when
  `activeOwnerId` is unset (Supabase not configured, or signed out) — the
  offline/demo experience is unchanged. A real connect needs a **second real
  account** to bump/search/claim against (see "Git / workflow" below for how
  to test that).

## Analytics + crash reporting (optional)

Both are opt-in via env vars, exactly like Supabase — with none set, the app
runs with zero analytics/error-reporting network calls, same as today.

**PostHog:**

1. Create a project at posthog.com (or use an existing one).
2. Copy `.env.example` to `.env.local` (if you haven't already for Supabase)
   and fill in `EXPO_PUBLIC_POSTHOG_API_KEY` from Project Settings → API Keys.
   Set `EXPO_PUBLIC_POSTHOG_HOST` too if you're on EU Cloud or self-hosted
   (defaults to PostHog Cloud US).
3. Restart Metro (`npx expo start -c`).

**Sentry:**

1. Create a project at sentry.io (React Native platform).
2. Fill in `EXPO_PUBLIC_SENTRY_DSN` from Settings → Projects → \<project\> →
   Client Keys (DSN).
3. Restart Metro.

Neither wires up `@sentry/react-native`'s Expo config plugin (native
build-time source-map upload) — that needs a Sentry auth token + org/project
slugs and only matters once real builds exist (same "needs a human + EAS
project" shape as 2A/2B); add `@sentry/react-native/expo` to `app.json` →
`plugins` when that's set up.

## EAS Build & TestFlight (iOS)

`eas.json` (development/preview/production build profiles + a `submit.production.ios`
block) is checked in. **`eas init` hasn't been run against a real Expo account
yet**, so `app.json` has no `extra.eas.projectId` — that's the one piece that
requires a human with an Expo account and a paid Apple Developer Program
membership; nothing in this environment can complete it. Everything else
(profiles, scripts, signing config shape) is ready to go. `eas.json`'s
`submit.production.ios` still has `YOUR_APPLE_ID_EMAIL` / `YOUR_APP_STORE_CONNECT_APP_ID`
/ `YOUR_APPLE_TEAM_ID` placeholders — fill those in (or switch to an App Store
Connect API key, see step 4) before the first real submit.

**One-time setup (run locally, needs an Expo account + Apple Developer Program):**

1. `npx eas-cli login` — sign in to (or create) an Expo account.
2. `npx eas-cli init` — creates the EAS project and writes
   `extra.eas.projectId` into `app.json` automatically (this is also what
   unblocks the "Push tokens need an EAS project id" gotcha below).
3. In App Store Connect, create the app record for bundle id
   `com.knowable.app` (Apps → + → New App) if it doesn't exist yet. Note its
   Apple ID number (App Information page) for `ascAppId`, and your Team ID
   (developer.apple.com → Membership) for `appleTeamId`.
4. Fill in `eas.json`'s `submit.production.ios` with those values. For
   non-interactive/repeatable submits, prefer an App Store Connect API key
   over an Apple ID + password: App Store Connect → Users and Access →
   Integrations → generate a key, download the `.p8` (never commit it — already
   gitignored), and set `ascApiKeyPath`/`ascApiKeyId`/`ascApiKeyIssuerId`
   instead of `appleId`.

**Build + submit:**

```bash
npm run build:ios:production   # eas build --platform ios --profile production
                                # first run offers to let EAS generate/manage the
                                # Distribution Certificate + App Store provisioning
                                # profile for com.knowable.app — accept it (recommended)
npm run submit:ios              # eas submit --platform ios --profile production
                                 # uploads the .ipa to App Store Connect; it shows up
                                 # under TestFlight after Apple finishes processing
                                 # (usually minutes). Add internal testers there.
```

**Fast internal testing without waiting on TestFlight processing** — the
`preview` profile builds an ad-hoc, internally-distributed IPA (register
tester devices first):

```bash
npx eas-cli device:create        # register each tester's device UDID once
npm run build:ios:preview        # eas build --platform ios --profile preview
                                  # gives an install link/QR per build
```

`build:ios:dev-client` (`eas build --platform ios --profile development`) is
the cloud equivalent of `npx expo run:ios --device` — use it for the NFC
on-device dev-client build instead of a local Xcode build.

## Push notifications (server-driven)

The client side (registration, Settings gate, deep links) and the schema/
edge-function code (`supabase/migrations/0004_push_notifications.sql`,
`supabase/functions/send-push/`) are both done — see the "Push notifications"
architecture note above. Two things still need a human against a live
project, neither doable from a sandbox:

1. **An EAS project id (2A).** `getExpoPushTokenAsync` returns `null` until
   `eas init` writes `extra.eas.projectId` into `app.json` — see "EAS Build &
   TestFlight" above. Without it, devices never get a real Expo push token,
   so `push_tokens` stays empty regardless of everything else here.
2. **Deploying the edge function + two Vault secrets**, so Postgres knows
   where to send the fire-and-forget `pg_net` calls 0004's triggers/cron make:
   ```bash
   npx supabase login                              # once, needs a Supabase account
   npx supabase link --project-ref <your-project-ref>
   npx supabase functions deploy send-push
   ```
   Then, in the SQL editor (or `supabase db push` after step 3):
   ```sql
   select vault.create_secret('https://<your-project-ref>.functions.supabase.co', 'edge_function_base_url');
   select vault.create_secret('<service_role_key from Settings > API>', 'edge_function_service_key');
   ```
3. Run `supabase/migrations/0004_push_notifications.sql` (idempotent, like
   the prior migrations) — it enables `pg_net`/`pg_cron`, adds `push_tokens`,
   and wires the three dispatch paths. Until step 2's secrets exist,
   `_dispatch_push` no-ops rather than erroring, so running 0004 before
   deploying the function is safe.

Once all three are done, pushes are live: `confirm_connection` fires a
`connection` push immediately, a `profiles` update trigger fires a
`commonality` push immediately, and a 15-minute cron job fires `nudge`
pushes for anything due.

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
  `extra.eas.projectId` in `app.json`; `eas init` hasn't been run against a real
  Expo account yet (see "EAS Build & TestFlight" above), so it's still missing
  and `registerForPushTokenAsync` fails closed (returns `null`) rather than
  throwing. Real device tokens will start flowing once `eas init` runs.
- **Spotify OAuth needs a redirect URI registered on the Spotify app.** Add
  `knowable://spotify-auth-callback` as a Redirect URI in the Spotify
  Developer Dashboard for the app behind `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`, or
  the consent screen will redirect back to a URI Spotify rejects.
- **Strava OAuth needs both a Client ID and Secret, and a callback domain.**
  Strava's `/oauth/token` has no PKCE-only path (see the "Data pull"
  architecture note), so `EXPO_PUBLIC_STRAVA_CLIENT_SECRET` is required
  alongside `EXPO_PUBLIC_STRAVA_CLIENT_ID` — Strava won't issue tokens with
  just the PKCE verifier. Register `knowable` as the Authorization Callback
  Domain at strava.com/settings/api.

## Git / workflow

- All prior parallel feature branches have been consolidated onto `main`.
  Work directly against `main` (or a short-lived feature branch off it) going
  forward.
- Commit + push when a unit of work is done and verified. Keep sessions scoped to
  one milestone; start a fresh session for the next (the repo is the context).

## Not built yet

Most live data-pull integrations are still simulated in `src/data/datapull.ts`
— Bandsintown, Polarsteps, LinkedIn have no real adapter yet. Letterboxd,
Goodreads, Spotify, and Strava are real (see the "Data pull" architecture
note above); types were already shaped to accommodate the rest. (Multi-user
accounts, owner-scoped `auth.uid()` RLS, and connection *creation* against the
real directory — NFC bump, Search send/accept, SMS-invite claim — are all
**built**; see the Supabase section above.)

NFC bump (`src/nfc/tapConnect.ts`) is real — it scans an actual NDEF tag via
`react-native-nfc-manager` — and the id it reads resolves against the real
directory (`get_profile_preview` + `confirm_connection`) when signed in, or
the local `newCandidates` mock pool otherwise.

Local nudge reminders ARE wired (`src/engine/notifications.ts` +
`src/hooks/useNudgeReminders.ts`): expo-notifications schedules an on-device
reminder per connection's `nextNudge`, gated by the "Nudge reminders" setting
and OS permission. Native-only (no-op on web), so it doesn't affect the web
bundle/CI.

Push notifications are fully wired (`src/notifications/`, `src/data/repository.ts`
push_tokens sync, `supabase/migrations/0004_push_notifications.sql`,
`supabase/functions/send-push/`) but not yet live — no EAS project id (so
`registerForPushTokenAsync` fails closed, `push_tokens` stays empty) and the
edge function/migration haven't been deployed against a live project; see
"Push notifications (server-driven)" above for the two remaining human steps.

An on-device QA pass with the live backend + a second real account (bump,
search send/accept, SMS invite/claim end to end) hasn't been run yet — the
wiring is verified by typecheck/tests/web bundle only, not a physical device.
