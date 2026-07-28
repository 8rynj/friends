/**
 * CatalogPicker — grouped, searchable, multi-select list over a
 * CatalogSection[]. Used by onboarding (dark) and the profile editors (light).
 * Categories are collapsed by default and tap to expand, so a big catalog isn't
 * overwhelming; a search query temporarily expands all matching sections.
 * Reuses HobbyChip for items and the standard pill/label patterns.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { CatalogSection } from '../data/catalog';
import { border, colors, fonts, palette, spacing, type } from '../theme';
import { HobbyChip } from './HobbyChip';
import { Pill } from './Pill';

interface CatalogPickerProps {
  sections: CatalogSection[];
  selected: string[];
  onToggle: (item: string) => void;
  /** Optional cap; once reached, unselected items are disabled. */
  max?: number;
  /** Render on a dark background (onboarding). */
  onDark?: boolean;
  /** Brand color used for selected chips; cycles per section for variety. */
}

const CHIP_COLORS = [palette.navy, palette.orange, palette.yellow];

export function CatalogPicker({
  sections,
  selected,
  onToggle,
  max,
  onDark = false,
}: CatalogPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const atMax = max !== undefined && selected.length >= max;

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      sections
        .map((s) => ({
          title: s.title,
          items: q ? s.items.filter((i) => i.toLowerCase().includes(q)) : s.items,
        }))
        .filter((s) => s.items.length > 0),
    [sections, q],
  );

  const labelColor = onDark ? colors.textMutedOnDark : colors.textMutedOnLight;

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search…"
        placeholderTextColor={labelColor}
        accessibilityLabel="Search"
        style={{
          fontFamily: fonts.medium,
          fontSize: 15,
          color: onDark ? palette.offWhite : colors.nearBlack,
          backgroundColor: onDark ? 'rgba(245,240,232,0.06)' : palette.offWhite,
          borderWidth: border.small,
          borderColor: onDark ? 'rgba(245,240,232,0.3)' : colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}
      />

      {filtered.map((section, si) => {
        const expanded = !!q || open[section.title];
        const selectedCount = section.items.filter((i) => selectedSet.has(i)).length;
        return (
          <View key={section.title} style={{ gap: spacing.sm }}>
            {/* Tap header to expand/collapse the category. */}
            <Pressable
              onPress={() => setOpen((o) => ({ ...o, [section.title]: !o[section.title] }))}
              hitSlop={{ top: 12, bottom: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`${section.title}${selectedCount > 0 ? `, ${selectedCount} selected` : ''}`}
              accessibilityState={{ expanded }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[type.label, { color: onDark ? palette.yellow : labelColor }]}>
                  {section.title}
                </Text>
                {selectedCount > 0 && <Pill label={String(selectedCount)} variant="connected" />}
              </View>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: onDark ? palette.offWhite : colors.nearBlack }}>
                {expanded ? '▾' : '▸'}
              </Text>
            </Pressable>

            {expanded && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {section.items.map((item) => {
                  const isSelected = selectedSet.has(item);
                  const disabled = atMax && !isSelected;
                  return (
                    <View key={item} style={{ opacity: disabled ? 0.35 : 1 }}>
                      <HobbyChip
                        label={item}
                        selected={isSelected}
                        selectedColor={CHIP_COLORS[si % CHIP_COLORS.length]}
                        onDark={onDark}
                        onToggle={() => {
                          if (disabled) return;
                          onToggle(item);
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {filtered.length === 0 && (
        <Pill label="No matches" variant="default" />
      )}
    </View>
  );
}
