/**
 * Auth gate, step 1 — phone entry (dark mode, same treatment as onboarding).
 *
 * Sends a 6-digit SMS OTP via Supabase phone auth (Twilio under the hood) and
 * pushes to /auth/verify. No account/password — the phone number *is* the
 * identity. `redirect` is forwarded from the root layout when a signed-out
 * user was deep-linked somewhere specific (e.g. a claim link) so they land
 * back there once verified.
 */
import React, { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, OutlineText } from '../../src/components';
import { border, colors, fonts, palette, spacing, type } from '../../src/theme';
import { isValidPhone, normalizePhone } from '../../src/lib/phone';
import { sendPhoneOtp } from '../../src/lib/auth';

export default function PhoneScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizePhone(phone);
  const valid = isValidPhone(normalized);

  const send = async () => {
    if (!valid || sending) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSending(true);
    setError(null);
    try {
      await sendPhoneOtp(normalized);
      router.push({
        pathname: '/auth/verify',
        params: { phone: normalized, ...(redirect ? { redirect } : {}) },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send code. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBgDark }}>
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 40,
          paddingHorizontal: spacing.screen,
          paddingBottom: insets.bottom + 24,
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: spacing.lg }}>
          <View>
            <Text style={[type.display, { color: palette.offWhite }]}>What's your</Text>
            <OutlineText fontSize={34} stroke={palette.yellow} strokeWidth={2}>
              number
            </OutlineText>
          </View>
          <Text style={[type.body, { color: colors.textMutedOnDark }]}>
            Your phone number is your Knowable identity — no password needed. We'll text you a
            6-digit code.
          </Text>

          <TextInput
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(null); }}
            placeholder="+1 555 123 4567"
            placeholderTextColor={colors.textMutedOnDark}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            autoFocus
            style={{
              fontFamily: fonts.bold,
              fontSize: 18,
              color: palette.offWhite,
              backgroundColor: 'rgba(245,240,232,0.06)',
              borderWidth: border.small,
              borderColor: 'rgba(245,240,232,0.3)',
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          />
          {error ? (
            <Text style={[type.body, { color: palette.orange }]}>{error}</Text>
          ) : (
            <Text style={[type.label, { color: colors.textMutedOnDark }]}>
              Include your country code, e.g. +1 555 123 4567
            </Text>
          )}
        </View>

        <Button
          label={sending ? 'Sending…' : 'Send code'}
          variant="cta"
          fullWidth
          onPress={send}
          style={{ opacity: valid && !sending ? 1 : 0.5 }}
        />
      </View>
    </View>
  );
}
