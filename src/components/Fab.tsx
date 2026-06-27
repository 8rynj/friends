/**
 * Fab — Design Guidelines §5 (FAB). 52–56px circle, near-black or orange, always
 * visibly rotated (4–6°), hard offset shadow, bottom-right above the navigation.
 */
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { border, colors, palette } from '../theme';
import { HardShadow } from './HardShadow';

interface FabProps {
  onPress?: () => void;
  /** Glyph rendered in the button. */
  icon?: string;
  /** Orange for emphasis, else near-black. */
  color?: typeof palette.orange | typeof colors.nearBlack;
  size?: number;
  rotate?: string;
  bottom?: number;
}

export function Fab({
  onPress,
  icon = '+',
  color = palette.orange,
  size = 56,
  rotate = '6deg',
  bottom = 24,
}: FabProps) {
  return (
    <HardShadow
      radius={size / 2}
      offset={{ x: 4, y: 4 }}
      style={{
        position: 'absolute',
        right: 20,
        bottom,
        transform: [{ rotate }],
      }}
    >
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
          onPress?.();
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: border.card,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.56, color: palette.cream }}>
          {icon}
        </Text>
      </Pressable>
    </HardShadow>
  );
}
