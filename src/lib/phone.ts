/**
 * Phone-number helpers shared by the auth screens (send/verify OTP) and the
 * invite/claim flow, so both sides agree on the same E.164 shape Supabase
 * phone auth expects.
 */

/** Strip everything but digits and a leading "+", defaulting to "+" prefixed. */
export function normalizePhone(raw: string): string {
  const digits = raw.trim().replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/** E.164: "+" followed by 8–15 digits, first digit non-zero. */
export function isValidPhone(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}
