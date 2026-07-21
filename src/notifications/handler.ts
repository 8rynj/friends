/**
 * Foreground presentation + tap-to-open deep links for push notifications
 * (Spec §8, Not built yet: push notifications). A notification's
 * `data.connectionId` (see types.ts) is enough to resolve where a tap should
 * land — always the connection's profile, the shared surface for nudges,
 * new connections, and new commonalities alike.
 */
import { useEffect } from 'react';
import type { ImperativeRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import type { PushData } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Route a tapped notification (cold-start or foreground) to its connection profile. */
export function useNotificationDeepLinks(router: ImperativeRouter) {
  useEffect(() => {
    const openConnection = (data: Partial<PushData> | undefined) => {
      if (data?.connectionId) router.push(`/connection/${data.connectionId}`);
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openConnection(response.notification.request.content.data as Partial<PushData>);
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openConnection(response.notification.request.content.data as Partial<PushData>);
    });
    return () => sub.remove();
  }, [router]);
}
