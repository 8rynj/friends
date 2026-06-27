/**
 * People — the full connection list. Reuses the collage card pattern with
 * alternating tilted backgrounds. Tapping a person opens their profile (§5).
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Avatar,
  CollageCard,
  OutlineText,
  Pill,
} from '../../src/components';
import {
  cardBackgrounds,
  colors,
  palette,
  spacing,
  textOn,
  tiltFor,
  type,
} from '../../src/theme';
import { useStore } from '../../src/store/useStore';

const TYPE_LABEL: Record<string, string> = {
  friend: 'Friend',
  professional: 'Pro',
  acquaintance: 'Acquaintance',
  romantic: 'Romantic',
};

export default function ConnectionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const connections = useStore((s) => s.connections);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.screen,
          paddingBottom: 12,
        }}
      >
        <Text style={[type.display, { color: colors.nearBlack }]}>Your</Text>
        <OutlineText fontSize={34} stroke={colors.nearBlack} strokeWidth={2}>
          People
        </OutlineText>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.md,
          paddingBottom: 120,
          gap: spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        {connections.map((c, i) => {
          const bg = cardBackgrounds[i % cardBackgrounds.length];
          const fg = textOn(bg);
          const muted =
            bg === palette.cream || bg === palette.yellow
              ? colors.textMutedOnLight
              : colors.textMutedOnDark;
          return (
            <CollageCard
              key={c.id}
              background={bg}
              rotate={tiltFor(i)}
              onPress={() => router.push(`/connection/${c.id}`)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={c.user.name} color={c.user.avatarColor} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.cardTitle, { color: fg }]}>{c.user.name}</Text>
                  <Text style={[type.body, { color: muted }]} numberOfLines={1}>
                    {c.commonalities.length} in common · {c.metContext}
                  </Text>
                </View>
                <Pill label={TYPE_LABEL[c.connectionType]} variant="default" />
              </View>
            </CollageCard>
          );
        })}
      </ScrollView>
    </View>
  );
}
