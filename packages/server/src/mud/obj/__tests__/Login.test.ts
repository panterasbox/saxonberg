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
import { EventApi } from '../../api/event';
import { PlayerApi } from '../../api/player';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import { DEFAULT_STARTING_LOCATION_PATH } from '../../config/constants';
import type { User } from '../../lib/identity/User';
import type { Avatar } from '../Avatar';
import type { Location } from '../../lib/stuff/Location';
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

  describe('enter() — starting-location resolution', () => {
    /**
     * Shared scaffolding for the happy-path tests. Builds a minimal
     * fake avatar surface, stubs the cross-subsystem dependencies
     * (ConnectionApi.transfer, MessageApi.scene, EventApi.emit,
     * StuffApi.destruct), and lets each test wire the avatar's
     * pre-existing container plus the singleton stub.
     */
    interface FakeAvatar {
      teleport: ReturnType<typeof vi.fn>;
      getContainer: ReturnType<typeof vi.fn>;
      startAutoSave: ReturnType<typeof vi.fn>;
      getFullName: () => string;
      getPlayerId: () => string;
      getHonorific: () => string;
      getName: () => string;
      getSurname: () => string;
      getNameSuffix: () => string;
      getAlternateNames: () => string[];
      getPronouns: () => string;
    }

    function fakeAvatar(opts: { container: unknown }): FakeAvatar {
      return {
        teleport: vi.fn(),
        getContainer: vi.fn(() => opts.container),
        startAutoSave: vi.fn(),
        getFullName: () => 'Test Avatar',
        getPlayerId: () => 'p1',
        getHonorific: () => '',
        getName: () => 'Test',
        getSurname: () => 'Avatar',
        getNameSuffix: () => '',
        getAlternateNames: () => [],
        getPronouns: () => 'they/them',
      };
    }

    function stubScene() {
      // No-op scene chain; verify by spying on .send() if needed.
      const send = vi.fn();
      vi.spyOn(MessageApi, 'scene').mockImplementation(
        () =>
          ({
            topic: () => ({
              toSelf: () => ({
                payload: () => ({ send }),
                send,
              }),
            }),
          }) as never
      );
      return { send };
    }

    it('uses avatar.getContainer() when the avatar is already placed (no fallback singleton call)', async () => {
      const fakeLocation = {
        _id: 'loc-pre-set',
        stuffId: 'pre-set-stuffId',
      } as unknown as Location;
      const avatar = fakeAvatar({ container: fakeLocation });

      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([
        avatar as unknown as Avatar,
      ]);
      const singletonSpy = vi
        .spyOn(StuffApi, 'singleton')
        .mockResolvedValue({} as never);
      vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
      vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
      stubScene();

      // Stub the interactive getters
      vi.spyOn(interactive, 'getUser').mockReturnValue(user);
      vi.spyOn(interactive, 'getUserId').mockReturnValue('user-1');
      vi.spyOn(interactive, 'getSocketId').mockReturnValue('sock-1');
      vi.spyOn(interactive, 'getSessionId').mockReturnValue('sess-1');

      await login.enter();

      expect(singletonSpy).not.toHaveBeenCalled();
      expect(avatar.teleport).not.toHaveBeenCalled();
    });

    it('falls back to DEFAULT_STARTING_LOCATION_PATH when avatar has no container', async () => {
      const avatar = fakeAvatar({ container: null });
      const fallback = {
        _id: 'loc-fallback',
        stuffId: 'fallback-stuffId',
      } as unknown as Location;

      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([
        avatar as unknown as Avatar,
      ]);
      const singletonSpy = vi
        .spyOn(StuffApi, 'singleton')
        .mockResolvedValue(fallback as never);
      vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
      vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
      stubScene();

      vi.spyOn(interactive, 'getUser').mockReturnValue(user);
      vi.spyOn(interactive, 'getUserId').mockReturnValue('user-1');
      vi.spyOn(interactive, 'getSocketId').mockReturnValue('sock-1');
      vi.spyOn(interactive, 'getSessionId').mockReturnValue('sess-1');

      await login.enter();

      expect(singletonSpy).toHaveBeenCalledWith(DEFAULT_STARTING_LOCATION_PATH);
      expect(avatar.teleport).toHaveBeenCalledTimes(1);
      expect(avatar.teleport).toHaveBeenCalledWith(fallback, { silent: true });
    });

    it('fallback teleport is silent (no movement narration)', async () => {
      const avatar = fakeAvatar({ container: null });
      const fallback = {
        _id: 'loc-fallback',
        stuffId: 'fallback-stuffId',
      } as unknown as Location;

      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([
        avatar as unknown as Avatar,
      ]);
      vi.spyOn(StuffApi, 'singleton').mockResolvedValue(fallback as never);
      vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
      vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
      stubScene();

      vi.spyOn(interactive, 'getUser').mockReturnValue(user);
      vi.spyOn(interactive, 'getUserId').mockReturnValue('user-1');
      vi.spyOn(interactive, 'getSocketId').mockReturnValue('sock-1');
      vi.spyOn(interactive, 'getSessionId').mockReturnValue('sess-1');

      await login.enter();

      // The teleport always gets { silent: true } in the fallback
      // branch — pinned so a future change that drops the silent
      // option fails loudly.
      const args = avatar.teleport.mock.calls[0]!;
      expect(args[1]).toEqual({ silent: true });
    });
  });
});
