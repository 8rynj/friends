/**
 * Knowable spacing, radii, shadows & rotation — Design Guidelines §4.1–4.2, §5, §6.
 */

/** Spacing scale (§6). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  /** Horizontal screen padding (16–20px). */
  screen: 18,
  /** Gap between cards in a stack. */
  cardGap: 13,
  /** Gap between major sections (12–16px). */
  section: 14,
} as const;

/** Border radii (§5). Never < 14px on cards. */
export const radii = {
  card: 18,
  /** Fully pill-shaped buttons, pills, tags. */
  pill: 100,
  sticker: 999,
  scrap: 3,
  tape: 3,
} as const;

/** Border widths (§5). Always visible, never invisible. */
export const border = {
  card: 2.5,
  small: 2,
  hairline: 1.5,
  avatar: 3,
} as const;

/**
 * Hard offset shadow geometry (§4.1). No blur, ever — the HardShadow component
 * renders a solid offset layer rather than a blurred native shadow.
 */
export const shadow = {
  /** Standard card shadow: 4px 4px 0. */
  card: { x: 4, y: 4 },
  /** Small elements (buttons, tags): 2px 2px 0. */
  small: { x: 2, y: 2 },
  /** Button-on-dark CTA blue accent: 3px 3px 0. */
  cta: { x: 3, y: 3 },
} as const;

/**
 * Card tilt pattern (§4.2). Alternate directions across a stack; max ±2° on
 * functional cards. Decorative elements may go up to ±6°.
 */
export const tilt = {
  // Subtle tilt — enough to feel handmade without cards visually colliding.
  stack: ['0.5deg', '-0.5deg', '0.4deg', '-0.4deg', '0.6deg'],
  /** Max functional rotation. */
  maxFunctional: 2,
  /** Max decorative rotation (FAB, avatars, scraps). */
  maxDecorative: 6,
} as const;

/** Returns the stack tilt for a given index, cycling through the pattern. */
export function tiltFor(index: number): string {
  return tilt.stack[index % tilt.stack.length];
}

/** Animation durations (§7), in ms. */
export const motion = {
  bump: 400,
  cardEntrance: 300,
  cardStagger: 70,
  tapeDrop: 200,
  icebreakerReveal: 250,
  icebreakerStagger: 100,
  profileOpen: 350,
  nudgeIn: 300,
  buttonPress: 100,
  marquee: 12000,
} as const;
