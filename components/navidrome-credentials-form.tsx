'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { NavidromeCredentials } from '@/types/navidrome';

export function NavidromeCredentialsForm() {
  const { navidrome, setNavidromeCredentials, clearNavidromeCredentials, isLoading } = useAuth();
  const [formData, setFormData] = useState<NavidromeCredentials>({
    url: '',
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ url?: string; username?: string; password?: string }>({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (navidrome.credentials) {
      setFormData({
        url: navidrome.credentials.url,
        username: navidrome.credentials.username,
        password: navidrome.credentials.password,
      });
    }
  }, [navidrome.credentials]);

  const validateForm = useCallback((): boolean => {
    const newErrors: { url?: string; username?: string; password?: string } = {};

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateForm()) {
      return;
    }

    setIsConnecting(true);
    try {
      const success = await setNavidromeCredentials(formData);
      if (!success) {
        setLocalError(navidrome.error || 'Connection failed');
      }
    } catch {
      setLocalError('An unexpected error occurred');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setFormData({ url: '', username: '', password: '' });
    setErrors({});
    setLocalError(null);
    clearNavidromeCredentials();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-10 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Navidrome Server
        </h2>
        {navidrome.isConnected ? (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Connected
              {navidrome.serverVersion && ` (${navidrome.serverVersion})`}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Not connected
            </span>
          </div>
        )}
      </div>

      {navidrome.error && !localError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {navidrome.error}
        </div>
      )}

      {localError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {localError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="navidrome-url"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Server URL
          </label>
          <input
            id="navidrome-url"
            type="url"
            value={formData.url}
            onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
            placeholder="https://your-navidrome-server.com"
            disabled={navidrome.isConnected || isConnecting}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-green-500 dark:focus:ring-green-500"
          />
          {errors.url && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.url}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="navidrome-username"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Username
          </label>
          <input
            id="navidrome-username"
            type="text"
            value={formData.username}
            onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="your-username"
            disabled={navidrome.isConnected || isConnecting}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-green-500 dark:focus:ring-green-500"
          />
          {errors.username && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.username}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="navidrome-password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="navidrome-password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
              disabled={navidrome.isConnected || isConnecting}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 pr-10 text-sm placeholder:text-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-green-500 dark:focus:ring-green-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={navidrome.isConnected || isConnecting}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.password}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          {navidrome.isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={isConnecting}
              className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Disconnect
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={isConnecting}
                className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-700"
              >
                {isConnecting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Connecting...
                  </span>
                ) : (
                  'Connect'
                )}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
