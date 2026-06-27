/**
 * RippedEdge — Design Guidelines §4.4. Ripped-paper section divider, used ONLY
 * to transition between a hero color block and the cream content area below.
 *
 * Two SVG paths (color above, color below) over an irregular jagged line.
 * preserveAspectRatio="none" stretches it full width. Each screen passes a
 * different `seed` so the tear doesn't look mechanical (§4.4 note).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface RippedEdgeProps {
  /** Color of the block above the tear (e.g. the navy hero). */
  topColor: string;
  /** Color of the block below the tear (e.g. cream content). */
  bottomColor: string;
  /** Height of the tear strip (28–36px per §4.4). */
  height?: number;
  /** Varies the jagged control points so each tear is unique. */
  seed?: number;
}

const VB_W = 100;
const VB_H = 32;

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Builds an irregular jagged line across the viewBox width. */
function buildTearLine(seed: number): string {
  const steps = 9;
  const baseY = VB_H * 0.55;
  let d = `M0,${(baseY + (rand(seed) - 0.5) * 10).toFixed(2)}`;
  for (let i = 1; i <= steps; i++) {
    const x = (VB_W / steps) * i;
    // jagged target Y varies each step; control point varies independently so
    // the curve is never a clean sinusoid (§4.4).
    const y = baseY + (rand(seed + i) - 0.5) * 18;
    const cx = x - VB_W / steps / 2 + (rand(seed + i * 3) - 0.5) * 6;
    const cy = baseY + (rand(seed + i * 7) - 0.5) * 22;
    d += ` Q${cx.toFixed(2)},${cy.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return d;
}

export function RippedEdge({
  topColor,
  bottomColor,
  height = 32,
  seed = 1,
}: RippedEdgeProps) {
  const tear = buildTearLine(seed);
  const topPath = `${tear} L${VB_W},0 L0,0 Z`;
  const bottomPath = `${tear} L${VB_W},${VB_H} L0,${VB_H} Z`;

  return (
    <View style={{ width: '100%', height }}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        <Path d={topPath} fill={topColor} />
        <Path d={bottomPath} fill={bottomColor} />
      </Svg>
    </View>
  );
}
