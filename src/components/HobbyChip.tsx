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
}

export function HobbyChip({
  label,
  selected,
  onToggle,
  selectedColor = palette.navy,
}: HobbyChipProps) {
  const fg = selected
    ? selectedColor === palette.yellow
      ? colors.nearBlack
      : palette.offWhite
    : 'rgba(245,240,232,0.7)';

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
        borderColor: selected ? colors.border : 'rgba(245,240,232,0.25)',
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
