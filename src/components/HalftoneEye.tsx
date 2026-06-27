/**
 * HalftoneEye — Design Guidelines §4.6. A black-and-white halftone eye used as a
 * barely-perceptible background decoration (opacity 0.06–0.10). Positioned in
 * corners/edges, never over text or interactive elements. Always near-black.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

interface HalftoneEyeProps {
  size?: number;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  /** 0.06–0.10 per §4.6. */
  opacity?: number;
  rotate?: string;
}

/** Halftone dot field inside the iris — dot radius shrinks toward the edges. */
function buildDots(cx: number, cy: number, r: number): React.ReactNode[] {
  const dots: React.ReactNode[] = [];
  const step = r / 3.2;
  let key = 0;
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      const dist = Math.sqrt(x * x + y * y);
      if (dist > r) continue;
      const dotR = Math.max(0.4, (1 - dist / r) * step * 0.42);
      dots.push(
        <Circle
          key={key++}
          cx={cx + x}
          cy={cy + y}
          r={dotR}
          fill={colors.nearBlack}
        />,
      );
    }
  }
  return dots;
}

export function HalftoneEye({
  size = 80,
  top,
  bottom,
  left,
  right,
  opacity = 0.08,
  rotate = '0deg',
}: HalftoneEyeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const irisR = size * 0.22;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        opacity,
        transform: [{ rotate }],
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Almond eye outline */}
        <Path
          d={`M${size * 0.1},${cy} Q${cx},${size * 0.12} ${size * 0.9},${cy} Q${cx},${size * 0.88} ${size * 0.1},${cy} Z`}
          fill="none"
          stroke={colors.nearBlack}
          strokeWidth={size * 0.03}
        />
        {buildDots(cx, cy, irisR)}
      </Svg>
    </View>
  );
}
