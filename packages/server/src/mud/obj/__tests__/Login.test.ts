/**
 * Login tests — focused on Login's narrow charter: transfer the
 * Interactive to the resolved Avatar, hand off to `avatar.enter()`,
 * and destruct. Session-start behavior (location placement, welcome
 * scene, autosave, look description, PlayerLoggedIn event) lives on
 * `Avatar.enter()` and is tested in Avatar.test.ts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Login from '../Login';
import Interactive from '../Interactive';
import { StuffApi } from '../../api/stuff';
import { ConnectionApi } from '../../api/connection';
import { PlayerApi } from '../../api/player';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import type { User } from '../../lib/identity/User';
import type Avatar from '../Avatar';
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

  describe('enter() — handoff to Avatar', () => {
    it('transfers the Interactive to the avatar and calls avatar.enter()', async () => {
      const fakeAvatar = {
        enter: vi.fn().mockResolvedValue(undefined),
        getFullName: () => 'Test Avatar',
      } as unknown as Avatar;

      const transferCalls: unknown[] = [];
      vi.spyOn(ConnectionApi, 'transfer').mockImplementation((ix, h) => {
        transferCalls.push({ interactive: ix, holder: h });
      });
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([fakeAvatar]);
      vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});

      await login.enter();

      // Two transfers: Login → Avatar.
      expect(transferCalls).toHaveLength(2);
      expect((transferCalls[0] as { holder: unknown }).holder).toBe(login);
      expect((transferCalls[1] as { holder: unknown }).holder).toBe(fakeAvatar);

      // Avatar's session start fired with the Interactive.
      expect(fakeAvatar.enter).toHaveBeenCalledTimes(1);
      expect((fakeAvatar.enter as ReturnType<typeof vi.fn>).mock.calls[0]![0])
        .toBe(interactive);
    });

    it('destructs self after avatar.enter() completes', async () => {
      const fakeAvatar = {
        enter: vi.fn().mockResolvedValue(undefined),
        getFullName: () => 'Test Avatar',
      } as unknown as Avatar;

      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([fakeAvatar]);
      const destructSpy = vi
        .spyOn(StuffApi, 'destruct')
        .mockImplementation(() => {});

      await login.enter();

      expect(destructSpy).toHaveBeenCalledTimes(1);
      expect(destructSpy.mock.calls[0]![0]).toBe(login);
    });
  });
});
