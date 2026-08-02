/**
 * Per-source OAuth token persistence for data-pull adapters (Spec §6/§8
 * Integrations), built on the secure key-value store (`src/lib/secureStore.ts`).
 */
import { DataPullSource } from '../types';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../../lib/secureStore';
import { OAuthTokens } from './authorizationCode';

const storageKey = (source: DataPullSource) => `knowable:oauth:${source}`;

export async function saveTokens(source: DataPullSource, tokens: OAuthTokens): Promise<void> {
  await setSecureItem(storageKey(source), JSON.stringify(tokens));
}

export async function loadTokens(source: DataPullSource): Promise<OAuthTokens | null> {
  const raw = await getSecureItem(storageKey(source));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthTokens;
  } catch {
    return null;
  }
}

export async function clearTokens(source: DataPullSource): Promise<void> {
  await deleteSecureItem(storageKey(source));
}
