/**
 * Bottom navigation — Design Guidelines §5 (Navigation). Cream background, 2px
 * near-black top border, active icon navy with a small navy dot below, inactive
 * #bbb. Never rotated or collaged. Custom tab bar so it matches exactly.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { colors, fonts } from '../../src/theme';

/** Minimal shape of the tab bar props we use (avoids a direct nav dependency). */
interface TabBarProps {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
}

const ICONS: Record<string, string> = {
  index: '⌂',
  connections: '◇',
  you: '◉',
};
const LABELS: Record<string, string> = {
  index: 'Home',
  connections: 'People',
  you: 'You',
};

function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.cream,
        borderTopWidth: 2,
        borderTopColor: colors.border,
        paddingTop: 10,
        paddingBottom: Math.max(insets.bottom, 20),
      }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={LABELS[route.name] ?? route.name}
            accessibilityState={{ selected: focused }}
            style={{ flex: 1, alignItems: 'center', gap: 3 }}
          >
            <Text
              allowFontScaling={false}
              style={{ fontSize: 20, color: focused ? colors.navy : '#bbb' }}
            >
              {ICONS[route.name] ?? '•'}
            </Text>
            <Text
              style={{
                fontFamily: fonts.bold,
                fontSize: 9,
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: focused ? colors.navy : '#bbb',
              }}
            >
              {LABELS[route.name] ?? route.name}
            </Text>
            {/* Active dot below the icon (§5). */}
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: focused ? colors.navy : 'transparent',
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="connections" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
