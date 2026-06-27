/**
 * Claim flow — V1.5 browser-based claim/preview (Spec §5C, §6).
 *
 * When someone invites you, this is the landing page (works in the browser, no
 * app required): it shows the inviter, what you'd have in common, and the value
 * of connecting — BEFORE asking you to download. The teaser commonalities use
 * the same engine as the rest of the app.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  Button,
  CollageCard,
  Hero,
  Pill,
} from '../../src/components';
import { cardBackgrounds, colors, palette, spacing, textOn, tiltFor, type } from '../../src/theme';
import { connections, currentUser, handleMeta, newCandidates } from '../../src/data/mock';
import { computeCommonalities } from '../../src/engine/commonality';

function findInviter(id: string) {
  return [...connections, ...newCandidates].find((c) => c.id === id);
}

export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const inviter = findInviter(String(id));

  if (!inviter) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[type.headline, { color: colors.nearBlack }]}>Invite not found</Text>
      </View>
    );
  }

  const { user } = inviter;
  // Teaser of what you'd have in common (value before download).
  const teaser = computeCommonalities(currentUser, user, 3);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <Hero
          eyebrow="Wants to connect on Knowable"
          name={user.name}
          avatarColor={user.avatarColor}
          avatarPhoto={user.photo}
          badge={teaser.length > 0 ? `${teaser.length} in common` : undefined}
          seed={11}
        />

        <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: spacing.lg }}>
          <Text style={[type.headline, { color: colors.nearBlack }]}>
            Here’s what you’d have in common
          </Text>

          {teaser.length > 0 ? (
            <View style={{ gap: spacing.md }}>
              {teaser.map((c, i) => {
                const bg = cardBackgrounds[i % cardBackgrounds.length];
                const fg = textOn(bg);
                const muted = bg === palette.cream || bg === palette.yellow
                  ? colors.textMutedOnLight
                  : colors.textMutedOnDark;
                return (
                  <CollageCard key={c.id} background={bg} rotate={tiltFor(i)} taped tapeSide={i % 2 === 0 ? 'left' : 'right'}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={[type.label, { color: muted }]}>{c.category}</Text>
                      {c.source && (
                        <Pill label={handleMeta[c.source].label} variant="source" tint={handleMeta[c.source].tint} />
                      )}
                    </View>
                    <Text style={[type.cardTitle, { color: fg, marginTop: 6 }]}>{c.title}</Text>
                  </CollageCard>
                );
              })}
            </View>
          ) : (
            <Text style={[type.body, { color: colors.textMutedOnLight }]}>
              Download Knowable to see what you have in common.
            </Text>
          )}

          {/* Value-forward CTA before any download. */}
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button label="Get Knowable & connect" variant="primary" fullWidth />
            <Button label="Maybe later" variant="secondary" fullWidth />
          </View>
          <Text style={[type.body, { color: colors.textMutedOnLight, textAlign: 'center' }]}>
            No account needed to preview. Connecting takes 60 seconds.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
