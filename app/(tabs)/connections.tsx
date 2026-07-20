/**
 * People — the full connection list. Reuses the collage card pattern with
 * alternating tilted backgrounds. Tapping a person opens their profile (§5).
 */
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
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
import { commonalityCount } from '../../src/engine/commonality';
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
  const me = useStore((s) => s.user);
  const allConnections = useStore((s) => s.connections);
  const unarchiveConnection = useStore((s) => s.unarchiveConnection);
  const [showArchived, setShowArchived] = useState(false);

  const connections = allConnections.filter((c) => !c.archived);
  const archived = allConnections.filter((c) => c.archived);
  const list = showArchived ? archived : connections;

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

        {/* Not-interested archive — hidden by default, reversible (V2). */}
        {archived.length > 0 && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              setShowArchived((v) => !v);
            }}
            style={{ alignSelf: 'flex-start', marginTop: 10 }}
          >
            <Text style={[type.label, { color: colors.textMutedOnLight, textDecorationLine: 'underline' }]}>
              {showArchived ? '← Back to people' : `Not interested (${archived.length})`}
            </Text>
          </Pressable>
        )}
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
        {list.length === 0 && showArchived && (
          <Text style={[type.body, { color: colors.textMutedOnLight }]}>Nothing archived.</Text>
        )}
        {list.map((c, i) => {
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
              style={showArchived ? { opacity: 0.6 } : undefined}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={c.user.name} color={c.user.avatarColor} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.cardTitle, { color: fg }]}>{c.user.name}</Text>
                  <Text style={[type.body, { color: muted }]} numberOfLines={1}>
                    {commonalityCount(me, c.user)} in common · {c.metContext}
                  </Text>
                </View>
                {showArchived ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                      unarchiveConnection(c.id);
                    }}
                    hitSlop={8}
                    style={{
                      borderRadius: 100,
                      borderWidth: 2,
                      borderColor: colors.border,
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={[type.micro, { color: fg }]}>Undo</Text>
                  </Pressable>
                ) : (
                  <Pill label={TYPE_LABEL[c.connectionType]} variant="default" />
                )}
              </View>
            </CollageCard>
          );
        })}
      </ScrollView>
    </View>
  );
}
