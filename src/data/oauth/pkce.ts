/**
 * Authorization Code + PKCE crypto helpers shared by every OAuth data-pull
 * adapter (Spec §6/§8 Integrations) — Spotify today; future adapters (Strava
 * et al., ROADMAP 3B) reuse this instead of hand-rolling their own.
 */
import * as Crypto from 'expo-crypto';

const UNRESERVED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

function randomUnreservedString(length: number): string {
  const bytes = Crypto.getRandomBytes(length);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += UNRESERVED[bytes[i] % UNRESERVED.length];
  return out;
}

function base64ToBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A fresh PKCE verifier (43–128 chars, RFC 7636 unreserved charset) + its S256 challenge. */
export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomUnreservedString(64);
  const digestBase64 = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  return { verifier, challenge: base64ToBase64Url(digestBase64) };
}

/** Opaque CSRF guard for the authorize request's `state` param. */
export function randomState(): string {
  return randomUnreservedString(24);
}
