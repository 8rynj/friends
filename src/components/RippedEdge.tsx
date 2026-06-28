/**
 * RippedEdge — section divider between a hero color block and the content area.
 *
 * Previously a jagged SVG tear; now a clean straight line (the SVG tear didn't
 * render reliably). Keeps the same props so callers are unchanged: it draws a
 * thin strip in the hero color capped by a hard near-black rule, matching the
 * design system's hard-border language.
 */
import React from 'react';
import { View } from 'react-native';
import { colors } from '../theme';

interface RippedEdgeProps {
  /** Color of the block above (the hero). */
  topColor: string;
  /** Color of the block below (kept for API compatibility). */
  bottomColor?: string;
  /** Unused now; kept for API compatibility. */
  height?: number;
  seed?: number;
}

export function RippedEdge({ topColor }: RippedEdgeProps) {
  return (
    <View
      style={{
        height: 4,
        backgroundColor: topColor,
        borderBottomWidth: 2.5,
        borderBottomColor: colors.nearBlack,
      }}
    />
  );
}
