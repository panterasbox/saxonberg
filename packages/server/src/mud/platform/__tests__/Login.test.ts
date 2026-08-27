/**
 * Login tests — the pre-world charter: branch on character count
 * (0 → char-gen, ≥1 → roster), host the `enroll`/`play` verbs as a real
 * CommandGiver, receive frames as a Sensor, and hand off to a chosen
 * Avatar. The enroll flow itself is tested in EnrollController.test.ts;
 * Avatar session-start lives in Avatar.test.ts.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Login from '../idea/Login';
import Interactive from '../idea/Interactive';
import { StuffApi } from '../../api/stuff';
import { ConnectionApi } from '../../api/connection';
import { PlayerApi } from '../../api/player';
import { MixinApi } from '../../api/mixin';
import { Mixins } from '../../lib/mixin';
import type { User } from '../../lib/identity/User';
import type Avatar from '../agent/Avatar';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

function fakeUser(id: string, playerIds: string[] = []): User {
  return { _id: id, playerIds } as User;
}

function fakeAvatar(playerId: string): Avatar {
  return {
    getPlayerId: () => playerId,
    getFullName: () => `Avatar ${playerId}`,
    getSpecies: () => null,
    getShortDescription: () => 'a newcomer',
    enter: vi.fn().mockResolvedValue(undefined),
  } as unknown as Avatar;
}

describe('Login', () => {
  let user: User;
  let interactive: Interactive;
  let login: Login;

  beforeEach(() => {
    vi.restoreAllMocks();
    user = fakeUser('user-1');
    interactive = makeStuff(() => new Interactive('sock-1', 'sess-1', user));
    login = makeStuff(() => new Login(interactive));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  describe('construction', () => {
    it('composes HasInteractive, Sensor, and CommandGiver', () => {
      expect(MixinApi.isHasInteractive(login)).toBe(true);
      expect(MixinApi.isSensor(login)).toBe(true);
      expect(MixinApi.isCommandGiver(login)).toBe(true);
      expect(MixinApi.hasMixin(Login, Mixins.HasInteractive)).toBe(true);
    });

    it('seeds the HasInteractive set with the supplied Interactive', () => {
      expect(login.hasInteractive(interactive)).toBe(true);
      expect([...login.getInteractives()]).toEqual([interactive]);
    });

    it('exposes the enroll/play verbs but no world verbs (recency-stack sandbox)', () => {
      const verbs = login
        .getAvailableCommands()
        .flatMap((d) => (d.verbs as string[]) ?? []);
      expect(verbs).toContain('enroll');
      expect(verbs).toContain('play');
      expect(verbs).not.toContain('go');
      expect(verbs).not.toContain('say');
      expect(verbs).not.toContain('get');
    });
  });

  describe('enter() — branch on character count', () => {
    it('takes ownership of the connection (transfers to itself) first', async () => {
      const transfers: unknown[] = [];
      vi.spyOn(ConnectionApi, 'transfer').mockImplementation((ix, h) =>
        transfers.push({ ix, h }),
      );
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([]);
      vi.spyOn(
        Login.prototype as unknown as { enterCharGen: () => Promise<void> },
        'enterCharGen',
      ).mockResolvedValue(undefined);

      await login.enter();
      expect((transfers[0] as { h: unknown }).h).toBe(login);
    });

    it('routes a user with zero characters into char-gen', async () => {
      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([]);
      const cg = vi
        .spyOn(
          Login.prototype as unknown as { enterCharGen: () => Promise<void> },
          'enterCharGen',
        )
        .mockResolvedValue(undefined);

      await login.enter();
      expect(cg).toHaveBeenCalledTimes(1);
    });

    it('routes a user with ≥1 character to the roster (no auto-enter, no destruct)', async () => {
      vi.spyOn(ConnectionApi, 'transfer').mockImplementation(() => {});
      const avatars = [fakeAvatar('a'), fakeAvatar('b')];
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue(avatars);
      const roster = vi
        .spyOn(
          Login.prototype as unknown as {
            presentRoster: (a: Avatar[]) => void;
          },
          'presentRoster',
        )
        .mockImplementation(() => {});
      const destruct = vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});

      await login.enter();
      expect(roster).toHaveBeenCalledTimes(1);
      expect(destruct).not.toHaveBeenCalled();
      for (const a of avatars) {
        expect(a.enter).not.toHaveBeenCalled();
      }
    });
  });

  describe('playCharacter() — roster handoff', () => {
    it('hands off to an owned character and destructs', async () => {
      user.playerIds = ['pid-1'];
      const avatar = fakeAvatar('pid-1');
      vi.spyOn(PlayerApi, 'loadAvatarsForUser').mockResolvedValue([avatar]);
      const transfer = vi
        .spyOn(ConnectionApi, 'transfer')
        .mockImplementation(() => {});
      const destruct = vi
        .spyOn(StuffApi, 'destruct')
        .mockImplementation(() => {});

      const ok = await login.playCharacter('pid-1');
      expect(ok).toBe(true);
      expect(avatar.enter).toHaveBeenCalledWith(interactive);
      expect(transfer).toHaveBeenCalled();
      expect(destruct).toHaveBeenCalledWith(login);
    });

    it('rejects a playerId the user does not own', async () => {
      user.playerIds = ['pid-1'];
      const enter = vi.spyOn(PlayerApi, 'loadAvatarsForUser');
      const ok = await login.playCharacter('not-mine');
      expect(ok).toBe(false);
      // Ownership check short-circuits before loading avatars.
      expect(enter).not.toHaveBeenCalled();
    });
  });

  describe('guest identity', () => {
    it('reserves the guest word "Guest"', () => {
      expect(Login.GUEST_RESERVED_WORD).toBe('Guest');
    });

    it('names a guest with the reserved word + an optional namebank surname', async () => {
      const { name, surname } = await Login.generateGuestName();
      expect(name).toBe(Login.GUEST_RESERVED_WORD);
      // No parallel hardcoded name list: the surname comes from the real
      // `common` NameBank, or is absent when the bank is unseeded (here,
      // no DB) — never a fabricated fallback.
      if (surname !== undefined) {
        expect(surname.length).toBeGreaterThan(0);
        expect(surname.toLowerCase()).not.toBe('guest');
      }
    });
  });
});
