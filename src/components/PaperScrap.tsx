/**
 * PaperScrap — Design Guidelines §4.5. Small torn-paper shapes scattered behind
 * hero content. Orange or yellow only, 2–3 per section, staggered at angles.
 * Never over text or interactive elements.
 */
import React from 'react';
import { View } from 'react-native';
import { alpha, palette, radii } from '../theme';

interface PaperScrapProps {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  size?: number;
  /** Burnt orange or yellow only (§4.5). */
  color?: typeof palette.orange | typeof palette.yellow;
  rotate?: string;
}

export function PaperScrap({
  top,
  bottom,
  left,
  right,
  size = 20,
  color = palette.orange,
  rotate = '15deg',
}: PaperScrapProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: radii.scrap,
        borderWidth: 1.5,
        borderColor: alpha.scrapBorder,
        transform: [{ rotate }],
      }}
    />
  );
}
