/**
 * Auth session state — separate from the main app store (`useStore`) since it
 * mirrors Supabase's own session, not app/profile data. `init()` subscribes to
 * `supabase.auth.onAuthStateChange`, which (per supabase-js v2) fires once
 * immediately with the current session and again on every sign-in/out/refresh.
 * The root layout calls `init()` once and uses `status` to gate navigation.
 *
 * When Supabase isn't configured (`src/lib/supabase.ts` → `supabase` is
 * null — no project/keys set, e.g. local dev or CI), status resolves straight
 * to `unconfigured` and stays there: there's no session to track, and the
 * root layout treats this the same as `signedIn` (skip the auth gate) so the
 * app keeps working on mock data exactly as it did before phone auth existed.
 */
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'unconfigured';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** E.164 phone of the signed-in user, straight from the verified session. */
  phone: string | null;
  /** The authenticated `auth.uid()` — also `profiles.id` (see supabase/migrations). */
  userId: string | null;
  /** Subscribes to auth changes; returns an unsubscribe function. */
  init: () => () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  session: null,
  phone: null,
  userId: null,
  init: () => {
    if (!supabase) {
      set({ status: 'unconfigured' });
      return () => {};
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        phone: session?.user?.phone ? `+${session.user.phone.replace(/^\+/, '')}` : null,
        userId: session?.user?.id ?? null,
        status: session ? 'signedIn' : 'signedOut',
      });
    });
    return () => sub.subscription.unsubscribe();
  },
}));
