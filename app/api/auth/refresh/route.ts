import { NextRequest, NextResponse } from 'next/server';

/**
 * Refreshes a Spotify access token.
 *
 * Response codes:
 *  - 200: { access_token, token_type, expires_in, scope? } — success
 *  - 400: { error: 'invalid_grant' } — refresh token is expired/revoked.
 *          Spotify docs: the app must discard the token and send the user
 *          through the authorization flow again. Retrying is pointless.
 *  - 400: { error: 'invalid_request' } — no refresh token in the body
 *  - 502: Spotify's token endpoint failed (transient — retrying is fine)
 *  - 500: unexpected server error
 */
export async function POST(request: NextRequest) {
  try {
    let refreshToken: unknown;
    try {
      const body = await request.json();
      refreshToken = body?.refreshToken;
    } catch {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const tokenEndpoint = process.env.SPOTIFY_TOKEN_URL ?? 'https://accounts.spotify.com/api/token';
    let response: Response;
    try {
      response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentialsHeader()}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });
    } catch {
      // Network failure reaching Spotify — transient.
      return NextResponse.json({ error: 'token_endpoint_unreachable' }, { status: 502 });
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      // Spotify returns 400 with error=invalid_grant when the refresh token
      // has expired (6-month lifetime) or been revoked. Propagate the code so
      // the client can force a clean re-login instead of retrying forever.
      if (response.status === 400 && /invalid_grant/.test(bodyText)) {
        return NextResponse.json({ error: 'invalid_grant' }, { status: 400 });
      }
      // invalid_client = bad/missing SPOTIFY_CLIENT_ID or SECRET — a config
      // error, not a transient one. Don't make the client retry it.
      if (response.status === 400 && /invalid_client/.test(bodyText)) {
        console.error('[auth/refresh] Spotify rejected the client credentials — check SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET');
        return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
      }
      console.error(`[auth/refresh] Spotify token endpoint returned ${response.status}: ${bodyText.slice(0, 300)}`);
      return NextResponse.json({ error: 'token_endpoint_error', status: response.status }, { status: 502 });
    }

    const data = (await response.json()) as TokenRefreshResponse;

    // Spotify may rotate refresh tokens; when it does not include one,
    // the caller must keep using the existing refresh token.
    return NextResponse.json({
      access_token: data.access_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
      scope: data.scope,
      refresh_token: data.refresh_token,
    });
  } catch (error) {
    console.error('[auth/refresh] unexpected error:', error);
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 });
  }
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

function credentialsHeader(): string {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  return Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}
