/**
 * Pill — Design Guidelines §5 (Pills and Tags). Fully pill-shaped, 10px bold
 * uppercase, always a visible border. Variants per the guidelines:
 *  - due:        orange bg, cream text
 *  - new:        navy bg, cream text
 *  - connected:  yellow bg, dark text (hero sections)
 *  - source:     light-tinted bg matching the source color, dark text
 *  - default:    cream bg, dark text
 */
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { border, colors, palette, radii, type } from '../theme';

type PillVariant = 'default' | 'due' | 'new' | 'connected' | 'source' | 'dark';

interface PillProps {
  label: string;
  variant?: PillVariant;
  /** For variant="source": the platform tint color. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

function styleFor(variant: PillVariant, tint?: string): {
  bg: string;
  fg: string;
  borderColor: string;
} {
  switch (variant) {
    case 'due':
      return { bg: palette.orange, fg: palette.cream, borderColor: colors.border };
    case 'new':
      return { bg: palette.navy, fg: palette.cream, borderColor: colors.border };
    case 'connected':
      return { bg: palette.yellow, fg: colors.nearBlack, borderColor: colors.border };
    case 'dark':
      return { bg: colors.nearBlack, fg: palette.offWhite, borderColor: colors.border };
    case 'source':
      return {
        // light tinted background matching the source color
        bg: (tint ?? palette.navy) + '22',
        fg: colors.nearBlack,
        borderColor: colors.border,
      };
    default:
      return { bg: palette.cream, fg: colors.nearBlack, borderColor: colors.border };
  }
}

export function Pill({ label, variant = 'default', tint, style }: PillProps) {
  const s = styleFor(variant, tint);
  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: s.bg,
          borderRadius: radii.pill,
          borderWidth: border.hairline,
          borderColor: s.borderColor,
          paddingHorizontal: 10,
          paddingVertical: 4,
        },
        style,
      ]}
    >
      <Text style={[type.micro, { color: s.fg }]}>{label}</Text>
    </View>
  );
}
