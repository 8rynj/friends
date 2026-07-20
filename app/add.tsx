/**
 * Add a connection — entry chooser for the three connect methods (Spec §5B):
 * NFC bump, Search ("find someone"), and SMS invite ("invite by text").
 *
 * Bump drives a real NFC scan (src/nfc/tapConnect.ts): tap a tag, confirm
 * the person it identifies, then connect. Needs a dev-client/prebuilt
 * native build — it's a no-op in Expo Go and on web (see CLAUDE.md).
 */
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Avatar, Button, CollageCard, OutlineText, Pill } from '../src/components';
import { border, colors, palette, spacing, type } from '../src/theme';
import { newCandidates } from '../src/data/mock';
import { Connection } from '../src/data/types';
import { useStore } from '../src/store/useStore';
import { cancelScan, isNfcAvailable, isScanCancelled, scanForConnectId } from '../src/nfc/tapConnect';

type BumpStatus = 'idle' | 'scanning' | 'confirm' | 'unsupported' | 'error';

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const connections = useStore((s) => s.connections);
  const addConnection = useStore((s) => s.addConnection);
  const setCadence = useStore((s) => s.setCadence);
  const pending = useStore((s) => s.pendingConnections);
  const nfcEnabled = useStore((s) => s.settings.nfcEnabled);
  const defaultCadence = useStore((s) => s.settings.defaultCadence);

  const [status, setStatus] = useState<BumpStatus>('idle');
  const [found, setFound] = useState<Connection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Abort a scan in flight if the user navigates away mid-tap.
  useEffect(() => () => cancelScan(), []);

  const bump = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setStatus('scanning');
    try {
      if (!(await isNfcAvailable())) {
        setStatus('unsupported');
        return;
      }
      const candidateId = await scanForConnectId();
      const candidate = candidateId ? newCandidates.find((c) => c.id === candidateId) : undefined;
      if (!candidate) {
        setErrorMessage("That tag isn't a Knowable profile.");
        setStatus('error');
        return;
      }
      if (connections.some((c) => c.id === candidate.id)) {
        setErrorMessage(`You're already connected with ${candidate.user.name.split(' ')[0]}.`);
        setStatus('error');
        return;
      }
      setFound(candidate);
      setStatus('confirm');
    } catch (err) {
      if (isScanCancelled(err)) {
        setStatus('idle');
        return;
      }
      setErrorMessage("Couldn't read that tag — give it another tap.");
      setStatus('error');
    }
  };

  // Mutual confirmation: the scan only identifies who's there — connecting
  // still requires an explicit confirm before it lands in the store.
  const confirmConnect = () => {
    if (!found) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addConnection(found);
    setCadence(found.id, defaultCadence);
    const id = found.id;
    setStatus('idle');
    setFound(null);
    router.replace(`/icebreaker?id=${id}`);
  };

  const dismiss = () => {
    cancelScan();
    setStatus('idle');
    setFound(null);
    setErrorMessage(null);
  };

  const methods = [
    {
      key: 'bump',
      title: nfcEnabled ? 'Bump to connect' : 'Bump to connect (NFC off)',
      blurb: nfcEnabled ? 'Tap phones with someone nearby (NFC).' : 'Turn NFC on in Settings to bump.',
      bg: palette.navy,
      disabled: !nfcEnabled,
      onPress: nfcEnabled ? bump : () => router.push('/settings'),
    },
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
            style={{ paddingVertical: 18, opacity: 'disabled' in m && m.disabled ? 0.55 : 1 }}
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

      <Modal visible={status !== 'idle'} transparent animationType="fade" onRequestClose={dismiss}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(20,18,14,0.6)',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: spacing.screen,
          }}
        >
          {status === 'scanning' && (
            <CollageCard background={palette.navy} rotate="-0.6deg" style={{ alignItems: 'center', paddingVertical: 26 }}>
              <Text style={{ fontSize: 30 }}>📲</Text>
              <Text style={[type.cardTitle, { color: palette.offWhite, marginTop: 10, textAlign: 'center' }]}>
                Hold your phone near theirs
              </Text>
              <Text style={[type.body, { color: colors.textMutedOnDark, marginTop: 4, textAlign: 'center' }]}>
                Waiting for a tap…
              </Text>
              <Button label="Cancel" variant="secondary" onPress={dismiss} style={{ marginTop: spacing.md }} />
            </CollageCard>
          )}

          {status === 'confirm' && found && (
            <CollageCard background={palette.cream} rotate="0.5deg" taped style={{ alignItems: 'center', paddingVertical: 26 }}>
              <Avatar name={found.user.name} color={found.user.avatarColor} size={64} shadowed />
              <Text style={[type.cardTitle, { color: colors.nearBlack, marginTop: 12, textAlign: 'center' }]}>
                Connect with {found.user.name}?
              </Text>
              <Text style={[type.body, { color: colors.textMutedOnLight, marginTop: 4, textAlign: 'center' }]}>
                You both tapped — confirm to add them.
              </Text>
              <View style={{ gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' }}>
                <Button label="Connect" variant="primary" fullWidth onPress={confirmConnect} />
                <Button label="Not now" variant="secondary" fullWidth onPress={dismiss} />
              </View>
            </CollageCard>
          )}

          {status === 'unsupported' && (
            <CollageCard background={colors.cream} rotate="-0.4deg" style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={[type.cardTitle, { color: colors.nearBlack, textAlign: 'center' }]}>NFC isn't available here</Text>
              <Text style={[type.body, { color: colors.textMutedOnLight, marginTop: 4, textAlign: 'center' }]}>
                Bump needs a physical device with NFC turned on — it won't work in Expo Go, the simulator, or on web.
              </Text>
              <Button label="Got it" variant="secondary" onPress={dismiss} style={{ marginTop: spacing.md }} />
            </CollageCard>
          )}

          {status === 'error' && (
            <CollageCard background={palette.orange} rotate="0.4deg" style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={[type.cardTitle, { color: palette.cream, textAlign: 'center' }]}>{errorMessage}</Text>
              <View style={{ gap: spacing.sm, marginTop: spacing.md, alignSelf: 'stretch' }}>
                <Button label="Try again" variant="secondary" onPress={bump} />
                <Button label="Dismiss" variant="secondary" onPress={dismiss} />
              </View>
            </CollageCard>
          )}
        </View>
      </Modal>
    </View>
  );
}
