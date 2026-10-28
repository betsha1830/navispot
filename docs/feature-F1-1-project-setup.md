# F1.1 Project Setup - Folder Structure

## Overview

This document describes the folder structure for the NaviSpot-Plist Next.js application.

## Architecture

- **Frontend**: Next.js 16 (React 19) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Authentication**: Spotify OAuth 2.0 + Navidrome Basic Auth
- **State Management**: React Context + localStorage

## Folder Structure

```
navispot-plist/
├── app/                    # Next.js App Router directory
│   ├── api/               # API Routes (Next.js backend)
│   │   ├── auth/         # Authentication endpoints
│   │   │   ├── spotify/  # Spotify OAuth flow
│   │   │   └── callback/ # OAuth callback handler
│   │   ├── spotify/      # Spotify API proxies
│   │   └── navidrome/    # Navidrome API proxies
│   ├── components/        # React components
│   │   ├── ui/          # Reusable UI components
│   │   ├── playlist/    # Playlist-related components
│   │   ├── track/       # Track-related components
│   │   └── export/      # Export-related components
│   ├── context/          # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── SettingsContext.tsx
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── lib/                   # Utilities and API clients
│   ├── spotify/         # Spotify API client
│   ├── navidrome/       # Navidrome Subsonic client
│   ├── matching/        # Track matching algorithms
│   └── utils.ts         # Helper functions
├── types/                # TypeScript type definitions
│   ├── spotify.ts       # Spotify data types
│   ├── navidrome.ts     # Navidrome data types
│   └── index.ts         # Shared types and exports
├── styles/              # Additional styles
│   └── components/      # Component-specific styles
├── public/              # Static assets
├── docs/                # Documentation
├── package.json
├── tsconfig.json
└── next.config.ts
```

## Directory Purposes

### `/app/api/`
Next.js API routes handling backend functionality:
- `/app/api/auth/` - Spotify OAuth endpoints
- `/app/api/spotify/` - Spotify API proxies
- `/app/api/navidrome/` - Navidrome API proxies

### `/app/components/`
React components organized by feature:
- `ui/` - Generic components (buttons, cards, modals)
- `playlist/` - Playlist display and management
- `track/` - Track list and matching indicators
- `export/` - Export preview and progress

### `/app/context/`
React Context providers:
- `AuthContext.tsx` - Authentication state management
- `SettingsContext.tsx` - User preferences and matching settings

### `/lib/`
Core application logic:
- `spotify/` - Spotify API client and utilities
- `navidrome/` - Navidrome Subsonic API client
- `matching/` - Track matching algorithms (ISRC, Fuzzy, Strict)

### `/types/`
TypeScript type definitions:
- `spotify.ts` - Spotify API response types
- `navidrome.ts` - Navidrome API response types
- `index.ts` - Shared types and re-exports

### `/styles/`
Additional CSS styles beyond Tailwind:
- `components/` - Component-specific custom styles

## Related Documentation

- [Project Plan](../project-plan.md) - Full project specification
- [API Design](../project-plan.md#api-design) - Endpoint documentation
- [Data Models](../project-plan.md#data-models) - Type definitions

---

# F1.1 Project Setup - Environment Variables

## Overview

This document describes the environment variables configuration for the NaviSpot-Plist Next.js application.

## File Location

- Template: `.env.example`
- Local overrides: `.env.local` (not committed to version control)

## Environment Variables

### Spotify Configuration (Required)

These variables are required for Spotify OAuth authentication and API access.

| Variable | Required | Description |
|----------|----------|-------------|
| `SPOTIFY_CLIENT_ID` | Yes | The client ID from your Spotify Developer Dashboard application |
| `SPOTIFY_CLIENT_SECRET` | Yes | The client secret from your Spotify Developer Dashboard application |
| `SPOTIFY_REDIRECT_URI` | Yes | The OAuth callback URL that must match exactly with the Redirect URI configured in Spotify Developer Dashboard |

#### Getting Spotify Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create An App"
4. Fill in the app name and description
5. Click "Edit Settings"
6. Add `http://localhost:3000/api/auth/callback` to **Redirect URIs**
7. Click "Save"
8. Copy the **Client ID** and **Client Secret** from the app overview page

#### Important Notes

- The `SPOTIFY_REDIRECT_URI` must match exactly between this environment variable and the Spotify Developer Dashboard configuration
- For production, update this to your production domain before deploying
- The `SPOTIFY_CLIENT_SECRET` should never be exposed in client-side code

### Navidrome Configuration (Optional)

These variables are for Navidrome server connection. They are optional because the application is designed to prompt users for Navidrome credentials through the UI, which are then stored securely in localStorage.

| Variable | Required | Description |
|----------|----------|-------------|
| `NAVIDROME_URL` | No | The base URL of your Navidrome server (e.g., `http://localhost:4533`) |
| `NAVIDROME_USERNAME` | No | Your Navidrome username |
| `NAVIDROME_PASSWORD` | No | Your Navidrome password |

#### Why These Are Optional

- Security: Credentials stored in localStorage are not persisted on the server
- Flexibility: Users can connect to different Navidrome servers
- Convenience: Credentials can be set via environment variables for development

#### Setting Navidrome Credentials

**Option 1: Environment Variables (Development)**
```bash
NAVIDROME_URL=http://localhost:4533
NAVIDROME_USERNAME=admin
NAVIDROME_PASSWORD=your_password
```

**Option 2: UI Configuration (Recommended)**
- On first use, the application will prompt for Navidrome credentials
- These are stored in localStorage and used for API requests
- Users can update credentials at any time through the settings

### Application Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | The base URL of the application used for OAuth redirects and API URL generation |

#### Usage

- Local development: `http://localhost:3000`
- Production: `https://your-production-domain.com`

## Setting Up Your Environment

### Step 1: Copy the Template

```bash
cp .env.example .env.local
```

### Step 2: Configure Spotify Credentials

1. Create an app in [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add the redirect URI: `http://localhost:3000/api/auth/callback`
3. Copy your Client ID and Client Secret to `.env.local`

### Step 3: (Optional) Configure Navidrome

For development, you can set Navidrome credentials in `.env.local`:

```bash
NAVIDROME_URL=http://localhost:4533
NAVIDROME_USERNAME=admin
NAVIDROME_PASSWORD=your_password
```

### Step 4: Start the Application

```bash
npm run dev
```

## Security Considerations

### Environment Variables vs localStorage

| Data | Storage | Reason |
|------|---------|--------|
| Spotify Client Secret | Environment variable | Never exposed to client, server-side only |
| Spotify Access/Refresh Tokens | localStorage (encrypted) | Persist across sessions, used by client |
| Navidrome Credentials | localStorage | Not stored server-side for security |

### Best Practices

1. **Never commit `.env.local`** to version control
2. **Use different Spotify apps** for development and production
3. **Rotate credentials** if they are ever compromised
4. **Use HTTPS** in production for all communications

## Production Deployment

When deploying to production, ensure:

1. Update `SPOTIFY_REDIRECT_URI` to your production domain
2. Create a new Spotify app for production (or add production redirect URI)
3. Set `NEXT_PUBLIC_APP_URL` to your production URL
4. Do NOT set `NAVIDROME_*` variables - let users configure via UI
5. Use HTTPS for all URLs

Example production `.env`:
```bash
SPOTIFY_CLIENT_ID=your_production_client_id
SPOTIFY_CLIENT_SECRET=<paste-your-client-secret-here>
SPOTIFY_REDIRECT_URI=https://navispotplist.yourdomain.com/api/auth/callback
NEXT_PUBLIC_APP_URL=https://navispotplist.yourdomain.com
```

## Troubleshooting

### OAuth Redirect URI Mismatch

**Error**: "The redirect URI is wrong" or OAuth callback fails

**Solution**: Ensure `SPOTIFY_REDIRECT_URI` in `.env.local` matches exactly what's configured in Spotify Developer Dashboard, including protocol (http/https), port, and path.

### Missing Spotify Credentials

**Error**: "Spotify client not configured" or 401 errors

**Solution**: Verify `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set correctly in `.env.local`. Restart the development server after making changes.

### Navidrome Connection Issues

**Error**: "Failed to connect to Navidrome" or authentication failures

**Solution**:
1. Verify `NAVIDROME_URL` is reachable from your browser
2. Check username and password are correct
3. Ensure Navidrome has CORS enabled for your application URL

---

# F1.1 Project Setup - Configuration Review

## Date: 2026-01-04

## Overview

This document describes the configuration review for TypeScript, ESLint, and Tailwind CSS in the NaviSpot-Plist Next.js application.

## Requirements Met

1. ✅ Review existing configuration files (tsconfig.json, eslint.config.mjs, tailwind.config.mjs, postcss.config.mjs)
2. ✅ Ensure TypeScript is properly configured with strict mode and appropriate settings for Next.js
3. ✅ Ensure ESLint is configured with Next.js best practices
4. ✅ Ensure Tailwind CSS is properly configured
5. ✅ Document findings in this file

---

## 1. TypeScript Configuration (`tsconfig.json`)

### Status: ✅ Properly Configured

### Findings:

| Setting | Value | Assessment |
|---------|-------|------------|
| `target` | ES2017 | ✅ Appropriate for Next.js |
| `lib` | ["dom", "dom.iterable", "esnext"] | ✅ Complete |
| `strict` | true | ✅ Strict mode enabled |
| `noEmit` | true | ✅ Required for Next.js |
| `esModuleInterop` | true | ✅ Enabled |
| `module` | esnext | ✅ Modern ES modules |
| `moduleResolution` | bundler | ✅ Recommended for Next.js |
| `resolveJsonModule` | true | ✅ Enabled |
| `isolatedModules` | true | ✅ Enabled |
| `jsx` | react-jsx | ✅ Optimized for React |
| `incremental` | true | ✅ Build optimization |
| `plugins` | [{ name: "next" }] | ✅ Next.js integration |
| `paths` | @/* → ./* | ✅ Path aliases configured |

### Include Patterns:
- `next-env.d.ts` - Next.js type declarations
- `**/*.ts`, `**/*.tsx` - All TypeScript files
- `.next/types/**/*.ts` - Build type output
- `**/*.mts` - TypeScript module files

### Exclude Patterns:
- `node_modules` - Standard exclusion

### Recommendation:
No changes required. The TypeScript configuration follows Next.js best practices with strict mode enabled.

---

## 2. ESLint Configuration (`eslint.config.mjs`)

### Status: ✅ Properly Configured

### Findings:

| Aspect | Configuration | Assessment |
|--------|---------------|------------|
| Config Format | Flat config (`eslint/config`) | ✅ Modern ESLint 9+ |
| Next.js Rules | `eslint-config-next/core-web-vitals` | ✅ Best practices |
| TypeScript Rules | `eslint-config-next/typescript` | ✅ TypeScript support |
| Global Ignores | .next/**, out/**, build/** | ✅ Properly configured |

### Configuration Details:
```javascript
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([...]),
]);
```

### Verification:
- ESLint runs without errors (`npm run lint`)
- All files pass linting
- No custom rules required at this stage

### Recommendation:
No changes required. ESLint is properly configured using the modern flat config format with `eslint-config-next` extending Next.js best practices.

---

## 3. Tailwind CSS Configuration

### Status: ✅ Properly Configured

### Version: Tailwind CSS v4 (^4.0.0)

#### Configuration Files:

**`app/globals.css`:**
- ✅ Uses `@import "tailwindcss";` (Tailwind v4 syntax)
- ✅ Theme configuration with CSS custom properties
- ✅ Dark mode support with `@media (prefers-color-scheme: dark)`
- ✅ Custom color variables defined
- ✅ Font variables properly mapped

**`postcss.config.mjs`:**
- ✅ `@tailwindcss/postcss` plugin configured
- ✅ Proper export structure

**`app/layout.tsx`:**
- ✅ Imports globals.css
- ✅ Font variables applied to body
- ✅ Antialiasing class applied

**Note:** Tailwind CSS v4 uses a CSS-first configuration approach and does not require a `tailwind.config.ts` file by default. All configuration is done directly in CSS.

### Tailwind v4 Features in Use:
1. `@import "tailwindcss"` - Modern import syntax
2. `@theme` - CSS-based theme configuration
3. CSS custom properties for colors
4. Built-in dark mode support
5. `@tailwindcss/postcss` for PostCSS integration

### Recommendation:
No changes required. Tailwind CSS v4 is properly configured with modern CSS-first approach.

---

## 4. Next.js Configuration (`next.config.ts`)

### Status: ⚠️ Minimal Configuration

### Findings:
- Basic NextConfig with no options set
- Type definitions properly imported
- No TypeScript errors

### Recommendation:
Configuration is sufficient for current project state. Add specific options as features are implemented (e.g., `images.domains` for Spotify album art).

---

## 5. Package.json Dependencies

### Status: ✅ Complete

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.1 | Core framework |
| `react` | 19.2.3 | UI library |
| `react-dom` | 19.2.3 | React DOM |
| `typescript` | ^5 | TypeScript compiler |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.1.1 | Next.js ESLint config |
| `tailwindcss` | ^4 | CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS plugin |

---

## 6. Verification Results

### TypeScript Type Check:
```bash
$ npx tsc --noEmit
# Exit code: 0 - No errors
```

### ESLint:
```bash
$ npm run lint
# Exit code: 0 - No errors
```

---

## 7. Summary

| Configuration | Status | Action Required |
|---------------|--------|-----------------|
| TypeScript | ✅ Ready | None |
| ESLint | ✅ Ready | None |
| Tailwind CSS | ✅ Ready | None |
| Next.js | ⚠️ Basic | Add options as needed |

### Overall Assessment:
The project is properly configured with TypeScript strict mode, modern ESLint flat config, and Tailwind CSS v4. All configuration files follow Next.js 16 and React 19 best practices.

### Changes Made:
- None required - configuration was already complete

### Next Steps:
1. Begin implementing F1.2 (Spotify OAuth Client)
2. Add Next.js config options as features require (e.g., image domains)
3. Consider adding project-specific ESLint rules if needed during development

---

## 8. References

- [Next.js TypeScript Documentation](https://nextjs.org/docs/app/api-reference/config/typescript)
- [ESLint Flat Config Guide](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Next.js ESLint Configuration](https://nextjs.org/docs/app/api-reference/config/eslint)

---

## Status

✅ Completed - Folder structure created
✅ Completed - Environment variables template created
✅ Completed - Configuration review finished, no changes required
