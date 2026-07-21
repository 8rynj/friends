/**
 * Auth session state — separate from the main app store (`useStore`) since it
 * mirrors Supabase's own session, not app/profile data. `init()` subscribes to
 * `supabase.auth.onAuthStateChange`, which (per supabase-js v2) fires once
 * immediately with the current session and again on every sign-in/out/refresh.
 * The root layout calls `init()` once and uses `status` to gate navigation.
 */
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  /** E.164 phone of the signed-in user, straight from the verified session. */
  phone: string | null;
  /** Subscribes to auth changes; returns an unsubscribe function. */
  init: () => () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  session: null,
  phone: null,
  init: () => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        phone: session?.user?.phone ? `+${session.user.phone.replace(/^\+/, '')}` : null,
        status: session ? 'signedIn' : 'signedOut',
      });
    });
    return () => sub.subscription.unsubscribe();
  },
}));
