/**
 * Connect — V1.5 light data pull manager (Spec §6 / §8 Integrations).
 *
 * Lists the data-pull platforms; connecting one pulls signals onto the
 * profile and feeds the commonality engine. Letterboxd runs a real
 * (unofficial, username-based) pull; Spotify runs a real OAuth pull once
 * `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` is configured (falls back to the simulated
 * dev pull otherwise, same as every other source, which has no real adapter
 * yet). Connected platforms show their pulled highlights.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, CollageCard, OutlineText, Pill, SkeletonBlock } from '../src/components';
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
  const [pulling, setPulling] = useState<DataPullSource | null>(null);

  const isConnected = (s: DataPullSource) =>
    handles.some((h) => h.source === s && h.dataPulled);

  // Spotify runs a real OAuth pull when configured (opens the system browser
  // for consent); everything else but Letterboxd still runs the simulated dev
  // fallback. Either way `connectDataPull` is async, so await it and surface
  // any error (auth cancelled, network down, ...) instead of assuming success.
  const [pullErrors, setPullErrors] = useState<Partial<Record<DataPullSource, string>>>({});
  const pull = async (s: DataPullSource) => {
    setPulling(s);
    setPullErrors((e) => ({ ...e, [s]: undefined }));
    const result = await connectDataPull(s);
    setPulling(null);
    if (!result.ok) setPullErrors((e) => ({ ...e, [s]: result.error }));
  };

  const [letterboxdUsername, setLetterboxdUsername] = useState(
    () => handles.find((h) => h.source === 'letterboxd')?.value ?? '',
  );
  const [letterboxdPulling, setLetterboxdPulling] = useState(false);
  const [letterboxdError, setLetterboxdError] = useState<string | null>(null);

  const pullLetterboxd = async () => {
    if (letterboxdPulling || !letterboxdUsername.trim()) return;
    setLetterboxdPulling(true);
    setLetterboxdError(null);
    const result = await connectDataPull('letterboxd', { username: letterboxdUsername });
    setLetterboxdPulling(false);
    if (!result.ok) setLetterboxdError(result.error);
  };

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
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 44, height: 44, borderRadius: 22, marginTop: 6,
            backgroundColor: colors.cream, borderWidth: border.small, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text allowFontScaling={false} style={{ fontSize: 18, color: colors.nearBlack, lineHeight: 20 }}>‹</Text>
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
          const rotate = i % 2 === 0 ? '-0.4deg' : '0.5deg';

          if (s === 'letterboxd' && !connected) {
            return (
              <CollageCard key={s} background={palette.cream} rotate={rotate}>
                <Text style={[type.cardTitle, { color: colors.nearBlack }]}>
                  {handleMeta[s].label}
                </Text>
                <Text style={[type.body, { color: colors.textMutedOnLight, marginBottom: spacing.sm }]}>
                  {dataPullBlurb[s]} — enter your public username
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    value={letterboxdUsername}
                    onChangeText={(v) => {
                      setLetterboxdUsername(v);
                      setLetterboxdError(null);
                    }}
                    placeholder="username"
                    placeholderTextColor={colors.textMutedOnLight}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={{
                      flex: 1,
                      borderWidth: border.small,
                      borderColor: colors.border,
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      color: colors.nearBlack,
                      backgroundColor: colors.appBg,
                      fontFamily: type.body.fontFamily,
                      fontSize: type.body.fontSize,
                    }}
                  />
                  <Button
                    label={letterboxdPulling ? 'Pulling…' : 'Pull'}
                    variant="primary"
                    onPress={pullLetterboxd}
                  />
                </View>
                {letterboxdError ? (
                  <Text style={[type.body, { color: colors.nearBlack, marginTop: 6 }]}>
                    {letterboxdError}
                  </Text>
                ) : null}
              </CollageCard>
            );
          }

          return (
            <CollageCard key={s} background={palette.cream} rotate={rotate}>
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
                ) : pulling === s ? (
                  <View
                    style={{ width: 100 }}
                    accessible
                    accessibilityRole="progressbar"
                    accessibilityLabel={`Connecting ${handleMeta[s].label}`}
                  >
                    <SkeletonBlock height={44} radius={100} />
                  </View>
                ) : (
                  <Button
                    label="Connect"
                    variant="primary"
                    onPress={() => pull(s)}
                    accessibilityLabel={`Connect ${handleMeta[s].label}`}
                  />
                )}
              </View>
              {!connected && pullErrors[s] ? (
                <Text style={[type.body, { color: colors.nearBlack, marginTop: 6 }]}>
                  {pullErrors[s]}
                </Text>
              ) : null}
            </CollageCard>
          );
        })}
      </ScrollView>
    </View>
  );
}
