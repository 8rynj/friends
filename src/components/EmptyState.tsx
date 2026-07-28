/**
 * EmptyState — first-run / empty-list placeholder in the collage system: a
 * cream CollageCard, a stamped glyph, headline + body copy, and an optional
 * CTA button. Used for "no connections yet", "no nudges yet", etc.
 */
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { border, colors, palette, spacing, type } from '../theme';
import { Button } from './Button';
import { CollageCard } from './CollageCard';

interface EmptyStateProps {
  /** Emoji/glyph rendered in the stamped badge. */
  icon?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  rotate?: string;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = '✦',
  title,
  body,
  actionLabel,
  onAction,
  rotate = '-0.5deg',
  style,
}: EmptyStateProps) {
  return (
    <CollageCard background={palette.cream} rotate={rotate} style={[{ paddingVertical: 26 }, style]}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: palette.yellow,
            borderWidth: border.small,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '-4deg' }],
          }}
        >
          <Text allowFontScaling={false} style={{ fontSize: 22 }}>{icon}</Text>
        </View>
        <Text style={[type.cardTitle, { color: colors.nearBlack, fontSize: 16, textAlign: 'center' }]}>
          {title}
        </Text>
        {body && (
          <Text style={[type.body, { color: colors.textMutedOnLight, textAlign: 'center' }]}>
            {body}
          </Text>
        )}
        {actionLabel && onAction && (
          <Button label={actionLabel} variant="primary" onPress={onAction} style={{ marginTop: spacing.xs }} />
        )}
      </View>
    </CollageCard>
  );
}
