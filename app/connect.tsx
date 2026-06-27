/**
 * Connect — V1.5 light data pull manager (Spec §6 / §8 Integrations).
 *
 * Lists the data-pull platforms; connecting one runs a (simulated) pull that
 * writes signals onto the profile and feeds the commonality engine. Connected
 * platforms show their pulled highlights. Real OAuth + APIs drop in behind
 * connectDataPull/simulatePull without changing this screen.
 */
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, CollageCard, OutlineText, Pill } from '../src/components';
import { border, colors, palette, spacing, type } from '../src/theme';
import { DATA_PULL_SOURCES, dataPullBlurb } from '../src/data/datapull';
import { handleMeta } from '../src/data/mock';
import { DataPullSource } from '../src/data/types';
import { useStore } from '../src/store/useStore';

/** One-line summary of what was pulled for a connected platform. */
function pulledSummary(source: DataPullSource, pulled: ReturnType<typeof usePulled>): string | null {
  switch (source) {
    case 'spotify':
      return pulled.spotify ? pulled.spotify.topArtists.slice(0, 3).join(', ') : null;
    case 'letterboxd':
      return pulled.letterboxd ? pulled.letterboxd.favorites.slice(0, 3).join(', ') : null;
    case 'goodreads':
      return pulled.goodreads
        ? [...pulled.goodreads.reading, ...pulled.goodreads.favorites].slice(0, 3).join(', ')
        : null;
    case 'strava':
      return pulled.strava ? pulled.strava.activities.join(', ') : null;
    case 'bandsintown':
      return pulled.bandsintown ? pulled.bandsintown.artists.slice(0, 3).join(', ') : null;
    case 'polarsteps':
      return pulled.polarsteps ? pulled.polarsteps.places.slice(0, 3).join(', ') : null;
    case 'linkedin':
      return pulled.linkedin ? [pulled.linkedin.title, pulled.linkedin.company].filter(Boolean).join(' · ') : null;
  }
}

function usePulled() {
  return useStore((s) => s.user.pulled) ?? {};
}

export default function ConnectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pulled = usePulled();
  const handles = useStore((s) => s.user.handles);
  const connectDataPull = useStore((s) => s.connectDataPull);

  const isConnected = (s: DataPullSource) =>
    handles.some((h) => h.source === s && h.dataPulled);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40, height: 40, borderRadius: 20, marginTop: 6,
            backgroundColor: colors.cream, borderWidth: border.small, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: colors.nearBlack, lineHeight: 20 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[type.display, { color: colors.nearBlack }]}>Connect your</Text>
          <OutlineText fontSize={32} stroke={colors.nearBlack} strokeWidth={2}>
            worlds
          </OutlineText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + 40,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[type.body, { color: colors.textMutedOnLight }]}>
          Connect a platform to auto-match with people on the things you actually love.
        </Text>

        {DATA_PULL_SOURCES.map((s, i) => {
          const connected = isConnected(s);
          const summary = connected ? pulledSummary(s, pulled) : null;
          return (
            <CollageCard
              key={s}
              background={connected ? palette.cream : palette.cream}
              rotate={i % 2 === 0 ? '-0.4deg' : '0.5deg'}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.cardTitle, { color: colors.nearBlack }]}>
                    {handleMeta[s].label}
                  </Text>
                  <Text style={[type.body, { color: colors.textMutedOnLight }]}>
                    {connected && summary ? summary : dataPullBlurb[s]}
                  </Text>
                </View>
                {connected ? (
                  <Pill label="Pulled ★" variant="connected" />
                ) : (
                  <Button label="Connect" variant="primary" onPress={() => connectDataPull(s)} />
                )}
              </View>
            </CollageCard>
          );
        })}
      </ScrollView>
    </View>
  );
}
