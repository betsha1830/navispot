'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthContextType, SpotifyAuthState, NavidromeAuthState, SPOTIFY_STORAGE_KEY, NAVIDROME_STORAGE_KEY } from '@/types/auth-context';
import { SpotifyToken, SpotifyUser } from '@/types/spotify-auth';
import { NavidromeCredentials } from '@/types/navidrome';
import { NavidromeApiClient } from '@/lib/navidrome/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [spotify, setSpotify] = useState<SpotifyAuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
  });
  const [navidrome, setNavidrome] = useState<NavidromeAuthState>({
    isConnected: false,
    credentials: null,
    serverVersion: null,
    error: null,
    token: null,
    clientId: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const testNavidromeConnection = useCallback(async (credentials: NavidromeCredentials): Promise<boolean> => {
    console.log('[testNavidromeConnection] Called with:', credentials);
    console.log('[testNavidromeConnection] Current localStorage:', localStorage.getItem(NAVIDROME_STORAGE_KEY));
    
    if (!credentials) {
      console.log('[testNavidromeConnection] No credentials provided, disconnecting');
      setNavidrome((prev) => ({
        ...prev,
        isConnected: false,
        serverVersion: null,
        error: 'No credentials set',
        token: null,
        clientId: null,
      }));
      return false;
    }

    try {
      const storedAuth = localStorage.getItem(NAVIDROME_STORAGE_KEY);
      let storedToken = '';
      let storedClientId = '';
      
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        storedToken = parsed.token ?? '';
        storedClientId = parsed.clientId ?? '';
        console.log('[testNavidromeConnection] Stored token exists:', !!storedToken);
        console.log('[testNavidromeConnection] Stored clientId exists:', !!storedClientId);
      } else {
        console.log('[testNavidromeConnection] No stored auth found');
      }

      const client = new NavidromeApiClient(
        credentials.url,
        credentials.username,
        credentials.password,
        storedToken || undefined,
        storedClientId || undefined
      );
      
      console.log('[testNavidromeConnection] Attempting to ping Navidrome...');
      await client.ping();
      const token = client.getToken();
      const clientId = client.getClientId();
      
      console.log('[testNavidromeConnection] Ping successful, new token:', !!token);
      console.log('[testNavidromeConnection] New clientId:', !!clientId);
      
      if (token && clientId) {
        console.log('[testNavidromeConnection] Saving to localStorage and updating state');
        localStorage.setItem(NAVIDROME_STORAGE_KEY, JSON.stringify({
          url: credentials.url,
          username: credentials.username,
          password: credentials.password,
          token,
          clientId,
        }));
        
        setNavidrome((prev) => ({
          ...prev,
          isConnected: true,
          serverVersion: 'Navidrome (native API)',
          error: null,
          token,
          clientId,
        }));
        console.log('[testNavidromeConnection] Success - Navidrome connected');
        return true;
      }

      console.log('[testNavidromeConnection] Failed - no token/clientId returned');
      setNavidrome((prev) => ({
        ...prev,
        isConnected: false,
        serverVersion: null,
        error: 'Failed to authenticate',
        token: null,
        clientId: null,
      }));
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      console.log('[testNavidromeConnection] Error:', errorMessage);
      setNavidrome((prev) => ({
        ...prev,
        isConnected: false,
        serverVersion: null,
        error: errorMessage,
        token: null,
        clientId: null,
      }));
      return false;
    }
  }, []);

  const refreshSpotifyTokenFromStorage = useCallback(async (token: SpotifyToken, user: SpotifyUser): Promise<boolean> => {
    if (!token.refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: token.refreshToken }),
      });

      if (!response.ok) return false;

      const newToken = await response.json();
      const updatedToken: SpotifyToken = {
        ...token,
        accessToken: newToken.access_token,
        expiresAt: Date.now() + newToken.expires_in * 1000,
      };

      localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify({ token: updatedToken, user }));
      setSpotify({
        isAuthenticated: true,
        token: updatedToken,
        user,
      });
      return true;
    } catch (error) {
      console.error('Error refreshing Spotify token on load:', error);
      return false;
    }
  }, []);

  const loadStoredAuth = useCallback(async () => {
    console.log('[loadStoredAuth] Loading stored auth data...');
    try {
      let spotifySuccess = false;
      const storedSpotify = localStorage.getItem(SPOTIFY_STORAGE_KEY);
      if (storedSpotify) {
        const parsed = JSON.parse(storedSpotify) as { token: SpotifyToken; user: SpotifyUser };
        if (parsed.token) {
          const isExpired = parsed.token.expiresAt <= Date.now();
          
          console.log('[loadStoredAuth] Spotify token found, expired:', isExpired);
          
          if (isExpired) {
            console.log('[loadStoredAuth] Token expired, attempting refresh from storage');
            const refreshed = await refreshSpotifyTokenFromStorage(parsed.token, parsed.user);
            if (refreshed) {
              console.log('[loadStoredAuth] Token refreshed successfully from storage');
              spotifySuccess = true;
            } else {
              console.log('[loadStoredAuth] Refresh failed, clearing token');
              localStorage.removeItem(SPOTIFY_STORAGE_KEY);
            }
          } else {
            console.log('[loadStoredAuth] Token valid, setting Spotify state');
            setSpotify({
              isAuthenticated: true,
              token: parsed.token,
              user: parsed.user,
            });
            spotifySuccess = true;
          }
        } else {
          localStorage.removeItem(SPOTIFY_STORAGE_KEY);
        }
      } else {
        console.log('[loadStoredAuth] No stored Spotify auth found');
      }

      if (!storedSpotify) {
        console.log('[loadStoredAuth] Checking session cookie for Spotify auth...');
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        
        if (data.authenticated && data.token) {
          const response2 = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${data.token.accessToken}` },
          });
          
          if (response2.ok) {
            const user = await response2.json();
            const authData = { token: data.token, user };
            localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify(authData));
            setSpotify({
              isAuthenticated: true,
              token: data.token,
              user,
            });
            spotifySuccess = true;
          }
        }
      }

      const storedNavidrome = localStorage.getItem(NAVIDROME_STORAGE_KEY);
      if (storedNavidrome) {
        console.log('[loadStoredAuth] Navidrome auth found in storage');
        const parsed = JSON.parse(storedNavidrome);
        setNavidrome((prev) => ({
          ...prev,
          credentials: { url: parsed.url, username: parsed.username, password: parsed.password },
          token: parsed.token ?? null,
          clientId: parsed.clientId ?? '',
        }));
        console.log('[loadStoredAuth] Testing Navidrome connection...');
        await testNavidromeConnection({ url: parsed.url, username: parsed.username, password: parsed.password });
      } else {
        console.log('[loadStoredAuth] No stored Navidrome auth found');
      }
    } catch (error) {
      console.error('[loadStoredAuth] Error loading stored auth:', error);
    } finally {
      console.log('[loadStoredAuth] Loading complete, isLoading = false');
      setIsLoading(false);
    }
  }, [testNavidromeConnection, refreshSpotifyTokenFromStorage]);

  useEffect(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  const spotifyLogin = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/spotify');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error initiating Spotify login:', error);
      throw error;
    }
  }, []);

  const spotifyLogout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/spotify', { method: 'DELETE' });
      if (response.ok) {
        localStorage.removeItem(SPOTIFY_STORAGE_KEY);
        setSpotify({
          isAuthenticated: false,
          user: null,
          token: null,
        });
      }
    } catch (error) {
      console.error('Error logging out from Spotify:', error);
      localStorage.removeItem(SPOTIFY_STORAGE_KEY);
      setSpotify({
        isAuthenticated: false,
        user: null,
        token: null,
      });
    }
  }, []);

  const refreshSpotifyToken = useCallback(async (): Promise<boolean> => {
    console.log('[refreshSpotifyToken] Called');
    try {
      const stored = localStorage.getItem(SPOTIFY_STORAGE_KEY);
      if (!stored) {
        console.log('[refreshSpotifyToken] No stored Spotify auth found');
        return false;
      }
      
      const parsed = JSON.parse(stored) as { token: SpotifyToken };
      if (!parsed.token?.refreshToken) {
        console.log('[refreshSpotifyToken] No refresh token available');
        return false;
      }

      console.log('[refreshSpotifyToken] Sending refresh request to /api/auth/refresh');
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: parsed.token.refreshToken }),
      });

      if (!response.ok) {
        console.log('[refreshSpotifyToken] Refresh request failed:', response.status, response.statusText);
        return false;
      }

      const newToken = await response.json();
      const updatedToken: SpotifyToken = {
        ...parsed.token,
        accessToken: newToken.access_token,
        expiresAt: Date.now() + newToken.expires_in * 1000,
      };

      console.log('[refreshSpotifyToken] Token refreshed successfully, saving to localStorage');
      localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify({ token: updatedToken, user: spotify.user }));
      setSpotify((prev) => ({ ...prev, token: updatedToken }));
      console.log('[refreshSpotifyToken] Success - Spotify token updated');
      return true;
    } catch (error) {
      console.error('[refreshSpotifyToken] Error:', error);
      return false;
    }
  }, [spotify.user]);

  const setNavidromeCredentials = useCallback(async (credentials: NavidromeCredentials): Promise<boolean> => {
    setNavidrome((prev) => ({ ...prev, error: null, credentials }));

    try {
      const client = new NavidromeApiClient(
        credentials.url,
        credentials.username,
        credentials.password
      );
      
      const loginResult = await client.login(credentials.username, credentials.password);
      
      if (!loginResult.success) {
        setNavidrome((prev) => ({
          ...prev,
          isConnected: false,
          error: loginResult.error || 'Login failed',
          token: null,
          clientId: null,
        }));
        return false;
      }

      const token = client.getToken();
      const clientId = client.getClientId();
      
      localStorage.setItem(NAVIDROME_STORAGE_KEY, JSON.stringify({
        url: credentials.url,
        username: credentials.username,
        password: credentials.password,
        token,
        clientId,
      }));

      setNavidrome((prev) => ({
        ...prev,
        isConnected: true,
        serverVersion: 'Navidrome (native API)',
        error: null,
        token,
        clientId,
      }));

      return true;
    } catch (error) {
      console.error('Error setting Navidrome credentials:', error);
      setNavidrome((prev) => ({
        ...prev,
        isConnected: false,
        error: 'Failed to save credentials',
        token: null,
        clientId: null,
      }));
      return false;
    }
  }, []);

  const clearNavidromeCredentials = useCallback(() => {
    localStorage.removeItem(NAVIDROME_STORAGE_KEY);
    setNavidrome({
      isConnected: false,
      credentials: null,
      serverVersion: null,
      error: null,
      token: null,
      clientId: null,
    });
  }, []);

  const value: AuthContextType = {
    spotify,
    navidrome,
    spotifyLogin,
    spotifyLogout,
    refreshSpotifyToken,
    setNavidromeCredentials,
    testNavidromeConnection,
    clearNavidromeCredentials,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
