# App Store screenshot candidates

These five PNGs (`01-home.png` … `05-you.png`) were captured from the app's
**web build** (`npx expo start --web`, mock data, no sign-in) via a headless
Chromium at a 440×956 viewport / 3x device scale factor — i.e. exactly
**1320×2868px**, the pixel dimensions Apple requires for the 6.9" display
size class (iPhone 16 Pro Max and similar). They show real app UI (design
system, copy, mock data) exactly as React Native Web renders it, not mockups.

## Before submitting

1. **Recapture from an iOS Simulator or device for the final assets.**
   React Native Web and the native renderer are visually very close (same
   component tree, same design-system primitives) but not pixel-identical —
   fonts, safe-area insets, and the status bar/home-indicator chrome differ.
   Apple's screenshot checker is strict about exact per-device-class
   dimensions; the simplest reliable path is `npx expo run:ios --device` (or
   simulator) at each required size class, then
   **Xcode → Simulator → File → Save Screen** (⌘S), or Simulator's own
   screenshot shortcut. This needs macOS + Xcode 16+, which isn't available
   in this environment (same constraint as 2A/1C).
2. **Required size classes** (as of this writing — App Store Connect will
   confirm the current requirements at upload time):
   - 6.9" (iPhone 16 Pro Max class): 1320×2868 — these files match this size.
   - 6.5" (iPhone 14 Plus/13 Pro Max class): 1284×2778 or 1242×2688.
   - iPad 13" (if supporting iPad — `app.json`'s `ios.supportsTablet` is
     `true`): 2064×2752 or 2048×2732.
   App Store Connect auto-generates smaller size classes from the largest
   uploaded if you don't provide every size, but double-check before relying
   on that.
3. **Order matters** — the first 2-3 screenshots get the most visibility in
   search results. Current order: Home (nudges/pending requests) →
   Connections list → Connection profile (commonalities) → Icebreaker (the
   "aha" moment) → Your profile. Reorder if a different story tests better.
4. Consider adding marketing captions/device-frame overlays (common on the
   App Store) — these five are unframed, content-only captures. Tools like
   Xcode's own screenshot framing or a design tool can add device bezels +
   headline text on top of these if desired; not done here since it's a
   styling choice, not a compliance requirement.

## Regenerating

```bash
npx expo start --web --port 8090 &
node <script using Playwright at viewport 440x956, deviceScaleFactor 3>
```

The capture script used isn't checked in (it was a one-off in the session
scratch directory); the routes captured were `/`, `/connections`,
`/connection/sarah`, `/icebreaker?id=sarah`, and `/you` against the seeded
mock data (`src/data/mock.ts`).
