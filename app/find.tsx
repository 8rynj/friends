/**
 * Find someone — Search connect flow (Spec §5B Method 3).
 *
 * Searches the real directory (`search_profiles`) when signed into a real
 * Supabase backend, else the local mock pool (`src/data/mock.ts`) — either
 * way, results show name + photo only (full profiles unlock on connect).
 * Sending a request against the real backend always lands 'pending' (the
 * other person has to actually accept — see the Home tab's incoming-request
 * card); against the mock pool it resolves instantly by a fixed disposition,
 * demonstrating the ignore / 3-tries / pending-indefinitely rule.
 */
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Avatar, EmptyState, OutlineText } from '../src/components';
import { border, colors, fonts, palette, radii, spacing, type } from '../src/theme';
import { useStore } from '../src/store/useStore';

interface DirectoryResult {
  id: string;
  name: string;
  avatarColor?: string;
  photo?: string;
}

export default function FindScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [metLocation, setMetLocation] = useState('');
  const [metEvent, setMetEvent] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [results, setResults] = useState<DirectoryResult[]>([]);

  const connections = useStore((s) => s.connections);
  const outgoing = useStore((s) => s.outgoingRequests);
  const searchDirectory = useStore((s) => s.searchDirectory);
  const sendConnectRequest = useStore((s) => s.sendConnectRequest);

  // Debounced so a real-backend search doesn't fire on every keystroke.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      searchDirectory(query).then((r) => {
        if (!cancelled) setResults(r);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, connections, searchDirectory]);

  const statusFor = (id: string) => outgoing.find((r) => r.personId === id)?.status;

  const send = async (id: string, name: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    const met =
      metLocation.trim() || metEvent.trim()
        ? { location: metLocation.trim() || undefined, event: metEvent.trim() || undefined }
        : undefined;
    const res = await sendConnectRequest(id, note.trim() || undefined, met);
    if (res.outcome === 'accepted') {
      router.push(`/icebreaker?id=${res.connectionId}`);
    } else if (res.outcome === 'pending') {
      setFlash(`Request sent to ${name} — you’ll connect once they accept.`);
    } else if (res.outcome === 'ignored') {
      setFlash(`${name} isn’t ready to connect yet — you can try again.`);
    } else if (res.outcome === 'blocked') {
      setFlash(`${name} hasn’t responded after 3 requests. It’ll stay pending.`);
    } else if (res.outcome === 'error') {
      setFlash("Couldn't send that request — try again.");
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
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            value={metLocation}
            onChangeText={setMetLocation}
            placeholder="Where'd you meet?"
            placeholderTextColor={colors.textMutedOnLight}
            style={[inputStyle, { flex: 1, minWidth: 0 }]}
          />
          <TextInput
            value={metEvent}
            onChangeText={setMetEvent}
            placeholder="Occasion (optional)"
            placeholderTextColor={colors.textMutedOnLight}
            style={[inputStyle, { flex: 1, minWidth: 0 }]}
          />
        </View>

        {flash && (
          <View style={{ backgroundColor: palette.orange, borderRadius: radii.card, borderWidth: border.small, borderColor: colors.border, padding: 12 }}>
            <Text style={[type.body, { color: colors.nearBlack }]}>{flash}</Text>
          </View>
        )}

        {results.map((d) => {
          const status = statusFor(d.id);
          const blocked = status === 'blocked' || status === 'pending';
          const label = status === 'blocked' || status === 'pending' ? 'Pending' : status === 'ignored' ? 'Try again' : 'Add';
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
              <Avatar name={d.name} color={d.avatarColor} size={44} />
              <Text style={[type.cardTitle, { color: colors.nearBlack, flex: 1 }]}>{d.name}</Text>
              <Pressable
                disabled={blocked}
                onPress={() => send(d.id, d.name)}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                accessibilityRole="button"
                accessibilityLabel={`${label} ${d.name}`}
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
            title={query.trim() ? 'No one found' : 'No one to show'}
            body={query.trim() ? `No one matches “${query.trim()}.”` : 'Everyone nearby is already in your people.'}
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
