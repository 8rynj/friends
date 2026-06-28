/**
 * Home — Design Guidelines §8 (Home Screen), flows per Spec §5D.
 *
 * Cream base, header with outline type + taped/rotated avatar and connection
 * count, marquee ticker, tilted stat pills, a navy taped nudge card with an
 * inline "did you reach out?" response, a list of connections on alternating
 * tilted card backgrounds, and the orange FAB that "bumps" a new person.
 *
 * Reads live state from the store; nudge responses and new connections persist.
 */
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
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
  ProfileQuests,
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
import { marqueePhrases } from '../../src/data/mock';
import { commonalityCount } from '../../src/engine/commonality';
import { isDue, useStore } from '../../src/store/useStore';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduced = useReducedMotion();

  const user = useStore((s) => s.user);
  const connections = useStore((s) => s.connections);
  const nudges = useStore((s) => s.nudges);
  const respondToNudge = useStore((s) => s.respondToNudge);
  const incomingRequests = useStore((s) => s.incomingRequests);
  const acceptIncoming = useStore((s) => s.acceptIncoming);
  const ignoreIncoming = useStore((s) => s.ignoreIncoming);

  // Surface the first unresolved nudge, if any.
  const openNudge = nudges.find((n) => n.response === null);
  const nudgeConn = openNudge && connections.find((c) => c.id === openNudge.connectionId);
  const dueCount = connections.filter((c) => isDue(c.nextNudge)).length;

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
              {greeting()}, {user.name.split(' ')[0]}
            </Text>
            <Text style={[type.display, { color: colors.nearBlack }]}>Know your</Text>
            <OutlineText fontSize={34} stroke={colors.nearBlack} strokeWidth={2}>
              People
            </OutlineText>
          </View>
          <Avatar
            name={user.name}
            color={user.avatarColor}
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
            <Pill label={`${dueCount} due`} variant="due" />
          </View>
          <View style={{ transform: [{ rotate: '-1deg' }] }}>
            <Pill label={`${user.profileCompletion}% profile`} variant="default" />
          </View>
        </View>

        {/* Incoming connect requests — accept or ignore (§5B Method 3). */}
        {incomingRequests.length > 0 && (
          <View style={{ marginBottom: spacing.xl, gap: spacing.sm }}>
            <Text style={[type.label, { color: colors.textMutedOnLight }]}>
              {incomingRequests.length} wants to connect
            </Text>
            {incomingRequests.map((req) => (
              <CollageCard key={req.id} background={palette.cream} rotate="-0.6deg">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar name={req.connection.user.name} color={req.connection.user.avatarColor} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.cardTitle, { color: colors.nearBlack }]}>
                      {req.connection.user.name}
                    </Text>
                    {req.note && (
                      <Text style={[type.body, { color: colors.textMutedOnLight }]} numberOfLines={2}>
                        “{req.note}”
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 12 }}>
                  <RequestButton
                    label="Accept"
                    primary
                    onPress={() => {
                      const cid = acceptIncoming(req.id);
                      if (cid) router.push(`/icebreaker?id=${cid}`);
                    }}
                  />
                  <RequestButton label="Ignore" onPress={() => ignoreIncoming(req.id)} />
                </View>
              </CollageCard>
            ))}
          </View>
        )}

        {/* Nudge card — navy, taped, rotated, hard shadow (§8). */}
        {openNudge && nudgeConn && (
          <Animated.View entering={entrance(0)} style={{ marginBottom: spacing.xl }}>
            <Text style={[type.label, { color: colors.textMutedOnLight, marginBottom: spacing.sm }]}>
              Today’s nudge
            </Text>
            <CollageCard
              background={palette.navy}
              rotate="-0.8deg"
              taped
              tapeSide="right"
              onPress={() => router.push(`/connection/${nudgeConn.id}`)}
              style={{ paddingVertical: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={nudgeConn.user.name} color={nudgeConn.user.avatarColor} size={48} />
                <View style={{ flex: 1 }}>
                  <Pill
                    label={openNudge.trigger === 'event' ? 'New in common' : 'Time to reach out'}
                    variant="connected"
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={[type.cardTitle, { color: palette.offWhite }]}>
                    {openNudge.message}
                  </Text>
                </View>
              </View>

              {/* "Did you reach out?" — Yes logs outreach, No reschedules (§5D). */}
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 14 }}>
                <NudgeResponseButton
                  label="I reached out"
                  primary
                  onPress={() => respondToNudge(openNudge.id, 'reached_out')}
                />
                <NudgeResponseButton
                  label="Not yet"
                  onPress={() => respondToNudge(openNudge.id, 'not_yet')}
                />
              </View>
            </CollageCard>
          </Animated.View>
        )}

        {/* Gamified deep-profile prompt — value left on the table (V1.5). */}
        <ProfileQuests user={user} variant="home" />

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
                        {commonalityCount(user, c.user)} in common · {c.metContext}
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

      {/* FAB — orange, rotated 6° (§8). Opens the connect chooser. */}
      <Fab
        icon="+"
        color={palette.orange}
        rotate="6deg"
        bottom={insets.bottom + 16}
        onPress={() => router.push('/add')}
      />
    </View>
  );
}

/** Small inline response button used inside the navy nudge card. */
function NudgeResponseButton({
  label,
  primary = false,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: primary ? palette.yellow : 'transparent',
      }}
    >
      <Text style={[type.micro, { color: primary ? colors.nearBlack : palette.offWhite }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Accept/Ignore button for incoming requests (on a light cream card). */
function RequestButton({
  label,
  primary = false,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: primary ? palette.navy : 'transparent',
      }}
    >
      <Text style={[type.micro, { color: primary ? palette.cream : colors.nearBlack }]}>{label}</Text>
    </Pressable>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
