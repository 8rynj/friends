/**
 * You — a summary of the signed-in user's own profile, with the completion
 * indicator (§5A "value being left on the table") and a prompt to finish
 * onboarding. Handle chips reuse the source-pill treatment.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Avatar,
  Button,
  CollageCard,
  Pill,
  ProgressBar,
} from '../../src/components';
import { colors, palette, spacing, type } from '../../src/theme';
import { currentUser, handleMeta } from '../../src/data/mock';

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: insets.top + 16,
          paddingBottom: 120,
          gap: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Avatar
            name={currentUser.name}
            color={currentUser.avatarColor}
            size={96}
            rotate="-3deg"
            shadowed
            taped
          />
          <Text style={[type.headline, { color: colors.nearBlack, marginTop: 8 }]}>
            {currentUser.name}
          </Text>
        </View>

        {/* Profile completion. */}
        <CollageCard background={palette.cream} rotate="-0.6deg">
          <View style={{ gap: 10 }}>
            <ProgressBar percent={currentUser.profileCompletion} onDark={false} />
            <Text style={[type.body, { color: colors.textMutedOnLight }]}>
              Finish your profile to unlock richer icebreakers with the people you meet.
            </Text>
            <Button
              label="Continue setup"
              variant="primary"
              onPress={() => router.push('/onboarding')}
            />
          </View>
        </CollageCard>

        {/* Hobbies. */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.label, { color: colors.textMutedOnLight }]}>Hobbies</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {currentUser.hobbies.map((h) => (
              <Pill key={h} label={h} variant="default" />
            ))}
          </View>
        </View>

        {/* Connected handles. */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.label, { color: colors.textMutedOnLight }]}>Connected</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {currentUser.handles.map((h) => (
              <Pill
                key={h.source}
                label={handleMeta[h.source].label}
                variant="source"
                tint={handleMeta[h.source].tint}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
