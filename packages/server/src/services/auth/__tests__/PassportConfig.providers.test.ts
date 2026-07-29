/**
 * PassportConfig.configuredProviders — the env-gated provider roster
 * that `/auth/status` exposes (start-screen button enablement) and the
 * OAuth-route guard consults (redirect instead of "Unknown
 * authentication strategy" on an unconfigured provider). Mirrors the
 * exact per-provider gates `configure*` applies.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { PassportConfig } from '../PassportConfig';

const ALL_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'TWITCH_CLIENT_ID',
  'TWITCH_CLIENT_SECRET',
  'TWITCH_CALLBACK_URL',
  'KICK_CLIENT_ID',
  'KICK_CLIENT_SECRET',
  'KICK_CALLBACK_URL',
] as const;

function stubAll(overrides: Partial<Record<(typeof ALL_VARS)[number], string>>) {
  for (const v of ALL_VARS) vi.stubEnv(v, overrides[v] ?? '');
}

describe('PassportConfig.configuredProviders', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('empty env → no providers', () => {
    stubAll({});
    expect(PassportConfig.configuredProviders()).toEqual([]);
  });

  it('each provider gates on its full env triple', () => {
    stubAll({
      GOOGLE_CLIENT_ID: 'g',
      GOOGLE_CLIENT_SECRET: 's',
      GOOGLE_CALLBACK_URL: 'http://cb/google',
      KICK_CLIENT_ID: 'k',
      KICK_CLIENT_SECRET: 's',
      KICK_CALLBACK_URL: 'http://cb/kick',
      // Twitch deliberately partial — id only, no secret/callback.
      TWITCH_CLIENT_ID: 't',
    });
    expect(PassportConfig.configuredProviders()).toEqual(['google', 'kick']);
  });

  it('all three configured → all three, stable order', () => {
    stubAll({
      GOOGLE_CLIENT_ID: 'g',
      GOOGLE_CLIENT_SECRET: 's',
      GOOGLE_CALLBACK_URL: 'http://cb/g',
      TWITCH_CLIENT_ID: 't',
      TWITCH_CLIENT_SECRET: 's',
      TWITCH_CALLBACK_URL: 'http://cb/t',
      KICK_CLIENT_ID: 'k',
      KICK_CLIENT_SECRET: 's',
      KICK_CALLBACK_URL: 'http://cb/k',
    });
    expect(PassportConfig.configuredProviders()).toEqual([
      'google',
      'twitch',
      'kick',
    ]);
  });
});
