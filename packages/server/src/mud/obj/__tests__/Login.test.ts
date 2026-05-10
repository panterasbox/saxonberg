/**
 * Login tests — focused on the constructor and the error path.
 *
 * The happy path of `enter()` reaches across many subsystems
 * (ConnectionApi, PlayerApi, StuffApi.singleton, MessageApi, EventApi,
 * Avatar.teleport) — each of which would have to be stubbed in turn,
 * and most are exercised by their own tests. This file pins:
 *
 *   - the constructor stores the Interactive and seeds the
 *     HasInteractive set so MixinApi.isHasInteractive(login) reads true;
 *   - `enter()` rejects when the user has zero or multiple avatars —
 *     a hard requirement of v1 character selection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Login } from '../Login';
import { Interactive } from '../Interactive';
import { StuffApi } from '../../api/stuff';
import { ConnectionApi } from '../../api/connection';
import { PlayerApi } from '../../api/player';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import type { User } from '../../lib/identity/User';
import type { Avatar } from '../Avatar';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

function fakeUser(id: string): User {
  return { _id: id } as User;
}

describe('Login', () => {
  let user: User;
  let interactive: Interactive;
  let login: Login;

  beforeEach(() => {
    vi.restoreAllMocks();
    user = fakeUser('user-1');
    interactive = makeStuff(
      () => new Interactive('sock-1', 'sess-1', user),
    );
    login = makeStuff(() => new Login(interactive));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  describe('construction', () => {
    it('composes HasInteractiveMixin', () => {
      expect(MixinApi.hasMixin(Login, Mixins.HasInteractive)).toBe(true);
      expect(MixinApi.isHasInteractive(login)).toBe(true);
    });

    it('seeds the HasInteractive set with the supplied Interactive', () => {
      expect(login.hasInteractive(interactive)).toBe(true);
      expect([...login.getInteractives()]).toEqual([interactive]);
    });

    it('is a registered Stuff with a stuffId', () => {
      expect(typeof login.stuffId).toBe('string');
      expect(login.stuffId.length).toBeGreaterThan(0);
    });
  });

  describe('enter() — error paths', () => {
    it('rejects when the user has zero avatars', async () => {
      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([]);

      await expect(login.enter()).rejects.toThrow(/expected exactly 1 player/);
    });

    it('rejects when the user has multiple avatars', async () => {
      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      const ghostAvatars = [
        { getPlayerId: () => 'a' },
        { getPlayerId: () => 'b' },
      ] as unknown as Avatar[];
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue(
        ghostAvatars,
      );

      await expect(login.enter()).rejects.toThrow(/expected exactly 1 player/);
    });

    it('takes ownership of the connection before resolving avatars', async () => {
      const transferCalls: unknown[] = [];
      vi.spyOn(ConnectionApi, 'transfer').mockImplementation((ix, h) => {
        transferCalls.push({ interactive: ix, holder: h });
      });
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([]);

      await expect(login.enter()).rejects.toThrow();
      // The first transfer hands ownership to the Login itself — that
      // happens BEFORE PlayerApi.loadAvatarsForUser even runs, so it's
      // observable even on the error path.
      expect(transferCalls).toHaveLength(1);
      expect((transferCalls[0] as { interactive: unknown }).interactive).toBe(
        interactive,
      );
      expect((transferCalls[0] as { holder: unknown }).holder).toBe(login);
    });
  });
});
