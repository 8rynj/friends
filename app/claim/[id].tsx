/**
 * Claim flow — browser-based claim/preview (Spec §5C, §6 V1.5).
 *
 * Two modes:
 *  - Pending invite (SMS, Method 2): the recipient sees who invited them
 *    (the current user) and a value-first CTA; claiming confirms the pending
 *    connection. This is what Person B lands on from the SMS link.
 *  - Directory preview: shows an app member who wants to connect, with
 *    engine-computed teaser commonalities.
 *
 * Either way: value is shown before any download is required.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Avatar,
  Button,
  CollageCard,
  Hero,
  Pill,
} from '../../src/components';
import { cardBackgrounds, colors, palette, spacing, textOn, tiltFor, type } from '../../src/theme';
import { connections as mockConnections, currentUser, directory, handleMeta } from '../../src/data/mock';
import { computeCommonalities } from '../../src/engine/commonality';
import { useStore } from '../../src/store/useStore';

function findInviter(id: string) {
  return [...mockConnections, ...directory].find((c) => c.id === id);
}

export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const me = useStore((s) => s.user);
  const pending = useStore((s) => s.pendingConnections.find((p) => p.id === String(id)));
  const claimPending = useStore((s) => s.claimPending);

  // --- Pending-invite mode: recipient sees the inviter (current user). ---
  if (pending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <Hero
            eyebrow="Wants to connect with you on Knowable"
            name={me.name}
            avatarColor={me.avatarColor}
            avatarPhoto={me.photo}
            seed={13}
          />
          <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: spacing.lg }}>
            <Text style={[type.headline, { color: colors.nearBlack }]}>
              {me.name.split(' ')[0]} is into
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(me.topHobbies.length ? me.topHobbies : me.hobbies).slice(0, 6).map((h) => (
                <Pill key={h} label={h} variant="connected" />
              ))}
            </View>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Button
                label="Get Knowable & connect"
                variant="primary"
                fullWidth
                onPress={() => {
                  const cid = claimPending(pending.id);
                  if (cid) router.replace(`/connection/${cid}`);
                }}
              />
              <Button label="Maybe later" variant="secondary" fullWidth onPress={() => router.back()} />
            </View>
            <Text style={[type.body, { color: colors.textMutedOnLight, textAlign: 'center' }]}>
              No account needed to preview. Connecting takes 60 seconds.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Directory-preview mode: an app member who wants to connect. ---
  const inviter = findInviter(String(id));
  if (!inviter) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[type.headline, { color: colors.nearBlack }]}>Invite not found</Text>
      </View>
    );
  }

  const { user } = inviter;
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
