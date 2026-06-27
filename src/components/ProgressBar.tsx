/**
 * ProgressBar — Design Guidelines §8 (Onboarding). Thin (3px) track with a
 * yellow fill; percentage shown in yellow. Communicates value being left on the
 * table, not a reward to unlock (Spec §5A).
 */
import React from 'react';
import { Text, View } from 'react-native';
import { colors, palette, radii, type } from '../theme';

interface ProgressBarProps {
  /** 0–100. */
  percent: number;
  /** Show the numeric percentage label. */
  showLabel?: boolean;
  /** Render on a dark onboarding background. */
  onDark?: boolean;
}

export function ProgressBar({ percent, showLabel = true, onDark = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ gap: 6 }}>
      {showLabel && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[type.label, { color: onDark ? colors.textMutedOnDark : colors.textMutedOnLight }]}>
            Profile
          </Text>
          <Text style={[type.label, { color: palette.yellow }]}>{clamped}%</Text>
        </View>
      )}
      <View
        style={{
          height: 3,
          borderRadius: radii.pill,
          backgroundColor: onDark ? 'rgba(245,240,232,0.18)' : 'rgba(26,26,26,0.12)',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${clamped}%`,
            height: '100%',
            backgroundColor: palette.yellow,
            borderRadius: radii.pill,
          }}
        />
      </View>
    </View>
  );
}
