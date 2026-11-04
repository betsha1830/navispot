import { describe, expect, it } from 'vitest';
import { readNavidromeEnv } from './env-config';

describe('readNavidromeEnv', () => {
  it('returns credentials when url, username, and password are set', () => {
    expect(readNavidromeEnv({
      NAVIDROME_URL: 'https://music.example/',
      NAVIDROME_USERNAME: ' ada ',
      NAVIDROME_PASSWORD: 'secret',
    })).toEqual({
      url: 'https://music.example',
      username: 'ada',
      password: 'secret',
    });
  });

  it('returns null unless all three values are present', () => {
    expect(readNavidromeEnv({ NAVIDROME_URL: 'https://music.example' })).toBeNull();
    expect(readNavidromeEnv({
      NAVIDROME_URL: 'https://music.example',
      NAVIDROME_USERNAME: 'ada',
      NAVIDROME_PASSWORD: '',
    })).toBeNull();
  });
});
