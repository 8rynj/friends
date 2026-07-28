/**
 * HobbyChip — Design Guidelines §8 (Onboarding). Selectable pill chip.
 * Unselected = transparent with a muted border; selected = a brand color
 * (navy / yellow / orange) with a solid border. Functional element — no tilt.
 */
import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { border, colors, fonts, palette, radii } from '../theme';

interface HobbyChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** Brand color used when selected; cycles for visual variety. */
  selectedColor?: string;
  /** Render on a dark background (onboarding). Defaults to dark. */
  onDark?: boolean;
}

export function HobbyChip({
  label,
  selected,
  onToggle,
  selectedColor = palette.navy,
  onDark = true,
}: HobbyChipProps) {
  const unselectedFg = onDark ? 'rgba(242, 240, 210,0.7)' : colors.nearBlack;
  const unselectedBorder = onDark ? 'rgba(242, 240, 210,0.25)' : colors.border;
  const fg = selected
    ? selectedColor === palette.navy || selectedColor === palette.nearBlack
      ? palette.offWhite
      : colors.nearBlack
    : unselectedFg;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => {});
        }
        onToggle();
      }}
      style={{
        backgroundColor: selected ? selectedColor : 'transparent',
        borderRadius: radii.pill,
        borderWidth: border.small,
        borderColor: selected ? colors.border : unselectedBorder,
        paddingVertical: 10,
        paddingHorizontal: 16,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bold,
          fontSize: 13,
          letterSpacing: 0.2,
          color: fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
