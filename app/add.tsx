/**
 * Add a connection — entry chooser for the three connect methods (Spec §5B):
 * NFC bump, Search ("find someone"), and SMS invite ("invite by text").
 */
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CollageCard, OutlineText, Pill } from '../src/components';
import { border, colors, palette, spacing, type } from '../src/theme';
import { newCandidates } from '../src/data/mock';
import { useStore } from '../src/store/useStore';

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const connections = useStore((s) => s.connections);
  const addConnection = useStore((s) => s.addConnection);
  const pending = useStore((s) => s.pendingConnections);

  // NFC bump stand-in: connect the next discoverable candidate.
  const bump = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const candidate = newCandidates.find((c) => !connections.some((x) => x.id === c.id));
    if (candidate) {
      addConnection(candidate);
      router.replace(`/icebreaker?id=${candidate.id}`);
    } else {
      router.replace('/icebreaker');
    }
  };

  const methods = [
    { key: 'bump', title: 'Bump to connect', blurb: 'Tap phones with someone nearby (NFC).', bg: palette.navy, onPress: bump },
    { key: 'find', title: 'Find someone', blurb: 'Search by name and send a request.', bg: palette.cream, onPress: () => router.push('/find') },
    { key: 'invite', title: 'Invite by text', blurb: 'Not on Knowable yet? Send them a link.', bg: palette.yellow, onPress: () => router.push('/invite') },
  ];

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
          <Text style={[type.display, { color: colors.nearBlack }]}>Add a</Text>
          <OutlineText fontSize={32} stroke={colors.nearBlack} strokeWidth={2}>
            person
          </OutlineText>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + 40,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {methods.map((m, i) => (
          <CollageCard
            key={m.key}
            background={m.bg}
            rotate={i % 2 === 0 ? '-1deg' : '1deg'}
            onPress={m.onPress}
            style={{ paddingVertical: 18 }}
          >
            <Text style={[type.cardTitle, { color: m.bg === palette.navy ? palette.offWhite : colors.nearBlack, fontSize: 17 }]}>
              {m.title}
            </Text>
            <Text style={[type.body, { color: m.bg === palette.navy ? colors.textMutedOnDark : colors.textMutedOnLight, marginTop: 2 }]}>
              {m.blurb}
            </Text>
          </CollageCard>
        ))}

        {pending.length > 0 && (
          <Pressable onPress={() => router.push('/invite')} style={{ marginTop: spacing.sm }}>
            <Pill label={`${pending.length} pending invite${pending.length > 1 ? 's' : ''}`} variant="due" />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
