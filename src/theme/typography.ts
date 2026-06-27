/**
 * Knowable typography — Design Guidelines §3.
 *
 * Space Grotesk everywhere (never system fonts). Hero/headline text is almost
 * always UPPERCASE with tight letter-spacing; small labels are UPPERCASE with
 * wide letter-spacing; body/card content is mixed case.
 *
 * Font family names map to the @expo-google-fonts/space-grotesk exports loaded
 * in app/_layout.tsx.
 */
import { TextStyle } from 'react-native';

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  bold: 'SpaceGrotesk_700Bold',
} as const;

/**
 * React Native expresses letter-spacing in points, not em. These are converted
 * from the guideline em values at representative font sizes.
 */
export const type = {
  /** Display / Hero — 32–38px, 700, UPPERCASE, tight tracking. */
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -0.8,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Headline — 24–30px, 700, UPPERCASE, line height 1.0–1.1. */
  headline: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Card Title — 14–16px, 700, mixed case. */
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: -0.2,
  } as TextStyle,

  /** Body — 12–13px, 400–500, mixed case. */
  body: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,

  /** Label / Eyebrow — 10px, 700, UPPERCASE, wide tracking. */
  label: {
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  } as TextStyle,

  /** Micro — 9–10px, 700, tags / pills / badges / timestamps. */
  micro: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,
} as const;
