/**
 * Avatar — Design Guidelines §5 (Avatars). Always circular with a 2.5–3px
 * near-black border. Brand-color backgrounds (never gray). On hero sections:
 * slight rotation + hard offset shadow + a yellow tape strip above. Optional
 * connection-count sticker bottom-right.
 */
import React from 'react';
import { Image, StyleProp, Text, View, ViewStyle } from 'react-native';
import { border, colors, fonts, palette, textOn } from '../theme';
import { HardShadow } from './HardShadow';
import { Sticker } from './Sticker';
import { Tape } from './Tape';

interface AvatarProps {
  name: string;
  size?: number;
  /** Brand-color background when no photo. Never gray (§5). */
  color?: string;
  photo?: string;
  /** Slight rotation for hero placement (2–4°, §5). */
  rotate?: string;
  /** Hard offset shadow (hero placement). */
  shadowed?: boolean;
  /** Yellow tape strip above the avatar (hero placement). */
  taped?: boolean;
  /** Connection-count sticker bottom-right. */
  count?: number;
  style?: StyleProp<ViewStyle>;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Avatar({
  name,
  size = 56,
  color = palette.navy,
  photo,
  rotate = '0deg',
  shadowed = false,
  taped = false,
  count,
  style,
}: AvatarProps) {
  const circle = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        borderWidth: border.avatar,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {photo ? (
        <Image source={{ uri: photo }} accessible={false} style={{ width: size, height: size }} />
      ) : (
        // Fixed circular glyph — don't let OS text scaling overflow the circle.
        <Text
          allowFontScaling={false}
          style={{
            fontFamily: fonts.bold,
            fontSize: size * 0.38,
            color: textOn(color),
          }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );

  const content = (
    <View style={{ width: size, height: size }}>
      {circle}
      {taped && (
        <Tape top={-10} left={size * 0.3} width={size * 0.5} height={14} rotate="-8deg" />
      )}
      {count !== undefined && (
        <Sticker label={count} bottom={-6} right={-6} size={size * 0.36} />
      )}
    </View>
  );

  return (
    <View style={[{ transform: [{ rotate }] }, style]}>
      {shadowed ? (
        <HardShadow radius={size / 2} offset={{ x: 4, y: 4 }}>
          {content}
        </HardShadow>
      ) : (
        content
      )}
    </View>
  );
}
