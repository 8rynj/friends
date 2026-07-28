/**
 * Knowable color system — Design Guidelines §2.
 *
 * Colors are used in large flat blocks, never as subtle accents and never as
 * gradients. Navy and near-black are the workhorses; everything else is accent.
 * Never use pure white — cream / off-white only.
 */

export const palette = {
  /** Dominant color. Hero backgrounds, primary cards, active states. */
  navy: '#1A3A6B',
  /** All borders, shadows, dark cards, FAB background, text on light. */
  nearBlack: '#1a1a1a',
  /** App background / paper base. Light card surfaces. Never pure white. */
  cream: '#F0EBE0',
  /** Accent ONLY — tape, badges, highlights, CTAs on dark. Never dominant. */
  yellow: '#E8C547',
  /** Destructive actions, "due" states, paper scraps, decorative pops. */
  orange: '#D85A30',
  /** Text on dark surfaces. Light avatar backgrounds. Secondary light surface. */
  offWhite: '#F5F0E8',
} as const;

/** Translucent variants used by collage motifs (tape, scraps, halftone). */
export const alpha = {
  /** Yellow tape on light backgrounds (0.85 opacity per §4.3). */
  tapeOnLight: 'rgba(232, 197, 71, 0.85)',
  /** Light tape on dark backgrounds (§4.3). */
  tapeOnDark: 'rgba(245, 240, 232, 0.3)',
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

  // Borders & shadows — always near-black or navy, never soft gray (§4.1)
  border: palette.nearBlack,
  shadow: palette.nearBlack,
  shadowBlue: palette.navy,

  // Text
  textOnLight: palette.nearBlack,
  textOnDark: palette.offWhite,
  textMutedOnDark: 'rgba(245, 240, 232, 0.55)',
  textMutedOnLight: 'rgba(26, 26, 26, 0.55)',
} as const;

/** Card background rotation for stacks — cream → dark → yellow → navy (§5). */
export const cardBackgrounds = [
  palette.cream,
  palette.nearBlack,
  palette.yellow,
  palette.navy,
] as const;

export type CardBg = (typeof cardBackgrounds)[number];

/** Returns appropriate text color for a given card background. */
export function textOn(bg: string): string {
  if (bg === palette.cream || bg === palette.yellow || bg === palette.offWhite) {
    return colors.textOnLight;
  }
  return colors.textOnDark;
}
