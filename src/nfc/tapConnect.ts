/**
 * NFC tap-to-connect (Spec §5B Method 1) — thin wrapper around
 * react-native-nfc-manager. The native module doesn't exist on web (and isn't
 * present in Expo Go — it needs a dev-client/prebuilt build), so it's only
 * required on native platforms; every export below degrades to a clean
 * rejection/false on web instead of touching the native module.
 *
 * A Knowable tag carries a single NDEF text record `knowable:<personId>`.
 * There's no backend yet, so the id is resolved against the local
 * `newCandidates` mock pool (src/data/mock.ts) — swap that lookup for a real
 * directory call once bump exchange has a server behind it.
 */
import { Platform } from 'react-native';

type NfcModule = typeof import('react-native-nfc-manager');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nfc: NfcModule | null = Platform.OS === 'web' ? null : require('react-native-nfc-manager');

const CONNECT_PREFIX = 'knowable:';

let started = false;
async function ensureStarted() {
  if (!nfc || started) return;
  await nfc.default.start();
  started = true;
}

/** True when NFC hardware exists, this build supports it, and it's turned on. */
export async function isNfcAvailable(): Promise<boolean> {
  if (!nfc) return false;
  try {
    if (!(await nfc.default.isSupported())) return false;
    await ensureStarted();
    return await nfc.default.isEnabled();
  } catch {
    return false;
  }
}

/** True when a scan rejected because the user backed out (not a real error). */
export function isScanCancelled(err: unknown): boolean {
  return !!nfc && err instanceof nfc.NfcError.UserCancel;
}

/**
 * Waits for one NDEF tap and resolves the connect id it encodes, or null if
 * the tag isn't a Knowable tag. Rejects on cancel/timeout/hardware error —
 * check `isScanCancelled` to tell a user-initiated cancel from a real failure.
 */
export async function scanForConnectId(): Promise<string | null> {
  if (!nfc) throw new Error('NFC is not available on this platform.');
  await ensureStarted();
  try {
    await nfc.default.requestTechnology(nfc.NfcTech.Ndef);
    const tag = await nfc.default.getTag();
    const record = tag?.ndefMessage?.[0];
    if (!record) return null;
    const text = nfc.Ndef.text.decodePayload(new Uint8Array(record.payload));
    return text.startsWith(CONNECT_PREFIX) ? text.slice(CONNECT_PREFIX.length) : null;
  } finally {
    nfc.default.cancelTechnologyRequest().catch(() => {});
  }
}

/** Aborts an in-flight scan — call on Cancel and on unmount. */
export function cancelScan() {
  nfc?.default.cancelTechnologyRequest().catch(() => {});
}
