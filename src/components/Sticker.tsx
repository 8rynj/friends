/**
 * Sticker — Design Guidelines §4.7. A small circular/pill badge that looks
 * stamped onto the UI. Always a solid 2px near-black border; yellow / orange /
 * cream only. Used for connection counts on avatars, "new" indicators, etc.
 */
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { border, colors, palette, radii, type } from '../theme';

interface StickerProps {
  label: string | number;
  background?: typeof palette.yellow | typeof palette.orange | typeof palette.cream;
  /** Absolute position offsets; omit to render inline. */
  bottom?: number;
  right?: number;
  top?: number;
  left?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function Sticker({
  label,
  background = palette.yellow,
  bottom,
  right,
  top,
  left,
  size = 22,
  style,
}: StickerProps) {
  const positioned =
    bottom !== undefined ||
    right !== undefined ||
    top !== undefined ||
    left !== undefined;

  return (
    <View
      style={[
        {
          minWidth: size,
          height: size,
          paddingHorizontal: 4,
          borderRadius: radii.sticker,
          backgroundColor: background,
          borderWidth: border.small,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        positioned && { position: 'absolute', bottom, right, top, left },
        style,
      ]}
    >
      {/* Fixed circular badge — don't let OS text scaling overflow it. */}
      <Text allowFontScaling={false} style={[type.micro, { color: colors.nearBlack }]}>
        {label}
      </Text>
    </View>
  );
}
