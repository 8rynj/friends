/**
 * ProfileQuests — Design Guidelines §8 / Spec §5A, §6 V1.5 "gamified deep
 * profile". Surfaces skipped profile sections as prompts framed around the
 * value each unlocks (not a reward to unlock — value being left on the table).
 *
 * variant "home": a single highest-value prompt card for the home screen.
 * variant "full": the full list of remaining prompts for the You tab.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { User } from '../data/types';
import { colors, palette, spacing, type } from '../theme';
import { CollageCard } from './CollageCard';
import { Pill } from './Pill';

interface Quest {
  key: string;
  label: string;
  value: string;
  route: string;
  done: boolean;
}

/** Computes the profile-completion quests for a user. */
export function profileQuests(user: User): Quest[] {
  return [
    { key: 'top', label: 'Pick your top 5', value: 'Sharper icebreakers', route: '/edit/top-hobbies', done: (user.topHobbies?.length ?? 0) >= 1 },
    { key: 'pull', label: 'Connect Spotify & Letterboxd', value: 'Auto-match on your taste', route: '/connect', done: (user.handles ?? []).some((h) => h.dataPulled) },
    { key: 'bucket', label: 'Add bucket-list goals', value: 'Match on shared dreams', route: '/edit/bucket-list', done: (user.bucketList?.length ?? 0) >= 1 },
    { key: 'certs', label: 'Add skills & certs', value: 'Match on expertise', route: '/edit/certifications', done: (user.certifications?.length ?? 0) >= 1 },
    { key: 'travel', label: 'Add places you’ve been', value: 'Travel commonalities', route: '/edit/travel', done: (user.travel?.length ?? 0) >= 1 },
    { key: 'life', label: 'Add life experiences', value: 'Deeper connections', route: '/edit/life-experiences', done: (user.lifeExperiences?.length ?? 0) >= 1 },
  ];
}

interface ProfileQuestsProps {
  user: User;
  variant?: 'home' | 'full';
}

export function ProfileQuests({ user, variant = 'full' }: ProfileQuestsProps) {
  const router = useRouter();
  const remaining = profileQuests(user).filter((q) => !q.done);
  if (remaining.length === 0) return null;

  if (variant === 'home') {
    const q = remaining[0];
    return (
      <View style={{ marginBottom: spacing.xl }}>
        <Text style={[type.label, { color: colors.textMutedOnLight, marginBottom: spacing.sm }]}>
          Level up your profile
        </Text>
        <CollageCard background={palette.yellow} rotate="1deg" onPress={() => router.push(q.route)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[type.cardTitle, { color: colors.nearBlack }]}>{q.label}</Text>
              <Text style={[type.body, { color: colors.nearBlack, opacity: 0.7 }]}>
                Unlocks: {q.value.toLowerCase()}
              </Text>
            </View>
            <Pill label={`${remaining.length} left`} variant="dark" />
          </View>
        </CollageCard>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[type.label, { color: colors.textMutedOnLight }]}>Level up your profile</Text>
      <View style={{ gap: spacing.sm }}>
        {remaining.map((q) => (
          <Pressable key={q.key} onPress={() => router.push(q.route)}>
            <CollageCard background={palette.cream} rotate="-0.4deg">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[type.cardTitle, { color: colors.nearBlack }]}>{q.label}</Text>
                  <Text style={[type.body, { color: colors.textMutedOnLight }]}>
                    Unlocks: {q.value.toLowerCase()}
                  </Text>
                </View>
                <Text style={[type.label, { color: colors.navy }]}>Add</Text>
              </View>
            </CollageCard>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
