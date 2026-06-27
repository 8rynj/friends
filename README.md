# Knowable

> Show up for the people worth keeping.

Knowable helps people turn good conversations into real friendships — capturing
every meaningful connection, surfacing what you have in common, and nudging
timely follow-up so connections don't fade before they form.

This is the React Native (Expo) app. This first build establishes the
collage/zine **design system** and the four hero screens wired with **mock
data** — no backend, auth, or NFC yet (those are dedicated later milestones).

## Stack

- **Expo** (SDK 56) + **TypeScript**
- **Expo Router** — file-based navigation (`app/`)
- **react-native-svg** — ripped paper edges, halftone decorations, outline text
- **react-native-reanimated** — bump collision, card entrance/reveal, marquee
- **Space Grotesk** (`@expo-google-fonts/space-grotesk`) — used everywhere

## Getting started

```bash
npm install
npx expo start          # then press i / a, or scan with a dev build
npx expo start --web    # run in the browser
```

> NFC (the core bump mechanic) requires a custom **dev build**, not Expo Go.
> It is not yet wired up in this build.

## Project structure

```
app/                      Expo Router routes
  _layout.tsx             Root stack — loads fonts, registers screens
  (tabs)/                 Bottom navigation
    _layout.tsx           Custom collage tab bar
    index.tsx             Home
    connections.tsx       People (full connection list)
    you.tsx               Your own profile
  onboarding/index.tsx    Onboarding (dark mode)
  connection/[id].tsx     Connection profile
  icebreaker.tsx          Post-bump icebreaker
src/
  theme/                  colors, typography, layout/motion tokens
  components/             collage design-system primitives
  data/                   types (mirrors the spec data model) + mock data
  hooks/                  useReducedMotion
```

## Design system

The look is a "collage and zine" aesthetic: a clean functional skeleton with an
expressive layer on top. The primitives in `src/components` encode the rules
from the design guidelines so screens stay declarative:

- **HardShadow** — hard, zero-blur offset shadows (the core visual signature),
  implemented as a solid offset layer because RN shadows always blur.
- **CollageCard** — bordered, slightly tilted cards with alternating brand
  backgrounds and optional tape.
- **Tape / PaperScrap / HalftoneEye / Sticker** — the handmade collage motifs.
- **RippedEdge** — SVG ripped-paper dividers between hero and content.
- **OutlineText** — SVG stroked text (RN has no `-webkit-text-stroke`).
- **Hero, Avatar, Pill, Button, Marquee, Fab, ProgressBar, HobbyChip**.

Colors, type scale, spacing, radii, shadow offsets and motion timings live in
`src/theme`. Reference roles there rather than raw hex.

## Not yet built (future milestones)

SMS magic-link auth · NFC bump · SMS/search connect · deep-link claim flow ·
push notifications · spaced-repetition nudge engine · V1.5 data-pull
integrations · backend/persistence. The data model types in `src/data/types.ts`
are already shaped to accommodate these (including `connectionType`, modeled now
to avoid a painful retrofit later).
