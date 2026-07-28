/**
 * Knowable color system — Design Guidelines §2.
 *
 * Colors are used in large flat blocks, never as subtle accents and never as
 * gradients. Black is the sole dark workhorse (navy and near-black are now the
 * same hex); everything else is accent. Never use pure white — cream only.
 *
 * `navy`/`nearBlack` and `cream`/`offWhite` are intentionally identical pairs
 * of keys — kept separate because call sites reference them by role (dominant
 * vs. border, background vs. text-on-dark), not because the colors differ.
 * `yellow` and `orange` keep their historical key names but no longer hold
 * yellow/orange hex values — see each key's comment.
 */

export const palette = {
  /** Dominant color. Hero backgrounds, primary cards, active states. Same hex as nearBlack. */
  navy: '#000000',
  /** All borders, shadows, dark cards, FAB background, text on light. */
  nearBlack: '#000000',
  /** App background / paper base. Light card surfaces. Never pure white. */
  cream: '#F2F0D2',
  /** Accent ONLY — tape, badges, highlights, CTAs. Never dominant. Light blue, despite the key name. */
  yellow: '#A0CEEE',
  /** Destructive actions, "due" states, paper scraps, decorative pops. Coral, despite the key name. */
  orange: '#F4845C',
  /** Text on dark surfaces. Light avatar backgrounds. Secondary light surface. Same hex as cream. */
  offWhite: '#F2F0D2',
  /** Minor decorative accent ONLY — tape, paper scraps. A true yellow, unlike the `yellow` key above. Never for functional UI (buttons, chips, badges) — those stay on the verified-contrast roles. */
  paperYellow: '#FFE484',
} as const;

/** Translucent variants used by collage motifs (tape, scraps, halftone). */
export const alpha = {
  /** Yellow tape on light backgrounds (0.85 opacity per §4.3). */
  tapeOnLight: 'rgba(255, 228, 132, 0.85)',
  /** Light tape on dark backgrounds (§4.3). */
  tapeOnDark: 'rgba(242, 240, 210, 0.3)',
  /** Tape border. */
  tapeBorder: 'rgba(0, 0, 0, 0.15)',
  /** Paper scrap border (§4.5). */
  scrapBorder: 'rgba(0, 0, 0, 0.2)',
} as const;

/**
 * Semantic role mapping. Screens reference roles, not raw hex, so the rules
 * in §9 ("What Not To Do") are enforced centrally.
 */
export const colors = {
  ...palette,

  // Surfaces
  appBg: palette.cream,
  appBgDark: palette.nearBlack, // onboarding only (§2 dark mode)

  // Borders & shadows — always near-black or navy, never soft gray (§4.1).
  // shadowBlue is kept as a distinct role for call sites that want "the
  // dominant-color shadow" but currently renders identically to `shadow`
  // since navy and nearBlack share a hex.
  border: palette.nearBlack,
  shadow: palette.nearBlack,
  shadowBlue: palette.navy,

  // Text
  textOnLight: palette.nearBlack,
  textOnDark: palette.offWhite,
  textMutedOnDark: 'rgba(242, 240, 210, 0.55)',
  textMutedOnLight: 'rgba(0, 0, 0, 0.55)',
} as const;

/**
 * Card background rotation for stacks — cream → dark → accent (§5). Only 3
 * entries: navy and nearBlack share a hex, so a 4th slot would just repeat
 * the dark card and skew the rotation.
 */
export const cardBackgrounds = [
  palette.cream,
  palette.nearBlack,
  palette.yellow,
] as const;

export type CardBg = (typeof cardBackgrounds)[number];

/**
 * Returns appropriate text color for a given card background. Only navy /
 * nearBlack are dark surfaces in this palette — cream, the accent (yellow
 * key) and the destructive color (orange key) are all light enough to need
 * dark text.
 */
export function textOn(bg: string): string {
  if (bg === palette.navy || bg === palette.nearBlack) {
    return colors.textOnDark;
  }
  return colors.textOnLight;
}
