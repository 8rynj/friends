/**
 * Home — Design Guidelines §8 (Home Screen), flows per Spec §5D.
 *
 * Cream base, header with outline type + taped/rotated avatar and connection
 * count, marquee ticker, tilted stat pills, a navy taped nudge card, a list of
 * connections on alternating tilted card backgrounds, and the orange FAB.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Avatar,
  CollageCard,
  Fab,
  HalftoneEye,
  Marquee,
  OutlineText,
  PaperScrap,
  Pill,
} from '../../src/components';
import {
  cardBackgrounds,
  colors,
  palette,
  spacing,
  textOn,
  tiltFor,
  type,
} from '../../src/theme';
import {
  connections,
  currentUser,
  marqueePhrases,
  nudges,
} from '../../src/data/mock';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduced = useReducedMotion();
  const topNudge = nudges[0];
  const nudgeConn = connections.find((c) => c.id === topNudge.connectionId);

  const entrance = (i: number) =>
    reduced ? undefined : FadeInDown.delay(i * 70).springify().damping(16);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.screen,
          paddingBottom: 12,
          backgroundColor: colors.appBg,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={[type.label, { color: colors.textMutedOnLight, marginBottom: 4 }]}>
              {greeting()}, {currentUser.name.split(' ')[0]}
            </Text>
            <Text style={[type.display, { color: colors.nearBlack }]}>Know your</Text>
            <OutlineText fontSize={34} stroke={colors.nearBlack} strokeWidth={2}>
              People
            </OutlineText>
          </View>
          <Avatar
            name={currentUser.name}
            color={currentUser.avatarColor}
            size={56}
            rotate="-4deg"
            count={connections.length}
          />
        </View>
      </View>

      <Marquee phrases={marqueePhrases} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.lg,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative layer (never over text). */}
        <PaperScrap top={-2} right={4} size={22} color={palette.yellow} rotate="14deg" />
        <HalftoneEye size={70} bottom={40} left={-12} opacity={0.06} />

        {/* Stat pills — tilted, alternating directions (§8). */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' }}>
          <View style={{ transform: [{ rotate: '-2deg' }] }}>
            <Pill label={`${connections.length} connections`} variant="new" />
          </View>
          <View style={{ transform: [{ rotate: '1.5deg' }] }}>
            <Pill label={`${nudges.filter((n) => n.due).length} due today`} variant="due" />
          </View>
          <View style={{ transform: [{ rotate: '-1deg' }] }}>
            <Pill label={`${currentUser.profileCompletion}% profile`} variant="default" />
          </View>
        </View>

        {/* Nudge card — navy, taped, rotated, hard shadow (§8). */}
        <Animated.View entering={entrance(0)} style={{ marginBottom: spacing.xl }}>
          <Text style={[type.label, { color: colors.textMutedOnLight, marginBottom: spacing.sm }]}>
            Today’s nudge
          </Text>
          <CollageCard
            background={palette.navy}
            rotate="-1.5deg"
            taped
            tapeSide="right"
            onPress={() => nudgeConn && router.push(`/connection/${nudgeConn.id}`)}
            style={{ paddingVertical: 16 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {nudgeConn && (
                <Avatar name={nudgeConn.user.name} color={nudgeConn.user.avatarColor} size={48} />
              )}
              <View style={{ flex: 1 }}>
                <Pill
                  label={topNudge.trigger === 'event' ? 'New in common' : 'Time to reach out'}
                  variant="connected"
                  style={{ marginBottom: 6 }}
                />
                <Text style={[type.cardTitle, { color: palette.offWhite }]}>
                  {topNudge.message}
                </Text>
              </View>
            </View>
          </CollageCard>
        </Animated.View>

        {/* Connections — alternating tilted card backgrounds (§8). */}
        <Text style={[type.headline, { color: colors.nearBlack, marginBottom: spacing.md }]}>
          Your people
        </Text>
        <View style={{ gap: spacing.md }}>
          {connections.map((c, i) => {
            const bg = cardBackgrounds[i % cardBackgrounds.length];
            const fg = textOn(bg);
            const muted = bg === palette.cream || bg === palette.yellow
              ? colors.textMutedOnLight
              : colors.textMutedOnDark;
            return (
              <Animated.View key={c.id} entering={entrance(i + 1)}>
                <CollageCard
                  background={bg}
                  rotate={tiltFor(i)}
                  taped={i % 2 === 1}
                  tapeSide={i % 2 === 0 ? 'left' : 'right'}
                  onPress={() => router.push(`/connection/${c.id}`)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Avatar name={c.user.name} color={c.user.avatarColor} size={46} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.cardTitle, { color: fg }]}>{c.user.name}</Text>
                      <Text style={[type.body, { color: muted }]} numberOfLines={1}>
                        {c.commonalities.length} in common · {c.metContext}
                      </Text>
                    </View>
                    {isDue(c.nextNudge) && <Pill label="Due" variant="due" />}
                  </View>
                </CollageCard>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* FAB — orange, rotated 6° (§8). Opens the connect / post-bump flow. */}
      <Fab
        icon="+"
        color={palette.orange}
        rotate="6deg"
        bottom={insets.bottom + 16}
        onPress={() => router.push('/icebreaker')}
      />
    </View>
  );
}

/** A connection is "due" when its next nudge date is today or earlier. */
function isDue(nextNudge: string | null): boolean {
  if (!nextNudge) return false;
  return new Date(nextNudge) <= new Date();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
