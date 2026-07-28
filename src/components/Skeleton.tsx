/**
 * Skeleton — loading placeholders in the collage system. Flat near-black
 * blocks (no gradients/shimmer per §9) that gently pulse opacity to signal
 * "loading"; respects reduced motion. SkeletonCard mimics a CollageCard list
 * row (avatar + two lines); SkeletonList stacks a few of them.
 */
import React, { useEffect } from 'react';
import { DimensionValue, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export function SkeletonBlock({ width = '100%', height = 14, radius = 6 }: SkeletonBlockProps) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    pulse.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduced, pulse]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: reduced ? 0.14 : 0.08 + pulse.value * 0.1,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.nearBlack },
        animStyle,
      ]}
    />
  );
}

/** A skeleton row mimicking a CollageCard list item (avatar + two lines). */
export function SkeletonCard({ rotate = '0deg' }: { rotate?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.cream,
        borderRadius: radii.card,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.15)',
        padding: 15,
        transform: [{ rotate }],
      }}
    >
      <SkeletonBlock width={46} height={46} radius={23} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="60%" height={14} />
        <SkeletonBlock width="40%" height={11} />
      </View>
    </View>
  );
}

/** Stack of skeleton rows for list loading states. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View
      style={{ gap: 13 }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      accessibilityLiveRegion="polite"
      importantForAccessibility="yes"
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} importantForAccessibility="no-hide-descendants">
          <SkeletonCard rotate={i % 2 === 0 ? '0.4deg' : '-0.4deg'} />
        </View>
      ))}
    </View>
  );
}
