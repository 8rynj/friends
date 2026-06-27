/**
 * HardShadow — Design Guidelines §4.1, the single most important visual signature.
 *
 * React Native's native shadow props (and Android `elevation`) always blur, and
 * the guidelines forbid any blur. Instead we render a duplicate solid layer
 * offset behind the content, producing a hard-stop offset shadow identical on
 * iOS, Android and web.
 *
 * The child must have an opaque background so the shadow only shows at the
 * offset edges. Wrap cards, buttons, avatars and the FAB with this.
 */
import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { colors, radii, shadow } from '../theme';

interface HardShadowProps {
  children: React.ReactNode;
  /** Shadow offset in px. Defaults to the standard 4×4 card offset. */
  offset?: { x: number; y: number };
  /** Shadow color — always near-black or navy per §4.1. */
  color?: string;
  /** Corner radius of the shadow layer; should match the child's radius. */
  radius?: number;
  /** Style applied to the positioning wrapper (e.g. margins, rotation). */
  style?: StyleProp<ViewStyle>;
}

export function HardShadow({
  children,
  offset = shadow.card,
  color = colors.shadow,
  radius = radii.card,
  style,
}: HardShadowProps) {
  return (
    <View style={[{ position: 'relative' }, style]}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: offset.x,
          top: offset.y,
          right: -offset.x,
          bottom: -offset.y,
          borderRadius: radius,
          backgroundColor: color,
        }}
      />
      {children}
    </View>
  );
}
