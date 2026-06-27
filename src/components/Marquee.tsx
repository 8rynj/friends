/**
 * Marquee — Design Guidelines §5 (Marquee / Ticker Strip). A scrolling strip
 * below the header: black background, yellow uppercase text, wide tracking.
 * Continuous linear scroll (no easing), 10–14s loop. Content is duplicated so
 * the loop is seamless. Respects reduce-motion (§7).
 */
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, motion } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface MarqueeProps {
  phrases: string[];
  /** Full-loop duration in ms (10–14s feels intentional). */
  duration?: number;
}

export function Marquee({ phrases, duration = motion.marquee }: MarqueeProps) {
  const reduced = useReducedMotion();
  const [contentWidth, setContentWidth] = useState(0);
  const x = useSharedValue(0);

  const line = phrases.join('   •   ') + '   •   ';

  useEffect(() => {
    if (!contentWidth || reduced) return;
    x.value = 0;
    x.value = withRepeat(
      withTiming(-contentWidth, { duration, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [contentWidth, duration, reduced, x]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View
      style={{
        backgroundColor: colors.nearBlack,
        paddingVertical: 7,
        overflow: 'hidden',
        borderTopWidth: 2,
        borderBottomWidth: 2,
        borderColor: colors.border,
      }}
    >
      <Animated.View style={[{ flexDirection: 'row' }, animStyle]}>
        <Text
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
          style={{
            fontFamily: fonts.bold,
            fontSize: 11,
            letterSpacing: 1.6,
            color: colors.yellow,
          }}
        >
          {line}
        </Text>
        {/* Duplicate for a seamless loop. */}
        <Text
          style={{
            fontFamily: fonts.bold,
            fontSize: 11,
            letterSpacing: 1.6,
            color: colors.yellow,
          }}
        >
          {line}
        </Text>
      </Animated.View>
    </View>
  );
}
