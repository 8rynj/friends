/**
 * Button — Design Guidelines §5 (Buttons). Fully pill-shaped with a solid
 * border. No hover (mobile). Press = scale to 0.96 and the offset shadow
 * reduces (§7). Variants:
 *  - primary:   near-black bg, off-white text, optional navy offset shadow
 *  - secondary: transparent bg, near-black text + border
 *  - cta:       yellow bg (CTA on dark), near-black text, near-black shadow
 */
import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { border, colors, motion, palette, radii, shadow, type } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'cta';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** Stretch to fill the container width (primary CTAs, §5). */
  fullWidth?: boolean;
  /** Leading glyph/emoji rendered before the label. */
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

function styleFor(variant: ButtonVariant): {
  bg: string;
  fg: string;
  shadowColor: string;
} {
  switch (variant) {
    case 'secondary':
      // Opaque light fill (reads as "transparent" on the cream app surface) so
      // the hard offset shadow shows only at the edges, never through the face.
      return { bg: colors.cream, fg: colors.nearBlack, shadowColor: colors.shadow };
    case 'cta':
      return { bg: palette.yellow, fg: colors.nearBlack, shadowColor: colors.shadow };
    default:
      return { bg: colors.nearBlack, fg: palette.offWhite, shadowColor: colors.navy };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const s = styleFor(variant);
  const pressed = useSharedValue(0);
  const off = variant === 'primary' ? shadow.cta : shadow.small;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(1 - pressed.value * 0.04, { duration: motion.buttonPress }) }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    left: withTiming(off.x * (1 - pressed.value), { duration: motion.buttonPress }),
    top: withTiming(off.y * (1 - pressed.value), { duration: motion.buttonPress }),
  }));

  return (
    <Animated.View
      style={[animStyle, fullWidth && { alignSelf: 'stretch' }, style]}
    >
      <View style={{ position: 'relative' }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              right: -off.x,
              bottom: -off.y,
              borderRadius: radii.pill,
              backgroundColor: s.shadowColor,
            },
            shadowStyle,
          ]}
        />
        <Pressable
          onPress={onPress}
          onPressIn={() => {
            pressed.value = 1;
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
          }}
          onPressOut={() => {
            pressed.value = 0;
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: s.bg,
            borderRadius: radii.pill,
            borderWidth: border.card,
            borderColor: colors.border,
            paddingVertical: 14,
            paddingHorizontal: 22,
          }}
        >
          {icon ? <Text style={{ fontSize: 14, color: s.fg }}>{icon}</Text> : null}
          <Text style={[type.label, { color: s.fg, letterSpacing: 0.8 }]}>{label}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
