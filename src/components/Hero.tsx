/**
 * Hero — Design Guidelines §5 (Hero Sections) + §8.
 *
 * Navy block, 200–220px. Name bottom-left in large uppercase mixing filled and
 * outline type. Avatar bottom-right, rotated + taped + offset shadow. 2–3 paper
 * scraps (orange & yellow), a subtle halftone dot pattern, an optional circular
 * back button, and a ripped-paper edge transition into the cream content below.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, colors, palette, type } from '../theme';
import { Avatar } from './Avatar';
import { HalftoneEye } from './HalftoneEye';
import { OutlineText } from './OutlineText';
import { PaperScrap } from './PaperScrap';
import { Pill } from './Pill';
import { RippedEdge } from './RippedEdge';

interface HeroProps {
  /** Eyebrow label above the name (uppercase). */
  eyebrow?: string;
  /** Full name; the last word is rendered in outline type (§3, §8). */
  name: string;
  /** Avatar subject (defaults to name). */
  avatarName?: string;
  avatarColor?: string;
  avatarPhoto?: string;
  /** Stamped badge on the avatar, e.g. "3 COMMON" (§8). */
  badge?: string;
  /** Connected pill shown in the hero (§ Pills). */
  connectedLabel?: string;
  /** Background color of the content area below (for the ripped transition). */
  contentColor?: string;
  /** Unique tear shape per screen (§4.4). */
  seed?: number;
  onBack?: () => void;
  height?: number;
}

export function Hero({
  eyebrow,
  name,
  avatarName,
  avatarColor = palette.orange,
  avatarPhoto,
  badge,
  connectedLabel,
  contentColor = colors.cream,
  seed = 1,
  onBack,
  height = 210,
}: HeroProps) {
  const insets = useSafeAreaInsets();
  const parts = name.trim().split(' ');
  const last = parts.length > 1 ? parts.pop()! : '';
  const first = parts.join(' ');

  return (
    <View>
      <View
        style={{
          height: height + insets.top,
          paddingTop: insets.top + 12,
          backgroundColor: palette.navy,
          paddingHorizontal: 18,
          overflow: 'hidden',
        }}
      >
        {/* Subtle halftone texture + paper scraps (§5). Kept in the empty
            upper-center band so they never sit over the eyebrow, name, avatar,
            back button or connected pill (§9). */}
        <HalftoneEye size={88} top={insets.top + 4} right={-12} opacity={0.07} />
        <PaperScrap top={insets.top + 16} right={128} size={22} color={palette.orange} rotate="-12deg" />
        <PaperScrap top={insets.top + 44} right={156} size={14} color={palette.paperYellow} rotate="18deg" />

        {/* Back button — circular, cream, near-black border + shadow (§5). */}
        {onBack && (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.cream,
              borderWidth: border.small,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text allowFontScaling={false} style={{ fontSize: 18, color: colors.nearBlack, lineHeight: 20 }}>‹</Text>
          </Pressable>
        )}

        {/* Connected pill, top-right. */}
        {connectedLabel && (
          <View style={{ position: 'absolute', top: insets.top + 16, right: 18 }}>
            <Pill label={connectedLabel} variant="connected" />
          </View>
        )}

        {/* Name bottom-left + avatar bottom-right. */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingBottom: 18,
          }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            {eyebrow && (
              <Text style={[type.label, { color: palette.yellow, marginBottom: 6 }]}>
                {eyebrow}
              </Text>
            )}
            <Text style={[type.display, { color: palette.offWhite }]}>{first}</Text>
            {last !== '' && (
              <OutlineText fontSize={34} stroke={palette.offWhite} strokeWidth={1.6}>
                {last}
              </OutlineText>
            )}
          </View>

          <View>
            <Avatar
              name={avatarName ?? name}
              color={avatarColor}
              photo={avatarPhoto}
              size={84}
              rotate="3deg"
              shadowed
              taped
            />
            {badge && (
              <View style={{ position: 'absolute', bottom: -6, left: -14, transform: [{ rotate: '-4deg' }] }}>
                <Pill label={badge} variant="due" />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Ripped-paper transition into the content area. */}
      <RippedEdge topColor={palette.navy} bottomColor={contentColor} seed={seed} />
    </View>
  );
}
