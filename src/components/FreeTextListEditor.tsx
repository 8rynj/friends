/**
 * FreeTextListEditor — add/remove free-text chips. Used for Travel (places) and
 * Life Experiences, which aren't catalog-backed.
 */
import React, { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { border, colors, fonts, palette, radii, spacing, type } from '../theme';

interface FreeTextListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  onDark?: boolean;
}

export function FreeTextListEditor({
  items,
  onChange,
  placeholder = 'Add…',
  onDark = false,
}: FreeTextListEditorProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value || items.some((i) => i.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    onChange([...items, value]);
    setDraft('');
  };

  const remove = (item: string) => onChange(items.filter((i) => i !== item));

  const fg = onDark ? palette.offWhite : colors.nearBlack;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor={onDark ? colors.textMutedOnDark : colors.textMutedOnLight}
          style={{
            flex: 1,
            fontFamily: fonts.medium,
            fontSize: 15,
            color: fg,
            backgroundColor: onDark ? 'rgba(242, 240, 210,0.06)' : palette.offWhite,
            borderWidth: border.small,
            borderColor: onDark ? 'rgba(242, 240, 210,0.3)' : colors.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        />
        <Pressable
          onPress={add}
          style={{
            justifyContent: 'center',
            paddingHorizontal: 18,
            backgroundColor: colors.nearBlack,
            borderRadius: radii.pill,
            borderWidth: border.small,
            borderColor: colors.border,
          }}
        >
          <Text style={[type.label, { color: palette.offWhite }]}>Add</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item) => (
          <Pressable
            key={item}
            onPress={() => remove(item)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: palette.yellow,
              borderRadius: radii.pill,
              borderWidth: border.hairline,
              borderColor: colors.border,
              paddingVertical: 6,
              paddingHorizontal: 12,
            }}
          >
            <Text style={[type.micro, { color: colors.nearBlack }]}>{item}</Text>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.nearBlack }}>×</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
