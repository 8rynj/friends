/**
 * Passwordless phone auth actions — thin wrappers around Supabase's phone OTP
 * flow (Auth → Providers → Phone, SMS delivered via Twilio).
 */
import { supabase } from './supabase';

/** Sends a 6-digit SMS OTP to `phone` (E.164, e.g. "+15551234567"). */
export async function sendPhoneOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

/** Verifies the SMS OTP; on success Supabase establishes a session. */
export async function verifyPhoneOtp(phone: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
}

export async function signOutPhone(): Promise<void> {
  await supabase.auth.signOut();
}
