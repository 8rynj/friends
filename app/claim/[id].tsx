/**
 * Claim flow — browser-based claim/preview (Spec §5C, §6 V1.5).
 *
 * Three modes, tried in order:
 *  - Local pending invite: this device is the inviter's own (their local
 *    `pendingConnections` has the entry) — a same-device preview/demo of what
 *    the invite looks like, using the current user's own profile as the
 *    inviter's stand-in. Claiming here only works when Supabase isn't
 *    configured (against a real backend, an inviter can't claim their own
 *    invite — see `claimPending`'s doc in useStore.ts).
 *  - Remote pending invite (the real cross-device path, Spec §5C): a
 *    different signed-in user's device has no local record of an invite it
 *    didn't create, so this fetches the inviter's preview by the link's
 *    token via `preview_pending_connection` (reachable while signed out) and
 *    claims via `claim_pending_connection` once signed in.
 *  - Directory preview: shows an app member who wants to connect, with
 *    engine-computed teaser commonalities (mock-pool fallback).
 *
 * Either way: value is shown before any download is required — this screen is
 * on the root layout's public-preview allowlist (`app/_layout.tsx`) so it's
 * reachable while signed out. Only the claim action itself requires phone
 * auth: tapping "Get Knowable & connect" while signed out routes to
 * /auth/phone with a redirect back here, so the recipient verifies the same
 * phone number the invite was sent to before the connection is created.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Avatar,
  Button,
  CollageCard,
  ErrorState,
  Hero,
  Pill,
} from '../../src/components';
import { cardBackgrounds, colors, palette, spacing, textOn, tiltFor, type } from '../../src/theme';
import { connections as mockConnections, currentUser, directory, handleMeta } from '../../src/data/mock';
import { computeCommonalities } from '../../src/engine/commonality';
import { normalizePhone } from '../../src/lib/phone';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import { previewPendingByToken } from '../../src/data/repository';
import { useStore } from '../../src/store/useStore';
import { useAuthStore } from '../../src/store/useAuthStore';

function findInviter(id: string) {
  return [...mockConnections, ...directory].find((c) => c.id === id);
}

type RemotePreview = Awaited<ReturnType<typeof previewPendingByToken>>;

export default function ClaimScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = String(id);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const me = useStore((s) => s.user);
  const pending = useStore((s) => s.pendingConnections.find((p) => p.id === token || p.token === token));
  const claimPending = useStore((s) => s.claimPending);
  const claimInviteByToken = useStore((s) => s.claimInviteByToken);
  const sendConnectRequest = useStore((s) => s.sendConnectRequest);
  const authStatus = useAuthStore((s) => s.status);
  const authPhone = useAuthStore((s) => s.phone);

  // --- Remote pending-invite mode: fetch by token when there's no local match. ---
  const [remote, setRemote] = useState<RemotePreview>(null);
  const [remoteChecked, setRemoteChecked] = useState(false);
  useEffect(() => {
    if (pending || !isSupabaseConfigured) {
      setRemoteChecked(true);
      return;
    }
    let cancelled = false;
    previewPendingByToken(token).then((result) => {
      if (!cancelled) {
        setRemote(result);
        setRemoteChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pending, token]);

  // --- Pending-invite mode: recipient sees the inviter (current user). ---
  if (pending) {
    const phoneMismatch =
      authStatus === 'signedIn' && !!authPhone && authPhone !== normalizePhone(pending.phone);

    const onClaim = () => {
      if (authStatus !== 'signedIn') {
        router.push({ pathname: '/auth/phone', params: { redirect: `/claim/${token}` } });
        return;
      }
      const cid = claimPending(pending.id, authPhone ?? undefined);
      if (cid) router.replace(`/connection/${cid}`);
    };

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
              <Button label="Get Knowable & connect" variant="primary" fullWidth onPress={onClaim} />
              <Button label="Maybe later" variant="secondary" fullWidth onPress={() => router.back()} />
            </View>
            {phoneMismatch && (
              <Text style={[type.body, { color: colors.orange, textAlign: 'center' }]}>
                This invite was sent to {pending.phone} — you're signed in as {authPhone}.
              </Text>
            )}
            <Text style={[type.body, { color: colors.textMutedOnLight, textAlign: 'center' }]}>
              No account needed to preview. Connecting takes 60 seconds.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Remote pending-invite mode: the real cross-device claim (Spec §5C). ---
  if (isSupabaseConfigured && !remoteChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.nearBlack} />
      </View>
    );
  }

  if (remote) {
    if (remote.claimed) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center', padding: spacing.screen }}>
          <ErrorState
            title="Already claimed"
            body="This invite has already been used."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        </View>
      );
    }
    if (new Date(remote.expiresAt) < new Date()) {
      return (
        <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center', padding: spacing.screen }}>
          <ErrorState
            title="Invite expired"
            body="This invite link is more than 30 days old."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        </View>
      );
    }

    const onClaimRemote = async () => {
      if (authStatus !== 'signedIn') {
        router.push({ pathname: '/auth/phone', params: { redirect: `/claim/${token}` } });
        return;
      }
      const cid = await claimInviteByToken(token);
      if (cid) router.replace(`/connection/${cid}`);
    };

    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <Hero
            eyebrow="Wants to connect with you on Knowable"
            name={remote.inviterName}
            avatarColor={remote.inviterAvatarColor}
            avatarPhoto={remote.inviterPhoto}
            seed={13}
          />
          <View style={{ paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: spacing.lg }}>
            <Text style={[type.headline, { color: colors.nearBlack }]}>
              {remote.inviterName.split(' ')[0]} is into
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(remote.inviterTopHobbies.length ? remote.inviterTopHobbies : remote.inviterHobbies).slice(0, 6).map((h) => (
                <Pill key={h} label={h} variant="connected" />
              ))}
            </View>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <Button label="Get Knowable & connect" variant="primary" fullWidth onPress={onClaimRemote} />
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

  // --- Directory-preview mode: an app member who wants to connect (mock-pool fallback). ---
  const inviter = findInviter(String(id));
  if (!inviter) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center', padding: spacing.screen }}>
        <ErrorState
          title="Invite not found"
          body="This link may have expired or already been claimed."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const { user } = inviter;
  const teaser = computeCommonalities(currentUser, user, 3);

  const onRequestConnect = async () => {
    if (authStatus !== 'signedIn') {
      router.push({ pathname: '/auth/phone', params: { redirect: `/claim/${token}` } });
      return;
    }
    const res = await sendConnectRequest(inviter.id);
    if (res.outcome === 'accepted') router.replace(`/icebreaker?id=${res.connectionId}`);
    else router.back();
  };

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
            <Button label="Get Knowable & connect" variant="primary" fullWidth onPress={onRequestConnect} />
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
