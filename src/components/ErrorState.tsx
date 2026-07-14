/**
 * ErrorState — error fallback in the collage system: an orange stamped badge,
 * headline + body copy, and a "Try again" action. Used for failed/missing
 * content and as the visual for ErrorBoundary.
 */
import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { border, colors, palette, spacing, type } from '../theme';
import { Button } from './Button';
import { CollageCard } from './CollageCard';

interface ErrorStateProps {
  title?: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  rotate?: string;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Something went wrong',
  body = 'Give it another try.',
  actionLabel = 'Try again',
  onAction,
  rotate = '0.5deg',
  style,
}: ErrorStateProps) {
  return (
    <CollageCard background={palette.cream} rotate={rotate} style={[{ paddingVertical: 26 }, style]}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: palette.orange,
            borderWidth: border.small,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ rotate: '4deg' }],
          }}
        >
          <Text allowFontScaling={false} style={{ fontSize: 20, fontWeight: '700', color: palette.cream }}>!</Text>
        </View>
        <Text style={[type.cardTitle, { color: colors.nearBlack, fontSize: 16, textAlign: 'center' }]}>
          {title}
        </Text>
        {body && (
          <Text style={[type.body, { color: colors.textMutedOnLight, textAlign: 'center' }]}>
            {body}
          </Text>
        )}
        {onAction && (
          <Button label={actionLabel} variant="primary" onPress={onAction} style={{ marginTop: spacing.xs }} />
        )}
      </View>
    </CollageCard>
  );
}
