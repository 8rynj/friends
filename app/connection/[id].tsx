/**
 * Connection Profile — Design Guidelines §8 (Connection Profile), Spec §5D.
 *
 * Navy hero with outline last name + taped avatar + an orange "X common" badge,
 * ripped-edge transition into cream content, a row of three contact buttons that
 * deep-link out (placeholders for now), a dark taped log strip with a blue
 * offset shadow, and alternating taped commonality cards. Shows last-contacted
 * and next-nudge per the follow-up flow.
 */
import React from 'react';
import { Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Button,
  CollageCard,
  Hero,
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
import { getConnection, handleMeta } from '../../src/data/mock';
import { HandleSource } from '../../src/data/types';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';

/** Maps a shared handle to an outbound deep link (placeholders for V1). */
function deepLink(source: HandleSource, handle: string): string {
  const h = handle.replace(/^@/, '');
  switch (source) {
    case 'instagram':
      return `https://instagram.com/${h}`;
    case 'linkedin':
      return `https://linkedin.com/in/${h}`;
    case 'spotify':
      return `https://open.spotify.com/user/${h}`;
    case 'strava':
      return `https://strava.com/athletes/${h}`;
    case 'bandsintown':
      return `https://bandsintown.com/${h}`;
    case 'letterboxd':
      return `https://letterboxd.com/${h}`;
    default:
      return `https://${source}.com/${h}`;
  }
}

export default function ConnectionProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const connection = getConnection(String(id));

  if (!connection) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[type.headline, { color: colors.nearBlack }]}>Not found</Text>
      </View>
    );
  }

  const { user, commonalities, sharedContactInfo } = connection;
  const entrance = (i: number) =>
    reduced ? undefined : FadeInDown.delay(120 + i * 90).springify().damping(16);

  // The three contact methods to surface (§8 — row of three).
  const contactSources = sharedContactInfo.slice(0, 3);
  const handleFor = (s: HandleSource) =>
    user.handles.find((h) => h.source === s)?.value ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Hero
          eyebrow={`${connection.connectionType} · met via ${connection.method.toUpperCase()}`}
          name={user.name}
          avatarColor={user.avatarColor}
          avatarPhoto={user.photo}
          badge={`${commonalities.length} common`}
          seed={hashSeed(connection.id)}
          onBack={() => router.back()}
        />

        <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: spacing.lg }}>
          {/* Contact buttons — row of three (§8). */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {contactSources.map((s) => (
              <View key={s} style={{ flex: 1 }}>
                <Button
                  label={handleMeta[s].label}
                  variant="secondary"
                  onPress={() => {
                    const url = deepLink(s, handleFor(s));
                    if (Platform.OS !== 'web') Linking.openURL(url).catch(() => {});
                  }}
                />
              </View>
            ))}
          </View>

          {/* Log strip — dark, taped, blue offset shadow (§8). */}
          <CollageCard
            background={palette.nearBlack}
            rotate="-0.5deg"
            shadowColor={colors.shadowBlue}
            taped
            tapeOnDark
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={[type.label, { color: colors.textMutedOnDark }]}>Last contacted</Text>
                <Text style={[type.cardTitle, { color: palette.offWhite }]}>
                  {connection.lastContacted ? formatDate(connection.lastContacted) : 'Not yet'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[type.label, { color: colors.textMutedOnDark }]}>Next nudge</Text>
                <Text style={[type.cardTitle, { color: palette.yellow }]}>
                  {connection.nextNudge ? formatDate(connection.nextNudge) : '—'}
                </Text>
              </View>
            </View>
          </CollageCard>

          {/* Commonalities — alternating taped, tilted cards (§8). */}
          <View style={{ gap: spacing.md }}>
            <Text style={[type.headline, { color: colors.nearBlack }]}>In common</Text>
            {commonalities.map((c, i) => {
              const bg = cardBackgrounds[(i + 2) % cardBackgrounds.length];
              const fg = textOn(bg);
              const muted =
                bg === palette.cream || bg === palette.yellow
                  ? colors.textMutedOnLight
                  : colors.textMutedOnDark;
              return (
                <Animated.View key={c.id} entering={entrance(i)}>
                  <CollageCard
                    background={bg}
                    rotate={tiltFor(i + 1)}
                    taped
                    tapeSide={i % 2 === 0 ? 'left' : 'right'}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={[type.label, { color: muted }]}>{c.category}</Text>
                      {c.source && (
                        <Pill
                          label={handleMeta[c.source].label}
                          variant="source"
                          tint={handleMeta[c.source].tint}
                        />
                      )}
                    </View>
                    <Text style={[type.cardTitle, { color: fg, marginTop: 6 }]}>{c.title}</Text>
                    {c.detail && (
                      <Text style={[type.body, { color: muted, marginTop: 4 }]}>{c.detail}</Text>
                    )}
                  </CollageCard>
                </Animated.View>
              );
            })}
          </View>

          {/* Contact history (§5D timeline). */}
          {connection.contactHistory.length > 0 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={[type.label, { color: colors.textMutedOnLight }]}>Contact history</Text>
              {connection.contactHistory.map((entry) => (
                <View key={entry.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.navy }} />
                  <Text style={[type.body, { color: colors.nearBlack }]}>
                    {formatDate(entry.date)} · {entry.via}
                    {entry.note ? ` — ${entry.note}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Stable small integer from a string for unique ripped-edge tears. */
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h + 1;
}
