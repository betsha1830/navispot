import { NextRequest, NextResponse } from 'next/server';
import { SpotifyToken } from '@/types';

export async function GET(request: NextRequest) {
  const tokenCookie = request.cookies.get('spotify_token')?.value;

  if (!tokenCookie) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const decoded = JSON.parse(Buffer.from(tokenCookie, 'base64').toString()) as SpotifyToken;
    
    if (decoded.expiresAt <= Date.now()) {
      const response = NextResponse.json({ authenticated: false, error: 'expired' });
      response.cookies.delete('spotify_token');
      return response;
    }

    return NextResponse.json({ authenticated: true, token: decoded });
  } catch {
    return NextResponse.json({ authenticated: false, error: 'invalid_token' });
  }
}
