/**
 * You — the signed-in user's own profile. Shows the completion indicator
 * (§5A "value being left on the table") and every profile section as editable
 * pill groups that route to the parametrized facet editor (/edit/<facet>).
 */
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
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
import { handleMeta } from '../../src/data/mock';
import { useStore } from '../../src/store/useStore';

/** Profile sections rendered as editable pill groups. */
const SECTIONS: { facet: string; label: string; key: 'topHobbies' | 'hobbies' | 'bucketList' | 'certifications' | 'travel' | 'lifeExperiences' }[] = [
  { facet: 'top-hobbies', label: 'Top 5', key: 'topHobbies' },
  { facet: 'hobbies', label: 'Hobbies', key: 'hobbies' },
  { facet: 'bucket-list', label: 'Bucket list', key: 'bucketList' },
  { facet: 'certifications', label: 'Skills & certs', key: 'certifications' },
  { facet: 'travel', label: 'Places been', key: 'travel' },
  { facet: 'life-experiences', label: 'Life experiences', key: 'lifeExperiences' },
];

export default function YouScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useStore((s) => s.user);

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
            name={user.name}
            color={user.avatarColor}
            size={96}
            rotate="-3deg"
            shadowed
            taped
          />
          <Text style={[type.headline, { color: colors.nearBlack, marginTop: 8 }]}>
            {user.name}
          </Text>
        </View>

        {/* Profile completion. */}
        <CollageCard background={palette.cream} rotate="-0.6deg">
          <View style={{ gap: 10 }}>
            <ProgressBar percent={user.profileCompletion} onDark={false} />
            <Text style={[type.body, { color: colors.textMutedOnLight }]}>
              The fuller your profile, the richer your icebreakers with the people you meet.
            </Text>
            <Button
              label="Continue setup"
              variant="primary"
              onPress={() => router.push('/onboarding')}
            />
          </View>
        </CollageCard>

        {/* Editable profile sections. */}
        {SECTIONS.map((section) => {
          const items = (user[section.key] as string[]) ?? [];
          return (
            <View key={section.facet} style={{ gap: spacing.sm }}>
              <SectionHeader
                label={section.label}
                onEdit={() => router.push(`/edit/${section.facet}`)}
              />
              {items.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {items.map((item) => (
                    <Pill
                      key={item}
                      label={item}
                      variant={section.key === 'topHobbies' ? 'connected' : 'default'}
                    />
                  ))}
                </View>
              ) : (
                <Pressable onPress={() => router.push(`/edit/${section.facet}`)}>
                  <Text style={[type.body, { color: colors.textMutedOnLight }]}>
                    + Add {section.label.toLowerCase()}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Connected handles. */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.label, { color: colors.textMutedOnLight }]}>Connected</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {user.handles.map((h) => (
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

function SectionHeader({ label, onEdit }: { label: string; onEdit: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={[type.label, { color: colors.textMutedOnLight }]}>{label}</Text>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Text style={[type.label, { color: colors.navy }]}>Edit</Text>
      </Pressable>
    </View>
  );
}
