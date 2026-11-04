import { NextResponse } from 'next/server';
import { readNavidromeEnv } from '@/lib/navidrome/env-config';

/**
 * Returns the server's Navidrome login when NAVIDROME_URL, NAVIDROME_USERNAME,
 * and NAVIDROME_PASSWORD are set. The browser client needs these to call
 * Navidrome directly, the same way a value typed into the login form does.
 */
export async function GET() {
  const credentials = readNavidromeEnv();
  if (!credentials) {
    return NextResponse.json(
      { configured: false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { configured: true, ...credentials },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
