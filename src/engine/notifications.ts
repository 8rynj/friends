/**
 * Local nudge reminders (Spec §5D, §Notifications).
 *
 * Schedules on-device notifications for time-based nudges — each connection's
 * `nextNudge` date — so follow-ups surface even when the app is closed. Gated by
 * the user's "Nudge reminders" setting and OS permission.
 *
 * The model is declarative: `syncNudgeReminders` cancels everything we
 * previously scheduled and reschedules from current state, so it's safe to call
 * on every relevant change (connections, cadence, the setting toggle).
 *
 * Native-only: expo-notifications has no real surface on web, so every call is
 * guarded and becomes a no-op there (keeps the web bundle/export clean).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Connection } from '../data/types';
import { nudgeCopy } from './nudges';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Android delivery channel for reminders (required to post on Android 8+). */
const ANDROID_CHANNEL_ID = 'nudge-reminders';

/** Hour of day (local) reminders fire on their scheduled date. */
const REMINDER_HOUR = 9;

// Show the banner even when the app is foregrounded (native only).
if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Nudge reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Ensure we hold notification permission, requesting it once if we can. Returns
 * whether reminders may be posted. Safe to call repeatedly; a no-op on web.
 */
export async function requestNudgePermissions(): Promise<boolean> {
  if (!isNative) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    await ensureAndroidChannel();
    return true;
  }
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) await ensureAndroidChannel();
  return requested.granted;
}

/**
 * Reconcile scheduled reminders with current state. Clears all previously
 * scheduled notifications, then (when enabled and permitted) schedules one per
 * connection with a future `nextNudge`. Past-due nudges are left to the in-app
 * Home card rather than firing a late notification.
 */
export async function syncNudgeReminders(
  connections: Connection[],
  enabled: boolean,
): Promise<void> {
  if (!isNative) return;
  // This app only ever schedules nudge reminders, so a full clear is safe and
  // keeps reconciliation simple.
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;

  const granted = await requestNudgePermissions();
  if (!granted) return;

  const now = Date.now();
  for (const c of connections) {
    if (!c.nextNudge || c.nudgeCadence === 'never') continue;
    const when = new Date(c.nextNudge);
    when.setHours(REMINDER_HOUR, 0, 0, 0);
    if (when.getTime() <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to reach out',
        body: nudgeCopy(c.connectionType, c.user.name),
        data: { connectionId: c.id, kind: 'nudge-reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  }
}
