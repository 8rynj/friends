/**
 * Supabase client — the optional backing store behind the Zustand app store,
 * and (when configured) passwordless phone auth (Auth → Providers → Phone,
 * with Twilio configured as the SMS provider in the Supabase dashboard).
 *
 * Configured entirely through env vars (`EXPO_PUBLIC_SUPABASE_URL` /
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY`, see `.env.example`). When either is missing —
 * local dev without a project, CI, or before a Supabase project exists —
 * `isSupabaseConfigured` is false and `supabase` is null; the store then stays
 * entirely on mock data + AsyncStorage persistence (see src/data/repository.ts)
 * and the app skips the auth gate entirely (see app/_layout.tsx).
 */
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Supabase recommends pausing/resuming the refresh timer with app foreground
// state on native so it doesn't keep firing in the background.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
