/**
 * Application provider-spine tests — provider-parameterized resolution,
 * linking (collision-refuse + idempotent re-link), unlinking
 * (at-least-one invariant + orphan-profile deletion + no-op), and the
 * provider-agnostic default avatar name.
 *
 * `User` / `TwitchProfile` / `GoogleProfile` route through PM; the
 * Document statics are stubbed directly (no Mongo). The encrypted-token
 * round-trip is covered separately in `TwitchProfile.test.ts`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Application } from '../Application';
import { PersistenceManager } from '../PersistenceManager';
import { User } from '../../mud/lib/identity/User';
import { TwitchProfile } from '../../mud/lib/identity/TwitchProfile';
import { GoogleProfile } from '../../mud/lib/identity/GoogleProfile';
import type {
  PassportGoogleProfile,
  PassportTwitchProfileWithTokens,
} from '@saxonberg/types';

function googleProfile(id = 'g-1'): PassportGoogleProfile {
  return {
    id,
    displayName: 'Alice Smith',
    name: { givenName: 'Alice', familyName: 'Smith' },
    emails: [{ value: 'alice@example.com', verified: true }],
    photos: [{ value: 'http://example.com/photo.jpg' }],
    _json: { id },
    provider: 'google',
  } as unknown as PassportGoogleProfile;
}

function twitchProfile(id = 't-1'): PassportTwitchProfileWithTokens {
  return {
    id,
    login: 'streamer',
    displayName: 'Streamer',
    email: 'streamer@example.com',
    _json: { id },
    accessToken: 'at',
    refreshToken: 'rt',
    expiresAt: 1000,
    scopes: ['user:read:email'],
  };
}

/**
 * A mutable in-memory User stand-in: `find` / `findById` return the
 * registered records; `save` mutates them. Captures what the spine reads
 * and writes without a database.
 */
function fakeUserStore() {
  const users = new Map<string, Partial<User> & { _id: string }>();
  let counter = 0;

  vi.spyOn(User, 'find').mockImplementation(async (query) => {
    const entry = Object.entries(query)[0];
    if (!entry) return [];
    const [field, value] = entry;
    return [...users.values()].filter(
      (u) => (u as Record<string, unknown>)[field] === value
    ) as unknown as User[];
  });
  vi.spyOn(User, 'findById').mockImplementation(async (id) => {
    return (users.get(id) as unknown as User) ?? null;
  });

  return {
    users,
    addUser(rec: Partial<User> & { _id: string }) {
      const full = {
        ...rec,
        hasAnyProvider(this: {
          googleProfileId?: string;
          twitchProfileId?: string;
        }) {
          return !!(this.googleProfileId || this.twitchProfileId);
        },
        save: vi.fn(async function (this: { _id: string }) {
          users.set(this._id, this as never);
        }),
      } as unknown as Partial<User> & { _id: string };
      users.set(rec._id, full);
      return full;
    },
    nextId() {
      return `u-${++counter}`;
    },
  };
}

describe('Application provider spine', () => {
  let app: Application;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = Application.get();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('defaultAvatarNameFor', () => {
    it('Google: givenName ?? displayName', () => {
      expect(Application.defaultAvatarNameFor('google', googleProfile())).toBe(
        'Alice'
      );
    });
    it('Twitch: displayName ?? login (never Unnamed)', () => {
      expect(Application.defaultAvatarNameFor('twitch', twitchProfile())).toBe(
        'Streamer'
      );
      const noDisplay = { ...twitchProfile(), displayName: '' };
      expect(Application.defaultAvatarNameFor('twitch', noDisplay)).toBe(
        'streamer'
      );
    });
  });

  describe('findOrCreateUserFromProvider — resolution', () => {
    it('Twitch login creates User + TwitchProfile; returning login → same User', async () => {
      const store = fakeUserStore();
      const saved: TwitchProfile[] = [];
      let existing: TwitchProfile | null = null;
      vi.spyOn(TwitchProfile, 'findByTwitchUserId').mockImplementation(
        async () => existing
      );
      // Stub the Document save so the TwitchProfile gets an _id and is
      // visible to the next findByTwitchUserId.
      vi.spyOn(TwitchProfile.prototype, 'save').mockImplementation(
        async function (this: TwitchProfile) {
          if (!this._id) this._id = 'tp-1';
          saved.push(this);
          existing = saved[saved.length - 1] ?? null;
        }
      );
      // The User created on first login carries twitchProfileId.
      const createdIds: string[] = [];
      vi.spyOn(User.prototype, 'save').mockImplementation(async function (
        this: User
      ) {
        if (!this._id) this._id = store.nextId();
        createdIds.push(this._id);
        store.users.set(this._id, this as never);
      });

      const first = await app.findOrCreateUserFromProvider(
        'twitch',
        twitchProfile()
      );
      const second = await app.findOrCreateUserFromProvider(
        'twitch',
        twitchProfile()
      );

      expect(first).toBe(second);
      // Exactly one User created (second login resolved the existing one).
      expect(createdIds).toHaveLength(1);
      const user = store.users.get(first)!;
      expect((user as Record<string, unknown>).twitchProfileId).toBe('tp-1');
    });

    it('Google path still routes through provider param (regression)', async () => {
      const store = fakeUserStore();
      const pm = PersistenceManager.get();
      vi.spyOn(pm, 'find').mockResolvedValue([]);
      vi.spyOn(pm, 'save').mockResolvedValue('gp-1');
      vi.spyOn(User.prototype, 'save').mockImplementation(async function (
        this: User
      ) {
        if (!this._id) this._id = store.nextId();
        store.users.set(this._id, this as never);
      });

      const id = await app.findOrCreateUserFromGoogle(googleProfile());
      const user = store.users.get(id)!;
      expect((user as Record<string, unknown>).googleProfileId).toBe('gp-1');
    });
  });

  describe('linkProvider', () => {
    it('attaches an unowned profile → linked; symmetric across providers', async () => {
      const store = fakeUserStore();
      const user = store.addUser({ _id: 'u-1', googleProfileId: 'gp-1' });
      vi.spyOn(TwitchProfile, 'findByTwitchUserId').mockResolvedValue(null);
      vi.spyOn(TwitchProfile.prototype, 'save').mockImplementation(
        async function (this: TwitchProfile) {
          this._id = 'tp-1';
        }
      );

      const result = await app.linkProvider('u-1', 'twitch', twitchProfile());
      expect(result.status).toBe('linked');
      expect((user as Record<string, unknown>).twitchProfileId).toBe('tp-1');
    });

    it('re-linking the already-linked provider is a no-op success', async () => {
      const store = fakeUserStore();
      store.addUser({
        _id: 'u-1',
        googleProfileId: 'gp-1',
        twitchProfileId: 'tp-1',
      });
      vi.spyOn(TwitchProfile, 'findByTwitchUserId').mockResolvedValue({
        _id: 'tp-1',
        save: vi.fn().mockResolvedValue(undefined),
      } as unknown as TwitchProfile);

      const result = await app.linkProvider('u-1', 'twitch', twitchProfile());
      expect(result.status).toBe('already-linked');
    });

    it('refuses a profile owned by a different User → collision, no mutation', async () => {
      const store = fakeUserStore();
      // tp-1 is already owned by another user.
      store.addUser({ _id: 'u-other', twitchProfileId: 'tp-1' });
      const me = store.addUser({ _id: 'u-1', googleProfileId: 'gp-1' });
      vi.spyOn(TwitchProfile, 'findByTwitchUserId').mockResolvedValue(null);
      vi.spyOn(TwitchProfile.prototype, 'save').mockImplementation(
        async function (this: TwitchProfile) {
          this._id = 'tp-1';
        }
      );

      const result = await app.linkProvider('u-1', 'twitch', twitchProfile());
      expect(result.status).toBe('collision');
      if (result.status === 'collision') {
        expect(result.message).toMatch(/already linked to another login/i);
      }
      // No mutation on my user.
      expect((me as Record<string, unknown>).twitchProfileId).toBeUndefined();
    });
  });

  describe('unlinkProvider', () => {
    it('clears the FK and deletes the orphaned profile → unlinked', async () => {
      const store = fakeUserStore();
      const user = store.addUser({
        _id: 'u-1',
        googleProfileId: 'gp-1',
        twitchProfileId: 'tp-1',
      });
      const del = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(TwitchProfile, 'findById').mockResolvedValue({
        _id: 'tp-1',
        delete: del,
      } as unknown as TwitchProfile);

      const result = await app.unlinkProvider('u-1', 'twitch');
      expect(result.status).toBe('unlinked');
      expect((user as Record<string, unknown>).twitchProfileId).toBeUndefined();
      expect(del).toHaveBeenCalledTimes(1);
    });

    it('refuses unlinking the only provider → only-provider (invariant holds)', async () => {
      const store = fakeUserStore();
      const user = store.addUser({ _id: 'u-1', twitchProfileId: 'tp-1' });
      const del = vi.fn();
      vi.spyOn(TwitchProfile, 'findById').mockResolvedValue({
        _id: 'tp-1',
        delete: del,
      } as unknown as TwitchProfile);

      const result = await app.unlinkProvider('u-1', 'twitch');
      expect(result.status).toBe('only-provider');
      // Invariant defended: nothing cleared, nothing deleted.
      expect((user as Record<string, unknown>).twitchProfileId).toBe('tp-1');
      expect(del).not.toHaveBeenCalled();
    });

    it('unlinking a not-linked provider is a no-op success', async () => {
      const store = fakeUserStore();
      store.addUser({ _id: 'u-1', googleProfileId: 'gp-1' });
      const result = await app.unlinkProvider('u-1', 'twitch');
      expect(result.status).toBe('not-linked');
    });

    it('deletes a Google orphan via GoogleProfile on unlink', async () => {
      const store = fakeUserStore();
      store.addUser({
        _id: 'u-1',
        googleProfileId: 'gp-1',
        twitchProfileId: 'tp-1',
      });
      const del = vi.fn().mockResolvedValue(undefined);
      vi.spyOn(GoogleProfile, 'findById').mockResolvedValue({
        _id: 'gp-1',
        delete: del,
      } as unknown as GoogleProfile);

      const result = await app.unlinkProvider('u-1', 'google');
      expect(result.status).toBe('unlinked');
      expect(del).toHaveBeenCalledTimes(1);
    });
  });

  describe('at-least-one invariant on create', () => {
    it('a freshly-created provider User carries exactly one FK', async () => {
      const store = fakeUserStore();
      vi.spyOn(TwitchProfile, 'findByTwitchUserId').mockResolvedValue(null);
      vi.spyOn(TwitchProfile.prototype, 'save').mockImplementation(
        async function (this: TwitchProfile) {
          this._id = 'tp-1';
        }
      );
      vi.spyOn(User.prototype, 'save').mockImplementation(async function (
        this: User
      ) {
        if (!this._id) this._id = store.nextId();
        store.users.set(this._id, this as never);
      });

      const id = await app.findOrCreateUserFromProvider(
        'twitch',
        twitchProfile()
      );
      const user = store.users.get(id) as unknown as User;
      expect(user.hasAnyProvider()).toBe(true);
      expect(user.googleProfileId).toBeUndefined();
      expect(user.twitchProfileId).toBe('tp-1');
    });
  });
});
