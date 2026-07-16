/**
 * Invite by text — SMS invite connect flow (Spec §5B Method 2, §5C).
 *
 * Enter a name + number to create a pending connection (30-day expiry) and a
 * pre-filled invite message. The pending invite shows "waiting to join" with
 * days remaining; "Preview claim link" opens what the recipient would see.
 */
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CollageCard, OutlineText, Pill } from '../src/components';
import { border, colors, fonts, palette, radii, spacing, type } from '../src/theme';
import { isValidPhone, normalizePhone } from '../src/lib/phone';
import { useStore } from '../src/store/useStore';

function daysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

export default function InviteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const user = useStore((s) => s.user);
  const pending = useStore((s) => s.pendingConnections);
  const createPendingInvite = useStore((s) => s.createPendingInvite);
  const cancelPending = useStore((s) => s.cancelPending);

  const normalizedPhone = normalizePhone(phone);
  const phoneValid = isValidPhone(normalizedPhone);

  const send = () => {
    if (!name.trim() || !phoneValid) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    createPendingInvite(name.trim(), normalizedPhone);
    setName('');
    setPhone('');
  };

  const messagePreview = `Hey! It’s ${user.name.split(' ')[0]} — connect with me on Knowable so we don’t lose touch: knowable.app/claim`;

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
          <Text style={[type.display, { color: colors.nearBlack }]}>Invite by</Text>
          <OutlineText fontSize={32} stroke={colors.nearBlack} strokeWidth={2}>
            text
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
        <TextInput value={name} onChangeText={setName} placeholder="Their name" placeholderTextColor={colors.textMutedOnLight} style={inputStyle} />
        <TextInput value={phone} onChangeText={setPhone} placeholder="Their number, e.g. +1 555 123 4567" keyboardType="phone-pad" placeholderTextColor={colors.textMutedOnLight} style={inputStyle} />
        {phone.trim().length > 0 && !phoneValid && (
          <Text style={[type.label, { color: colors.orange, marginTop: -spacing.sm }]}>
            Include the country code, e.g. +1 555 123 4567
          </Text>
        )}

        {/* Pre-filled message preview (would open iMessage/SMS on device). */}
        <View style={{ backgroundColor: palette.offWhite, borderRadius: radii.card, borderWidth: border.small, borderColor: colors.border, padding: 12 }}>
          <Text style={[type.label, { color: colors.textMutedOnLight, marginBottom: 4 }]}>Message preview</Text>
          <Text style={[type.body, { color: colors.nearBlack }]}>{messagePreview}</Text>
        </View>

        <Pressable
          onPress={send}
          disabled={!name.trim() || !phoneValid}
          style={{
            opacity: !name.trim() || !phoneValid ? 0.5 : 1,
            backgroundColor: colors.nearBlack, borderRadius: radii.pill,
            borderWidth: 2, borderColor: colors.border, paddingVertical: 14, alignItems: 'center',
          }}
        >
          <Text style={[type.label, { color: palette.offWhite, letterSpacing: 0.8 }]}>Send invite</Text>
        </Pressable>

        {pending.length > 0 && (
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Text style={[type.label, { color: colors.textMutedOnLight }]}>Pending invites</Text>
            {pending.map((p) => (
              <CollageCard key={p.id} background={palette.cream} rotate="-0.4deg">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.cardTitle, { color: colors.nearBlack }]}>{p.name ?? p.phone}</Text>
                    <Text style={[type.body, { color: colors.textMutedOnLight }]}>
                      Waiting to join · expires in {daysLeft(p.expiresAt)} days
                    </Text>
                  </View>
                  <Pill label="Pending" variant="due" />
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 12 }}>
                  <Pressable
                    onPress={() => router.push(`/claim/${p.id}`)}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border, backgroundColor: palette.navy }}
                  >
                    <Text style={[type.micro, { color: palette.cream }]}>Preview claim link</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => cancelPending(p.id)}
                    style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 9, paddingHorizontal: 16, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border }}
                  >
                    <Text style={[type.micro, { color: colors.nearBlack }]}>Cancel</Text>
                  </Pressable>
                </View>
              </CollageCard>
            ))}
          </View>
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
