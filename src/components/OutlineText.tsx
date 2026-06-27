/**
 * OutlineText — Design Guidelines §3 "Outline Type Treatment".
 *
 * React Native has no `-webkit-text-stroke`, so we render stroked, transparent-
 * fill text with react-native-svg. Use sparingly — one word per headline, usually
 * the second line of a two-line heading.
 */
import React from 'react';
import Svg, { Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';

interface OutlineTextProps {
  children: string;
  fontSize?: number;
  /** Stroke color — cream on dark backgrounds, near-black on light (§3). */
  stroke?: string;
  strokeWidth?: number;
  letterSpacing?: number;
  /** Optional explicit width; otherwise estimated from the text length. */
  width?: number;
}

export function OutlineText({
  children,
  fontSize = 34,
  stroke = colors.nearBlack,
  strokeWidth = 2,
  letterSpacing = -0.8,
  width,
}: OutlineTextProps) {
  const text = children.toUpperCase();
  // Space Grotesk Bold runs ~0.62× em wide per glyph; pad for stroke + spacing.
  const estWidth =
    width ?? Math.ceil(text.length * fontSize * 0.62 + strokeWidth * 2 + 6);
  const height = Math.ceil(fontSize * 1.05);

  return (
    <Svg width={estWidth} height={height}>
      <SvgText
        x={strokeWidth}
        y={fontSize * 0.82}
        fill="transparent"
        stroke={stroke}
        strokeWidth={strokeWidth}
        fontSize={fontSize}
        fontFamily={fonts.bold}
        letterSpacing={letterSpacing}
      >
        {text}
      </SvgText>
    </Svg>
  );
}
