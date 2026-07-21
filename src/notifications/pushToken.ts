/**
 * Push token registration (Spec §8, Not built yet: push notifications).
 * Requests permission, sets up Android notification channels — one per
 * gate-able push kind so OS-level muting lines up with the Settings toggles
 * (§Notifications) — and returns this device's Expo push token, the id a
 * backend needs to target a push at this device. Resolves to null anywhere
 * push isn't available (web, simulators) or permission is denied.
 */
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const CHANNELS = [
  { id: 'default', name: 'General' },
  { id: 'nudges', name: 'Nudge reminders' },
  { id: 'commonalities', name: 'New commonalities' },
];

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    CHANNELS.map(({ id, name }) =>
      Notifications.setNotificationChannelAsync(id, {
        name,
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
    ),
  );
}

export async function registerForPushTokenAsync(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  await ensureAndroidChannels();

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return data;
  } catch {
    // No EAS project configured yet, or the push service is unreachable —
    // fail closed rather than crash startup.
    return null;
  }
}
