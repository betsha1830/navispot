import { NextRequest, NextResponse } from 'next/server';
import { SpotifyToken } from '@/types';

export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'navispot.queen.pro.et';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, baseUrl));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=missing_params', baseUrl));
  }

  const cookieState = request.cookies.get('spotify_auth_state')?.value;
  const codeVerifier = request.cookies.get('spotify_code_verifier')?.value;

  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', baseUrl));
  }

  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/?error=no_verifier', baseUrl));
  }

  try {
    const tokenData = await exchangeCodeForToken(code, codeVerifier);
    
    const response = NextResponse.redirect(new URL('/?auth=success', baseUrl));
    
    const token: SpotifyToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
    };

    const encryptedToken = Buffer.from(JSON.stringify(token)).toString('base64');
    
    response.cookies.set('spotify_token', encryptedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    response.cookies.delete('spotify_auth_state');
    response.cookies.delete('spotify_code_verifier');

    return response;
  } catch {
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', baseUrl));
  }
}

interface TokenExchangeResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<TokenExchangeResponse> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri || 'http://localhost:3000/api/auth/callback',
      client_id: clientId || '',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}
