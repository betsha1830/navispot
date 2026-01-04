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
  });
  const [isLoading, setIsLoading] = useState(true);

  const testNavidromeConnection = useCallback(async (credentials: NavidromeCredentials): Promise<boolean> => {
    if (!credentials) {
      setNavidrome((prev) => ({
        ...prev,
        isConnected: false,
        serverVersion: null,
        error: 'No credentials set',
      }));
      return false;
    }

    try {
      const client = new NavidromeApiClient(
        credentials.url,
        credentials.username,
        credentials.password
      );
      const result = await client.ping();

      if (result.success) {
        setNavidrome((prev) => ({
          ...prev,
          isConnected: true,
          serverVersion: result.serverVersion || null,
          error: null,
        }));
        return true;
      } else {
        setNavidrome((prev) => ({
          ...prev,
          isConnected: false,
          serverVersion: null,
          error: result.error || 'Connection failed',
        }));
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setNavidrome((prev) => ({
        ...prev,
        isConnected: false,
        serverVersion: null,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  const loadStoredAuth = useCallback(async () => {
    try {
      const storedSpotify = localStorage.getItem(SPOTIFY_STORAGE_KEY);
      if (storedSpotify) {
        const parsed = JSON.parse(storedSpotify) as { token: SpotifyToken; user: SpotifyUser };
        if (parsed.token && parsed.token.expiresAt > Date.now()) {
          setSpotify({
            isAuthenticated: true,
            token: parsed.token,
            user: parsed.user,
          });
        } else {
          localStorage.removeItem(SPOTIFY_STORAGE_KEY);
        }
      }

      const storedNavidrome = localStorage.getItem(NAVIDROME_STORAGE_KEY);
      if (storedNavidrome) {
        const parsed = JSON.parse(storedNavidrome) as NavidromeCredentials;
        setNavidrome((prev) => ({
          ...prev,
          credentials: parsed,
        }));
        await testNavidromeConnection(parsed);
      }

      if (!storedSpotify) {
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
          }
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  }, [testNavidromeConnection]);

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
    try {
      const stored = localStorage.getItem(SPOTIFY_STORAGE_KEY);
      if (!stored) return false;
      
      const parsed = JSON.parse(stored) as { token: SpotifyToken };
      if (!parsed.token?.refreshToken) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: parsed.token.refreshToken }),
      });

      if (!response.ok) return false;

      const newToken = await response.json();
      const updatedToken: SpotifyToken = {
        ...parsed.token,
        accessToken: newToken.access_token,
        expiresAt: Date.now() + newToken.expires_in * 1000,
      };

      localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify({ token: updatedToken, user: spotify.user }));
      setSpotify((prev) => ({ ...prev, token: updatedToken }));
      return true;
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      return false;
    }
  }, [spotify.user]);

  const setNavidromeCredentials = useCallback(async (credentials: NavidromeCredentials): Promise<boolean> => {
    setNavidrome((prev) => ({ ...prev, error: null, credentials }));

    try {
      localStorage.setItem(NAVIDROME_STORAGE_KEY, JSON.stringify(credentials));

      const success = await testNavidromeConnection(credentials);
      return success;
    } catch (error) {
      console.error('Error setting Navidrome credentials:', error);
      setNavidrome((prev) => ({
        ...prev,
        error: 'Failed to save credentials',
      }));
      return false;
    }
  }, [testNavidromeConnection]);

  const clearNavidromeCredentials = useCallback(() => {
    localStorage.removeItem(NAVIDROME_STORAGE_KEY);
    setNavidrome({
      isConnected: false,
      credentials: null,
      serverVersion: null,
      error: null,
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
