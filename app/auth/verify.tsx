/**
 * Auth gate, step 2 — OTP verification (dark mode, same treatment as onboarding).
 *
 * Verifies the 6-digit SMS code against the phone from /auth/phone. On success
 * Supabase establishes a session; the root layout's auth-state subscription
 * picks that up and redirects away from the auth group (honoring `redirect`
 * if one was passed through), so this screen never navigates on success itself.
 */
import React, { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Button, OutlineText } from '../../src/components';
import { border, colors, fonts, palette, spacing, type } from '../../src/theme';
import { sendPhoneOtp, verifyPhoneOtp } from '../../src/lib/auth';

export default function VerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { phone, redirect } = useLocalSearchParams<{ phone: string; redirect?: string }>();

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const valid = /^\d{6}$/.test(code);

  const verify = async () => {
    if (!valid || verifying || !phone) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setVerifying(true);
    setError(null);
    try {
      await verifyPhoneOtp(phone, code);
      // Root layout redirects once the session lands — nothing to do here.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code didn’t work. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (resending || !phone) return;
    setResending(true);
    setError(null);
    try {
      await sendPhoneOtp(phone);
      setResent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resend code.');
    } finally {
      setResending(false);
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
          <Pressable onPress={() => router.back()} style={{ alignSelf: 'flex-start' }}>
            <Text style={[type.label, { color: colors.textMutedOnDark }]}>‹ Back</Text>
          </Pressable>
          <View>
            <Text style={[type.display, { color: palette.offWhite }]}>Enter the</Text>
            <OutlineText fontSize={34} stroke={palette.yellow} strokeWidth={2}>
              code
            </OutlineText>
          </View>
          <Text style={[type.body, { color: colors.textMutedOnDark }]}>
            We sent a 6-digit code to {phone}.
          </Text>

          <TextInput
            value={code}
            onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 6)); setError(null); }}
            placeholder="123456"
            placeholderTextColor={colors.textMutedOnDark}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={6}
            autoFocus
            style={{
              fontFamily: fonts.bold,
              fontSize: 24,
              letterSpacing: 6,
              textAlign: 'center',
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
          ) : resent ? (
            <Text style={[type.body, { color: colors.textMutedOnDark }]}>Code resent.</Text>
          ) : null}

          <Pressable onPress={resend} disabled={resending} style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Text style={[type.label, { color: palette.yellow }]}>
              {resending ? 'Resending…' : 'Resend code'}
            </Text>
          </Pressable>
        </View>

        <Button
          label={verifying ? 'Verifying…' : 'Verify'}
          variant="cta"
          fullWidth
          onPress={verify}
          style={{ opacity: valid && !verifying ? 1 : 0.5 }}
        />
      </View>
    </View>
  );
}
