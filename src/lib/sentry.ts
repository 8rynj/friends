/**
 * Sentry — crash/error reporting, configured entirely through
 * `EXPO_PUBLIC_SENTRY_DSN` (see `.env.example`). When unset — local dev
 * without a Sentry project, or CI — `isSentryConfigured` is false,
 * `initSentry` is a no-op, and `captureException` never sends anything.
 *
 * `initSentry()` runs once at app startup (`app/_layout.tsx`, module scope —
 * same pattern as `SplashScreen.preventAutoHideAsync()`); `captureException`
 * is called from `src/components/ErrorBoundary.tsx` for render errors.
 */
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isSentryConfigured = !!dsn;

export function initSentry() {
  if (!isSentryConfigured) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}

/** Report a caught error (e.g. from ErrorBoundary). No-ops when unconfigured. */
export function captureException(error: unknown, extra?: Record<string, unknown>) {
  if (!isSentryConfigured) return;
  Sentry.captureException(error, extra ? { extra } : undefined);
}
