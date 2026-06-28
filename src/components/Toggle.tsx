/**
 * Toggle — an on/off switch in the collage style (hard border, flat colors, a
 * stamped knob) rather than the iOS/Material default. Navy when on, off-white
 * when off.
 */
import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { border, colors, palette } from '../theme';

interface ToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function Toggle({ value, onChange }: ToggleProps) {
  const W = 52;
  const H = 30;
  const knob = 22;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onChange(!value);
      }}
      style={{
        width: W,
        height: H,
        borderRadius: H / 2,
        borderWidth: border.small,
        borderColor: colors.border,
        backgroundColor: value ? palette.navy : palette.offWhite,
        justifyContent: 'center',
        paddingHorizontal: 2,
      }}
    >
      <View
        style={{
          width: knob,
          height: knob,
          borderRadius: knob / 2,
          backgroundColor: value ? palette.yellow : colors.cream,
          borderWidth: 2,
          borderColor: colors.border,
          alignSelf: value ? 'flex-end' : 'flex-start',
        }}
      />
    </Pressable>
  );
}
