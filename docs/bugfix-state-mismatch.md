# Bug Fix: state_mismatch in Spotify OAuth Callback

## Issue

After initiating Spotify OAuth authentication, users were redirected to `http://0.0.0.0:3000/?error=state_mismatch`.

## Root Cause

In `app/api/auth/spotify/route.ts`, the OAuth initiation endpoint was:
1. Generating a state parameter and sending it to Spotify
2. Storing only the `code_verifier` in cookies
3. NOT storing the `state` in cookies

When Spotify redirected back to `/api/auth/callback`, the callback handler at `app/api/auth/callback/route.ts:21` validated the returned state against a cookie:

```typescript
const cookieState = request.cookies.get('spotify_auth_state')?.value;
if (!cookieState || cookieState !== state) {
  return NextResponse.redirect(new URL('/?error=state_mismatch', request.url));
}
```

Since `spotify_auth_state` cookie was never set, the validation failed with `state_mismatch`.

## Fix

Added the missing `spotify_auth_state` cookie in `app/api/auth/spotify/route.ts`:

```typescript
response.cookies.set('spotify_auth_state', state, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 10,
  path: '/',
});
```

## Files Changed

- `app/api/auth/spotify/route.ts` - Added state cookie

## Verification

- Ran linting - no errors
- OAuth flow now validates state correctly
