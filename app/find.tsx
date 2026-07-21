/**
 * Find someone — Search connect flow (Spec §5B Method 3).
 *
 * Search the directory by name (results show name + photo only — full profiles
 * unlock on connect), send a request with an optional note. Requests resolve by
 * the person's mock disposition: most accept (→ connection + icebreaker), one
 * ignores, demonstrating the ignore / 3-tries / pending-indefinitely rule.
 */
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Avatar, EmptyState, OutlineText } from '../src/components';
import { border, colors, fonts, palette, radii, spacing, type } from '../src/theme';
import { directory } from '../src/data/mock';
import { useStore } from '../src/store/useStore';

export default function FindScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  const connections = useStore((s) => s.connections);
  const outgoing = useStore((s) => s.outgoingRequests);
  const sendConnectRequest = useStore((s) => s.sendConnectRequest);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      directory.filter(
        (d) =>
          !connections.some((c) => c.id === d.id) &&
          (q ? d.user.name.toLowerCase().includes(q) : true),
      ),
    [connections, q],
  );

  const statusFor = (id: string) => outgoing.find((r) => r.personId === id)?.status;

  const send = (id: string, name: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    const res = sendConnectRequest(id, note.trim() || undefined);
    if (res.outcome === 'accepted') {
      router.push(`/icebreaker?id=${res.connectionId}`);
    } else if (res.outcome === 'ignored') {
      setFlash(`${name} isn’t ready to connect yet — you can try again.`);
    } else if (res.outcome === 'blocked') {
      setFlash(`${name} hasn’t responded after 3 requests. It’ll stay pending.`);
    }
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
          <Text style={[type.display, { color: colors.nearBlack }]}>Find</Text>
          <OutlineText fontSize={32} stroke={colors.nearBlack} strokeWidth={2}>
            someone
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
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name…"
          placeholderTextColor={colors.textMutedOnLight}
          accessibilityLabel="Search by name"
          style={inputStyle}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note (optional)"
          placeholderTextColor={colors.textMutedOnLight}
          accessibilityLabel="Add a note (optional)"
          style={inputStyle}
        />

        {flash && (
          <View style={{ backgroundColor: palette.orange, borderRadius: radii.card, borderWidth: border.small, borderColor: colors.border, padding: 12 }}>
            <Text style={[type.body, { color: palette.cream }]}>{flash}</Text>
          </View>
        )}

        {results.map((d) => {
          const status = statusFor(d.id);
          const blocked = status === 'blocked';
          const label = blocked ? 'Pending' : status === 'ignored' ? 'Try again' : 'Add';
          return (
            <View
              key={d.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12,
                backgroundColor: palette.cream, borderRadius: radii.card,
                borderWidth: border.card, borderColor: colors.border, padding: 12,
              }}
            >
              {/* Name + photo only until connected (§5B). */}
              <Avatar name={d.user.name} color={d.user.avatarColor} size={44} />
              <Text style={[type.cardTitle, { color: colors.nearBlack, flex: 1 }]}>{d.user.name}</Text>
              <Pressable
                disabled={blocked}
                onPress={() => send(d.id, d.user.name)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={`${label} ${d.user.name}`}
                accessibilityState={{ disabled: blocked }}
                style={{
                  opacity: blocked ? 0.5 : 1,
                  backgroundColor: status === 'ignored' ? 'transparent' : colors.nearBlack,
                  borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border,
                  paddingVertical: 9, paddingHorizontal: 16,
                }}
              >
                <Text style={[type.micro, { color: status === 'ignored' ? colors.nearBlack : palette.offWhite }]}>
                  {label}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {results.length === 0 && (
          <EmptyState
            icon="🔍"
            title={q ? 'No one found' : 'No one to show'}
            body={q ? `No one matches “${query.trim()}.”` : 'Everyone nearby is already in your people.'}
          />
        )}
      </ScrollView>
    </View>
  );
}

const inputStyle = {
  fontFamily: fonts.medium,
  fontSize: 15,
  color: colors.nearBlack,
  backgroundColor: palette.offWhite,
  borderWidth: border.small,
  borderColor: colors.border,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 11,
} as const;
