import { NavidromeCredentials } from '@/types/navidrome';

/** Server env for a self-hosted Navidrome login. Missing any field means "not configured". */
export function readNavidromeEnv(
  env: Record<string, string | undefined> = process.env,
): NavidromeCredentials | null {
  const url = env.NAVIDROME_URL?.trim().replace(/\/+$/, '');
  const username = env.NAVIDROME_USERNAME?.trim();
  const password = env.NAVIDROME_PASSWORD;

  if (!url || !username || !password) return null;
  return { url, username, password };
}
