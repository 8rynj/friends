/**
 * Keeps on-device nudge reminders in sync with store state.
 *
 * Reschedules whenever the connections list (dates/cadence) or the "Nudge
 * reminders" setting changes, once the store has hydrated. A no-op on web and
 * when the setting is off or permission is denied (see syncNudgeReminders).
 */
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { syncNudgeReminders } from '../engine/notifications';

export function useNudgeReminders(): void {
  const hasHydrated = useStore((s) => s.hasHydrated);
  const connections = useStore((s) => s.connections);
  const pushNudges = useStore((s) => s.settings.pushNudges);

  useEffect(() => {
    if (!hasHydrated) return;
    syncNudgeReminders(connections, pushNudges).catch(() => {});
  }, [hasHydrated, connections, pushNudges]);
}
