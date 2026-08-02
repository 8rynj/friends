/**
 * Generic OAuth 2.0 Authorization Code + PKCE flow (Spec §6/§8 Integrations)
 * — the reusable base every real data-pull adapter authenticates through.
 * PKCE (RFC 7636) needs no client secret, so it's safe to run entirely on
 * device for a public client like this app.
 *
 * `authorize()` opens the provider's consent screen in a system browser
 * (`expo-web-browser`'s `openAuthSessionAsync`, which uses `ASWebAuthenticationSession`
 * on iOS / Custom Tabs on Android) and resolves once the app is redirected
 * back via its `knowable://` scheme (see `app.json`) with tokens exchanged.
 * Adapters own persisting the returned tokens (`./tokenStore.ts`) and
 * refreshing them before they expire.
 */
import 'react-native-url-polyfill/auto';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { createPkcePair, randomState } from './pkce';

export interface OAuthProviderConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  /**
   * Present only for providers whose token endpoint is confidential-client-only
   * (e.g. Strava, which requires `client_secret` on every token/refresh request
   * with no PKCE-only alternative). Omit for public-client PKCE providers like
   * Spotify. When set, this ships inside the app bundle same as `clientId` —
   * not truly secret on-device, but it's the provider's own documented mobile
   * flow, not a workaround.
   */
  clientSecret?: string;
  scopes: string[];
  /** Unique path segment appended to the app's `knowable://` redirect scheme. */
  redirectPath: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  /** Epoch ms the access token expires at. */
  expiresAt: number;
}

export class OAuthError extends Error {}

/** Runs the full flow: browser consent → authorization code → token exchange. */
export async function authorize(config: OAuthProviderConfig): Promise<OAuthTokens> {
  const redirectUri = makeRedirectUri({ scheme: 'knowable', path: config.redirectPath });
  const { verifier, challenge } = await createPkcePair();
  const state = randomState();

  const authUrl = `${config.authorizationEndpoint}?${new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: config.scopes.join(' '),
  }).toString()}`;

  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  } catch {
    throw new OAuthError('Could not open the sign-in screen — try again.');
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new OAuthError('Connection cancelled.');
  }
  if (result.type !== 'success' || !result.url) {
    throw new OAuthError('Something went wrong connecting — try again.');
  }

  const returned = new URL(result.url);
  const authError = returned.searchParams.get('error');
  if (authError) {
    throw new OAuthError(authError === 'access_denied' ? 'Access was denied.' : authError);
  }
  const code = returned.searchParams.get('code');
  if (!code) throw new OAuthError('No authorization code returned — try again.');
  if (returned.searchParams.get('state') !== state) {
    throw new OAuthError('Authorization response failed a security check — try again.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    code_verifier: verifier,
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  return requestTokens(config.tokenEndpoint, body);
}

/** Exchanges a refresh token for a new access token (no browser round-trip). */
export async function refresh(config: OAuthProviderConfig, refreshToken: string): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  return requestTokens(config.tokenEndpoint, body);
}

async function requestTokens(tokenEndpoint: string, body: URLSearchParams): Promise<OAuthTokens> {
  let res: Response;
  try {
    res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch {
    throw new OAuthError('Could not reach the server — check your connection and try again.');
  }
  if (!res.ok) {
    throw new OAuthError('The connection was rejected — try reconnecting.');
  }
  const json = await res.json();
  if (!json.access_token) throw new OAuthError('No access token returned — try again.');
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? undefined,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
}
