/**
 * Twitch incremental-scope re-consent — the logic the `/auth/twitch/reauth`
 * flow drives. The route itself is thin Express+passport glue (scope
 * assembly + force_verify, verified by typecheck); the load-bearing
 * behavior is `TwitchProfile.hasScope` and the write-back-to-the-existing-
 * profile that `Application.linkProvider` performs when a same-user
 * re-consent arrives with a broadened scope set. DB stubbed (no Mongo),
 * mirroring `Application.providers.test.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Application } from '../../../backend/Application';
import { User } from '../../../mud/lib/identity/User';
import { TwitchProfile } from '../../../mud/lib/identity/TwitchProfile';
import {
  TWITCH_SCOPE_WRITE_CHAT,
  type PassportTwitchProfileWithTokens,
} from '@saxonberg/types';

function broadenedGrant(): PassportTwitchProfileWithTokens {
  return {
    id: 't-1',
    login: 'streamer',
    displayName: 'Streamer',
    email: 'streamer@example.com',
    _json: { id: 't-1' },
    accessToken: 'at-2',
    refreshToken: 'rt-2',
    expiresAt: 2000,
    // The re-consent returns identity + the newly-granted chat scope.
    scopes: ['user:read:email', TWITCH_SCOPE_WRITE_CHAT],
  };
}

describe('TwitchProfile.hasScope', () => {
  it('reports presence/absence of a scope', () => {
    const p = new TwitchProfile();
    p.scopes = ['user:read:email'];
    expect(p.hasScope('user:read:email')).toBe(true);
    expect(p.hasScope(TWITCH_SCOPE_WRITE_CHAT)).toBe(false);
    p.scopes = ['user:read:email', TWITCH_SCOPE_WRITE_CHAT];
    expect(p.hasScope(TWITCH_SCOPE_WRITE_CHAT)).toBe(true);
  });
});

describe('reauth write-back (incremental scope acquisition)', () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('broadens scopes on the EXISTING profile, no new row, already-linked', async () => {
    const app = Application.get();

    // The user already linked this Twitch identity with identity-only scope.
    const existingProfile = {
      _id: 'tp-1',
      scopes: ['user:read:email'],
      accessToken: 'at-1',
      refreshToken: 'rt-1',
      expiresAt: 1000,
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as TwitchProfile;

    const user = {
      _id: 'u-1',
      twitchProfileId: 'tp-1',
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as User;

    // findProfileIdByIdentity → owns it (same user, no collision); the
    // upsert reads + writes the SAME object; linkProvider then short-circuits
    // already-linked because user[field] === profileId.
    vi.spyOn(TwitchProfile, 'findByTwitchUserId').mockResolvedValue(
      existingProfile
    );
    vi.spyOn(User, 'find').mockResolvedValue([user]);
    vi.spyOn(User, 'findById').mockResolvedValue(user);

    const result = await app.linkProvider('u-1', 'twitch', broadenedGrant());

    expect(result.status).toBe('already-linked');
    // Same profile id, no second row (no `new TwitchProfile()` save path).
    expect(existingProfile._id).toBe('tp-1');
    // Broadened scopes + rotated token written through to the existing row.
    expect(existingProfile.scopes).toContain(TWITCH_SCOPE_WRITE_CHAT);
    expect(existingProfile.accessToken).toBe('at-2');
    expect(existingProfile.save).toHaveBeenCalled();
  });
});
