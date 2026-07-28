/**
 * CollageCard — Design Guidelines §5 (Cards) + §4.1/§4.2.
 *
 * Bordered, slightly tilted card with a hard offset shadow. Backgrounds in a
 * stack alternate cream → dark → yellow → navy (§5). Optional yellow tape on
 * key cards. Container uses overflow: visible so tilt/shadow extend past the
 * bounds (§6).
 */
import React from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { border, colors, radii, shadow } from '../theme';
import { HardShadow } from './HardShadow';
import { Tape } from './Tape';

interface CollageCardProps {
  children: React.ReactNode;
  /** Card background — pass a brand color (never gray, §9). */
  background?: string;
  /** Tilt rotation, e.g. "1deg" / "-1.2deg". Max ±2° on functional cards (§4.2). */
  rotate?: string;
  /** Shadow color — near-black, or navy for the blue accent shadow (§4.1). */
  shadowColor?: string;
  /** Render a yellow tape strip on the card (§4.3). */
  taped?: boolean;
  /** Tape side. */
  tapeSide?: 'left' | 'right';
  /** Use the light tape variant (for dark card backgrounds). */
  tapeOnDark?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function CollageCard({
  children,
  background = colors.cream,
  rotate = '0deg',
  shadowColor = colors.shadow,
  taped = false,
  tapeSide = 'left',
  tapeOnDark,
  onPress,
  accessibilityLabel,
  style,
}: CollageCardProps) {
  const Inner = onPress ? Pressable : View;
  const isDarkBg = background === colors.nearBlack || background === colors.navy;
  const a11yProps = onPress
    ? { accessibilityRole: 'button' as const, accessibilityLabel }
    : {};

  return (
    <HardShadow
      offset={shadow.card}
      color={shadowColor}
      radius={radii.card}
      style={{ transform: [{ rotate }], overflow: 'visible' }}
    >
      {taped && (
        <Tape
          onDark={tapeOnDark ?? isDarkBg}
          {...(tapeSide === 'right' ? { right: 22 } : { left: 22 })}
          rotate={rotate.startsWith('-') ? '4deg' : '-4deg'}
        />
      )}
      <Inner
        onPress={onPress}
        {...a11yProps}
        style={[
          {
            backgroundColor: background,
            borderRadius: radii.card,
            borderWidth: border.card,
            borderColor: colors.border,
            paddingVertical: 13,
            paddingHorizontal: 15,
          },
          style,
        ]}
      >
        {children}
      </Inner>
    </HardShadow>
  );
}
