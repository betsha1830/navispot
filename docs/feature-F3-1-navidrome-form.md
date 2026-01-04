# Feature F3-1: Navidrome Credentials Form

## Overview

Implemented a `NavidromeCredentialsForm` component that allows users to configure and manage their Navidrome server connection.

## Location

`app/components/navidrome-credentials-form.tsx`

## Features

### Form Fields
- **Server URL**: Text input with URL validation
- **Username**: Text input for Navidrome credentials
- **Password**: Password input with show/hide toggle visibility

### Validation
- URL format validation using the URL constructor
- Required field validation for all fields
- Error messages displayed below each field

### Connection Management
- **Connect Button**: Tests and saves credentials to the auth context
- **Disconnect Button**: Clears stored credentials and resets the form
- Loading state during connection testing with spinner
- Pre-fills form with stored credentials on component mount

### Status Display
- Connection status indicator (connected/disconnected)
- Server version display when connected
- Error messages from auth context and local validation

### Styling
- Tailwind CSS with dark mode support
- Consistent with existing component patterns
- Focus states with green border for action buttons
- Disabled states during connection/loading

## Integration

The component uses the `useAuth` hook from `@/lib/auth/auth-context`:
- `navidrome.isConnected`: Displays connection status
- `navidrome.credentials`: Pre-fills form values
- `navidrome.serverVersion`: Shows server version when connected
- `navidrome.error`: Displays connection error messages
- `setNavidromeCredentials`: Tests and saves credentials
- `clearNavidromeCredentials`: Clears stored credentials
- `isLoading`: Handles initial auth loading state
