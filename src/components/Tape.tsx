/**
 * Tape — Design Guidelines §4.3. The primary collage motif: a translucent
 * yellow strip that looks like it holds a card down on a physical board.
 *
 * Rotate OPPOSITE to the parent card. Goes on nudge / commonality / log cards,
 * hero avatars. Never on navigation, buttons, inputs or stat pills.
 */
import React from 'react';
import { View } from 'react-native';
import { alpha, radii } from '../theme';

interface TapeProps {
  /** Horizontal anchor — distance from the chosen side. */
  left?: number;
  right?: number;
  /** Vertical offset; tape usually overhangs the top edge slightly. */
  top?: number;
  width?: number;
  height?: number;
  /** Counter-rotation relative to the parent card. */
  rotate?: string;
  /** Use the light tape variant on dark backgrounds (§4.3). */
  onDark?: boolean;
}

export function Tape({
  left,
  right,
  top = -8,
  width = 46,
  height = 16,
  rotate = '-3deg',
  onDark = false,
}: TapeProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        ...(right !== undefined ? { right } : { left: left ?? 20 }),
        width,
        height,
        backgroundColor: onDark ? alpha.tapeOnDark : alpha.tapeOnLight,
        borderRadius: radii.tape,
        borderWidth: 1.5,
        borderColor: alpha.tapeBorder,
        transform: [{ rotate }],
        zIndex: 10,
      }}
    />
  );
}
