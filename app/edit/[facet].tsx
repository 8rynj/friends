/**
 * Profile facet editor — one parametrized route for every "add-later" section.
 * A facet-config map decides whether to render a catalog picker, a "top 5"
 * subset picker, or a free-text editor. All changes persist live via the
 * store's updateFacet, so there's no separate save step.
 */
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CatalogPicker,
  ErrorState,
  FreeTextListEditor,
  HobbyChip,
  OutlineText,
  Pill,
} from '../../src/components';
import { border, colors, palette, spacing, type } from '../../src/theme';
import {
  bucketListCatalog,
  CatalogSection,
  certificationCatalog,
  hobbyCatalog,
} from '../../src/data/catalog';
import { FacetKey, useStore } from '../../src/store/useStore';

type EditorKind = 'catalog' | 'subset' | 'freetext';

interface FacetConfig {
  title: string;
  accent: string; // outline word
  kind: EditorKind;
  storeKey: FacetKey;
  catalog?: CatalogSection[];
  max?: number;
  placeholder?: string;
  blurb: string;
}

const FACETS: Record<string, FacetConfig> = {
  hobbies: {
    title: 'Your',
    accent: 'hobbies',
    kind: 'catalog',
    storeKey: 'hobbies',
    catalog: hobbyCatalog,
    blurb: 'Everything you’re into. The more you add, the better your matches.',
  },
  'top-hobbies': {
    title: 'Your current',
    accent: 'top 5',
    kind: 'subset',
    storeKey: 'topHobbies',
    max: 5,
    blurb: 'Pick up to 5 from your hobbies — these get top billing in icebreakers.',
  },
  'bucket-list': {
    title: 'Your bucket',
    accent: 'list',
    kind: 'catalog',
    storeKey: 'bucketList',
    catalog: bucketListCatalog,
    blurb: 'Goals and dreams. Shared ones make great icebreakers.',
  },
  certifications: {
    title: 'Skills &',
    accent: 'certs',
    kind: 'catalog',
    storeKey: 'certifications',
    catalog: certificationCatalog,
    blurb: 'Certifications and qualifications you hold.',
  },
  travel: {
    title: 'Places',
    accent: 'been',
    kind: 'freetext',
    storeKey: 'travel',
    placeholder: 'Add a place…',
    blurb: 'Where you’ve lived and traveled.',
  },
  'life-experiences': {
    title: 'Life',
    accent: 'experiences',
    kind: 'freetext',
    storeKey: 'lifeExperiences',
    placeholder: 'Add an experience…',
    blurb: 'Notable things you’ve done.',
  },
};

export default function FacetEditor() {
  const { facet } = useLocalSearchParams<{ facet: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = FACETS[String(facet)];

  const user = useStore((s) => s.user);
  const updateFacet = useStore((s) => s.updateFacet);

  if (!config) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.appBg, alignItems: 'center', justifyContent: 'center', padding: spacing.screen }}>
        <ErrorState
          title="Unknown section"
          body="This profile section doesn’t exist."
          actionLabel="Go back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const selected = (user[config.storeKey] as string[]) ?? [];

  const toggle = (item: string) => {
    const has = selected.includes(item);
    if (!has && config.max && selected.length >= config.max) return;
    updateFacet(config.storeKey, has ? selected.filter((x) => x !== item) : [...selected, item]);
  };

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
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 44, height: 44, borderRadius: 22, marginTop: 6,
            backgroundColor: colors.cream,
            borderWidth: border.small, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text allowFontScaling={false} style={{ fontSize: 18, color: colors.nearBlack, lineHeight: 20 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[type.display, { color: colors.nearBlack }]}>{config.title}</Text>
          <OutlineText fontSize={32} stroke={colors.nearBlack} strokeWidth={2}>
            {config.accent}
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
      >
        <Text style={[type.body, { color: colors.textMutedOnLight }]}>{config.blurb}</Text>
        <View style={{ alignSelf: 'flex-start' }}>
          <Pill
            label={
              config.max
                ? `${selected.length} of ${config.max}`
                : `${selected.length} selected`
            }
            variant="connected"
          />
        </View>

        {config.kind === 'catalog' && config.catalog && (
          <CatalogPicker
            sections={config.catalog}
            selected={selected}
            onToggle={toggle}
            max={config.max}
          />
        )}

        {config.kind === 'subset' && (
          user.hobbies.length === 0 ? (
            <Text style={[type.body, { color: colors.textMutedOnLight }]}>
              Add some hobbies first to choose your top 5.
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {user.hobbies.map((h) => (
                <HobbyChip
                  key={h}
                  label={h}
                  selected={selected.includes(h)}
                  selectedColor={palette.yellow}
                  onDark={false}
                  onToggle={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                    toggle(h);
                  }}
                />
              ))}
            </View>
          )
        )}

        {config.kind === 'freetext' && (
          <FreeTextListEditor
            items={selected}
            onChange={(items) => updateFacet(config.storeKey, items)}
            placeholder={config.placeholder}
          />
        )}
      </ScrollView>
    </View>
  );
}
