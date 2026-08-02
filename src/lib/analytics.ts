/**
 * PostHog — product analytics, configured entirely through
 * `EXPO_PUBLIC_POSTHOG_API_KEY` (+ optional `EXPO_PUBLIC_POSTHOG_HOST`, see
 * `.env.example`). When the key is unset — local dev without a PostHog
 * project, or CI — `isAnalyticsConfigured` is false, `posthog` is null, and
 * `trackEvent`/`identifyUser`/`resetAnalytics` all no-op; nothing is sent
 * anywhere.
 *
 * Key product events are tracked at their single source of truth:
 * `src/store/useStore.ts` (connect made, nudge acted on, data-pull
 * connected) and `app/onboarding/index.tsx` (onboarding completed).
 */
import PostHog from 'posthog-react-native';
import type { PostHogEventProperties } from '@posthog/core';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

export const isAnalyticsConfigured = !!apiKey;

export const posthog: PostHog | null = isAnalyticsConfigured
  ? new PostHog(apiKey!, { host })
  : null;

/** The key product events this app tracks. */
export type AnalyticsEvent =
  | 'connect_made'
  | 'nudge_acted_on'
  | 'data_pull_connected'
  | 'onboarding_completed';

/** Track a product event. No-ops when analytics isn't configured. */
export function trackEvent(event: AnalyticsEvent, properties?: PostHogEventProperties) {
  posthog?.capture(event, properties);
}

/** Associate subsequent events with a signed-in user (Supabase `auth.uid()`). */
export function identifyUser(userId: string, properties?: PostHogEventProperties) {
  posthog?.identify(userId, properties);
}

/** Clear identity, e.g. on sign-out. */
export function resetAnalytics() {
  posthog?.reset();
}
