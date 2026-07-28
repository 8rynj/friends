/**
 * Marquee — Design Guidelines §5 (Marquee / Ticker Strip). A scrolling strip
 * below the header: black background, yellow uppercase text, wide tracking.
 * Continuous linear scroll (no easing), 10–14s loop. Respects reduce-motion (§7).
 *
 * Single-line guarantee: an off-screen copy measures the natural one-line width,
 * then two copies are rendered at that exact width so they physically can't wrap
 * (Yoga doesn't shrink-wrap a flex row the way the web does).
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

const textStyle = {
  fontFamily: fonts.bold,
  fontSize: 11,
  letterSpacing: 1.6,
  color: colors.yellow,
} as const;

export function Marquee({ phrases, duration = motion.marquee }: MarqueeProps) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);

  const line = phrases.join('   •   ') + '   •   ';

  useEffect(() => {
    if (!w || reduced) return;
    x.value = 0;
    x.value = withRepeat(withTiming(-w, { duration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(x);
  }, [w, duration, reduced, x]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

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
      {/* Off-screen measurer: absolute + no width => natural single-line width. */}
      <Text
        numberOfLines={1}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={[textStyle, { position: 'absolute', opacity: 0 }]}
      >
        {line}
      </Text>

      {w > 0 && (
        <Animated.View style={[{ flexDirection: 'row', width: w * 2 }, animStyle]}>
          <Text numberOfLines={1} style={[textStyle, { width: w }]}>
            {line}
          </Text>
          <Text numberOfLines={1} style={[textStyle, { width: w }]}>
            {line}
          </Text>
        </Animated.View>
      )}

      {/* Reserve height before measurement so the strip doesn't jump. */}
      {w === 0 && <Text numberOfLines={1} style={[textStyle, { opacity: 0 }]}>{line}</Text>}
    </View>
  );
}
