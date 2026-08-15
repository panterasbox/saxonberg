/**
 * Tests for Avatar
 *
 * Covers:
 * - Template path construction
 * - Template path prefix constant
 * - Path consistency for different player IDs
 * - Multiplexing (multiple Interactive connections)
 * - Character inheritance
 */

import "../../../test-bootstrap";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import Avatar from '../Avatar';
import { CommandApi } from '../../api/command';
import Interactive from '../Interactive';
import { Character } from '../../lib/character/Character';
import { User } from '../../lib/identity/User';
import { MixinApi } from '../../api/mixin';
import { ConnectionApi } from '../../api/connection';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { MessageFrame } from '@saxonberg/types';

function makeUser(id: string): User {
  const user = new User();
  user._id = id;
  return user;
}

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.setPlayerId(playerId);
  return a;
}

function makeFrame(topic: string, body: string = ''): MessageFrame {
  return {
    id: 'test-id',
    topic,
    body,
    meta: { timestamp: Date.now() },
  };
}

/**
 * What a frame looks like on the far side of `handleMessage`.
 *
 * ⚠ Not the same object. The delivery seam stamps `meta.feeds` — the
 * player's routing table's answer for this frame — so an exact-equality
 * assertion here would be asserting that the routing layer does not
 * exist. These tests are about the FAN-OUT (does it reach both
 * surfaces, are both topics forwarded), so they match on identity; the
 * stamp has its own test below and `feed-routing.test.ts` owns the
 * routing decision itself.
 */
function forwarded(frame: MessageFrame): unknown {
  return expect.objectContaining({
    id: frame.id,
    topic: frame.topic,
    body: frame.body,
  });
}

describe('Avatar', () => {
  describe('TEMPLATE_PATH_PREFIX', () => {
    it('should have correct template path prefix', () => {
      expect(Avatar.TEMPLATE_PATH_PREFIX).toBe('/obj/Avatar/');
    });

    it('should be a string constant', () => {
      expect(typeof Avatar.TEMPLATE_PATH_PREFIX).toBe('string');
    });
  });

  describe('getTemplatePath', () => {
    it('should construct correct template path for playerId', () => {
      const playerId = '6963f6ef384c0c4830a80638';
      const path = Avatar.getTemplatePath(playerId);

      expect(path).toBe('/obj/Avatar/6963f6ef384c0c4830a80638');
    });

    it('should use the TEMPLATE_PATH_PREFIX constant', () => {
      const playerId = 'test123';
      const path = Avatar.getTemplatePath(playerId);

      expect(path).toBe(`${Avatar.TEMPLATE_PATH_PREFIX}${playerId}`);
    });

    it('should handle different playerId formats', () => {
      // MongoDB ObjectId format
      const objectId = '507f1f77bcf86cd799439011';
      expect(Avatar.getTemplatePath(objectId)).toBe(
        '/obj/Avatar/507f1f77bcf86cd799439011'
      );

      // Short ID
      const shortId = 'abc123';
      expect(Avatar.getTemplatePath(shortId)).toBe('/obj/Avatar/abc123');

      // UUID format
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(Avatar.getTemplatePath(uuid)).toBe(
        '/obj/Avatar/550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should handle empty string playerId', () => {
      const path = Avatar.getTemplatePath('');

      expect(path).toBe('/obj/Avatar/');
    });

    it('should generate unique paths for different playerIds', () => {
      const path1 = Avatar.getTemplatePath('player1');
      const path2 = Avatar.getTemplatePath('player2');
      const path3 = Avatar.getTemplatePath('player3');

      expect(path1).not.toBe(path2);
      expect(path2).not.toBe(path3);
      expect(path1).not.toBe(path3);

      expect(path1).toBe('/obj/Avatar/player1');
      expect(path2).toBe('/obj/Avatar/player2');
      expect(path3).toBe('/obj/Avatar/player3');
    });

    it('should always start with forward slash', () => {
      const playerIds = [
        '6963f6ef384c0c4830a80638',
        'test123',
        '',
        'player-with-dashes',
      ];

      for (const playerId of playerIds) {
        const path = Avatar.getTemplatePath(playerId);
        expect(path.startsWith('/')).toBe(true);
      }
    });

    it('should maintain consistent format', () => {
      const playerId = 'consistent123';
      const path = Avatar.getTemplatePath(playerId);

      // Should match the expected pattern
      expect(path).toMatch(/^\/obj\/Avatar\/.+$/);
    });
  });

  describe('template path integration', () => {
    it('should be usable with CMS domain collection', () => {
      const playerId = '6963f6ef384c0c4830a80638';
      const templatePath = Avatar.getTemplatePath(playerId);

      // Verify path is suitable for domain collection
      expect(templatePath).toBeTruthy();
      expect(typeof templatePath).toBe('string');
      expect(templatePath.length).toBeGreaterThan(Avatar.TEMPLATE_PATH_PREFIX.length);

      // Verify path structure for CMS lookup
      expect(templatePath.includes('/obj/Avatar/')).toBe(true);
      expect(templatePath.endsWith(playerId)).toBe(true);
    });

    it('should extract playerId from template path', () => {
      const playerId = '6963f6ef384c0c4830a80638';
      const templatePath = Avatar.getTemplatePath(playerId);

      // Extract playerId from path
      const extractedId = templatePath.replace(Avatar.TEMPLATE_PATH_PREFIX, '');

      expect(extractedId).toBe(playerId);
    });
  });

  describe('Character inheritance', () => {
    let avatar: Avatar;

    beforeEach(() => {
      avatar = makeAvatar('test123');
    });

    it('should be instance of Character', () => {
      expect(avatar instanceof Character).toBe(true);
    });

    it('should have all Character mixin properties', () => {
      expect(avatar).toHaveProperty('name');
      expect(avatar).toHaveProperty('surname');
      expect(avatar).toHaveProperty('pronouns');
    });

    it('should have Named mixin fullName getter', () => {
      avatar.setName('Jane');
      avatar.setSurname('Smith');
      expect(avatar.getFullName()).toBe('Jane Smith');
    });

  });

  describe('multiplexing support', () => {
    let avatar: Avatar;
    let interactive1: Interactive;
    let interactive2: Interactive;
    let interactive3: Interactive;

    beforeEach(() => {
      avatar = makeAvatar('test123');
      interactive1 = makeStuff(() => new Interactive('socket1', 'session1', makeUser('user1')));
      interactive2 = makeStuff(() => new Interactive('socket2', 'session2', makeUser('user1')));
      interactive3 = makeStuff(() => new Interactive('socket3', 'session3', makeUser('user1')));
    });

    describe('addInteractive', () => {
      it('should add single interactive', () => {
        avatar.addInteractive(interactive1);
        expect(avatar.getInteractives().size).toBe(1);
        expect(avatar.getInteractives().has(interactive1)).toBe(true);
      });

      it('should add multiple interactives', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);
        avatar.addInteractive(interactive3);

        expect(avatar.getInteractives().size).toBe(3);
        expect(avatar.getInteractives().has(interactive1)).toBe(true);
        expect(avatar.getInteractives().has(interactive2)).toBe(true);
        expect(avatar.getInteractives().has(interactive3)).toBe(true);
      });

      it('should not add duplicate interactive (Set behavior)', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive1);

        expect(avatar.getInteractives().size).toBe(1);
      });
    });

    describe('removeInteractive', () => {
      beforeEach(() => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);
      });

      it('should remove interactive', () => {
        avatar.removeInteractive(interactive1);

        expect(avatar.getInteractives().size).toBe(1);
        expect(avatar.getInteractives().has(interactive1)).toBe(false);
        expect(avatar.getInteractives().has(interactive2)).toBe(true);
      });

      it('should handle removing non-existent interactive', () => {
        avatar.removeInteractive(interactive3);

        expect(avatar.getInteractives().size).toBe(2);
      });

      it('should handle removing all interactives', () => {
        avatar.removeInteractive(interactive1);
        avatar.removeInteractive(interactive2);

        expect(avatar.getInteractives().size).toBe(0);
      });
    });

    describe('isConnected', () => {
      it('should return false when no interactives', () => {
        expect(avatar.isConnected()).toBe(false);
      });

      it('should return true when at least one interactive', () => {
        avatar.addInteractive(interactive1);
        expect(avatar.isConnected()).toBe(true);
      });

      it('should return true when multiple interactives', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);
        expect(avatar.isConnected()).toBe(true);
      });

      it('should return false after removing last interactive', () => {
        avatar.addInteractive(interactive1);
        avatar.removeInteractive(interactive1);
        expect(avatar.isConnected()).toBe(false);
      });
    });

    describe('isLinkdead', () => {
      it('should return true when no interactives', () => {
        expect(avatar.isLinkdead()).toBe(true);
      });

      it('should return false when connected', () => {
        avatar.addInteractive(interactive1);
        expect(avatar.isLinkdead()).toBe(false);
      });

      it('should return true after disconnect', () => {
        avatar.addInteractive(interactive1);
        avatar.removeInteractive(interactive1);
        expect(avatar.isLinkdead()).toBe(true);
      });
    });

    describe('sendMessage', () => {
      beforeEach(() => {
        // Mock the send method on interactives
        interactive1.send = vi.fn();
        interactive2.send = vi.fn();
        interactive3.send = vi.fn();
      });

      it('should send to single interactive', () => {
        avatar.addInteractive(interactive1);

        const message = { type: 'test', payload: { data: 'hello' } };
        avatar.sendMessage(message);

        expect(interactive1.send).toHaveBeenCalledWith(message);
        expect(interactive1.send).toHaveBeenCalledTimes(1);
      });

      it('should broadcast to multiple interactives', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);
        avatar.addInteractive(interactive3);

        const message = { type: 'test', payload: { data: 'broadcast' } };
        avatar.sendMessage(message);

        expect(interactive1.send).toHaveBeenCalledWith(message);
        expect(interactive2.send).toHaveBeenCalledWith(message);
        expect(interactive3.send).toHaveBeenCalledWith(message);
      });

      it('should not fail when no interactives', () => {
        expect(() => {
          avatar.sendMessage({ type: 'test' });
        }).not.toThrow();
      });

      it('should only send to remaining interactives after removal', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);
        avatar.removeInteractive(interactive1);

        const message = { type: 'test' };
        avatar.sendMessage(message);

        expect(interactive1.send).not.toHaveBeenCalled();
        expect(interactive2.send).toHaveBeenCalledWith(message);
      });
    });

  });

  describe('onMessage (SensorMixin override)', () => {
    let avatar: Avatar;
    let sendMessage: MockInstance<typeof ConnectionApi.sendMessage>;
    let interactive1: Interactive;
    let interactive2: Interactive;

    beforeEach(() => {
      // Create a simple avatar for testing
      avatar = makeAvatar('test-player-123');

      // Stub the wire exit: ConnectionApi.sendMessage is where a
      // multiplexed frame leaves the mudlib for a socket.
      sendMessage = vi
        .spyOn(ConnectionApi, 'sendMessage')
        .mockImplementation(() => {});

      interactive1 = makeStuff(() => new Interactive('socket-1', 'session-1', makeUser('user-1')));
      interactive2 = makeStuff(() => new Interactive('socket-2', 'session-2', makeUser('user-1')));
    });

    afterEach(() => {
      // Restore the spy after each test
      vi.restoreAllMocks();
    });

    it('should send message to all connected Interactives', () => {
      avatar.addInteractive(interactive1);
      avatar.addInteractive(interactive2);

      const message = makeFrame('sense.survey', 'Test message');

      avatar.onMessage(message);

      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(sendMessage).toHaveBeenCalledWith(
        interactive1,
        forwarded(message)
      );
      expect(sendMessage).toHaveBeenCalledWith(
        interactive2,
        forwarded(message)
      );
    });

    it('should handle single Interactive', () => {
      avatar.addInteractive(interactive1);

      const message = makeFrame('test');

      avatar.onMessage(message);

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(sendMessage).toHaveBeenCalledWith(
        interactive1,
        forwarded(message)
      );
    });

    it('should handle no Interactives gracefully', () => {
      const message = makeFrame('test');

      // Should not throw
      expect(() => avatar.onMessage(message)).not.toThrow();

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('should support multiplexing (same user, multiple devices)', () => {
      // Simulate same user on laptop and phone
      const laptop = makeStuff(() => new Interactive('socket-laptop', 'session-1', makeUser('user-1')));
      const phone = makeStuff(() => new Interactive('socket-phone', 'session-2', makeUser('user-1')));

      avatar.addInteractive(laptop);
      avatar.addInteractive(phone);

      const message = makeFrame('sense.survey', 'Hello');

      avatar.onMessage(message);

      // Both devices receive the message
      expect(sendMessage).toHaveBeenCalledWith(
        laptop,
        forwarded(message)
      );
      expect(sendMessage).toHaveBeenCalledWith(
        phone,
        forwarded(message)
      );
    });

    it('⚠ stamps the routing answer on the frame it forwards', () => {
      /*
       * The assertions above match on identity, which would pass just
       * as happily if the stamp vanished. This one is why they can.
       *
       * ⚠ It asserts the SEAM, not the destination. The topic
       * catalogue is not warmed in this file, so every weight derives
       * to the same default and asserting `['diagnostics']` here would
       * be asserting the fallback. Which feed a topic lands in is
       * `api/__tests__/feed-routing.test.ts`, which installs a
       * catalogue precisely so it can.
       */
      avatar.addInteractive(interactive1);
      avatar.onMessage(makeFrame('shell.diagnostic', 'Error'));

      const [, sent] = sendMessage.mock.calls[0] as [unknown, MessageFrame];
      expect(Array.isArray(sent.meta?.feeds)).toBe(true);
      expect(sent.meta?.feeds?.length).toBeGreaterThan(0);
    });

    it('should work with different message types', () => {
      avatar.addInteractive(interactive1);

      const outputMsg = makeFrame('sense.survey', 'Text');
      const errorMsg = makeFrame('shell.diagnostic', 'Error');

      avatar.onMessage(outputMsg);
      avatar.onMessage(errorMsg);

      expect(sendMessage).toHaveBeenCalledWith(
        interactive1,
        forwarded(outputMsg)
      );
      expect(sendMessage).toHaveBeenCalledWith(
        interactive1,
        forwarded(errorMsg)
      );
    });
  });

  describe('EnvironmentMixin composition', () => {
    let avatar: Avatar;

    beforeEach(() => {
      avatar = makeAvatar('env-test');
    });

    it('composes EnvironmentMixin (isEnvironment narrows true)', () => {
      expect(MixinApi.isEnvironment(avatar)).toBe(true);
    });

    it('round-trips an ad-hoc var through the session store', () => {
      avatar.setVar('greeting', 'hello');
      expect(avatar.listVars()).toEqual({ greeting: 'hello' });
    });

    it('rejects setSetting for an undeclared key', () => {
      expect(() =>
        avatar.setSetting('nope.never', 'x', avatar),
      ).toThrowError(/no such setting/);
    });

    it('session store survives onLinkdead (no implicit clear)', () => {
      avatar.setVar('keep', 'me');
      avatar.onLinkdead();
      expect(avatar.listVars()).toEqual({ keep: 'me' });
    });
  });

  describe('persist-back shims', () => {
    it('save() captures through the persistence spine (PersistableApi.capture)', async () => {
      const { PersistableApi } = await import('../../api/persistable');
      const capSpy = vi
        .spyOn(PersistableApi, 'capture')
        .mockResolvedValue(undefined);
      const avatar = makeAvatar('save-test');
      await avatar.save();
      expect(capSpy).toHaveBeenCalledTimes(1);
      expect(capSpy.mock.calls[0]![0]).toBe(avatar);
      capSpy.mockRestore();
    });

    it('save() is a no-op for a guest (zero guest persistence)', async () => {
      const { PersistableApi } = await import('../../api/persistable');
      const capSpy = vi
        .spyOn(PersistableApi, 'capture')
        .mockResolvedValue(undefined);
      const guest = makeAvatar('guest-test');
      (guest as unknown as { isGuest: boolean }).isGuest = true;
      await guest.save();
      expect(capSpy).not.toHaveBeenCalled();
      expect(guest.shouldPersist()).toBe(false);
      capSpy.mockRestore();
    });

    it('restore() materializes through the persistence spine (PersistableApi.materialize)', async () => {
      const { PersistableApi } = await import('../../api/persistable');
      const matSpy = vi
        .spyOn(PersistableApi, 'materialize')
        .mockResolvedValue(undefined);
      const avatar = makeAvatar('restore-test');
      await avatar.restore();
      expect(matSpy).toHaveBeenCalledTimes(1);
      expect(matSpy.mock.calls[0]![0]).toBe(avatar);
      matSpy.mockRestore();
    });
  });

  describe('auto-save', () => {
    it('declares world.autosave.interval as a Number setting on Avatar', () => {
      const entry = (Avatar as { settings?: Array<{
        key: string;
        type: string;
        default: unknown;
        description: string;
      }> }).settings?.find(
        (e) => e.key === 'world.autosave.interval'
      );
      expect(entry).toBeDefined();
      expect(entry!.type).toBe('number');
      expect(entry!.default).toBe(5 * 60 * 1000);
      expect(entry!.description).toMatch(/milliseconds/i);
    });

    it('startAutoSave() resolves world.autosave.interval and passes it to ScheduleApi.recurring', async () => {
      const { ScheduleApi } = await import('../../api/schedule');
      const recurringSpy = vi
        .spyOn(ScheduleApi, 'recurring')
        .mockReturnValue({ id: 'h1' } as never);
      const avatar = makeAvatar('autosave-1');
      avatar.startAutoSave();
      expect(recurringSpy).toHaveBeenCalledTimes(1);
      const call = recurringSpy.mock.calls[0]!;
      expect(call[0]).toBe(5 * 60 * 1000);
      expect(call[2]).toEqual({
        propagateAttribution: false,
        mode: 'fixed-delay',
      });
      recurringSpy.mockRestore();
    });

    it('startAutoSave() honors a per-Avatar override of world.autosave.interval', async () => {
      const { ScheduleApi } = await import('../../api/schedule');
      const recurringSpy = vi
        .spyOn(ScheduleApi, 'recurring')
        .mockReturnValue({ id: 'h1' } as never);
      const avatar = makeAvatar('autosave-2');
      // Persistent override — picked up by resolveSetting via the
      // standard lookup chain (persistent store wins over schema default).
      avatar.setSetting('world.autosave.interval', 120_000, avatar);
      avatar.startAutoSave();
      const [interval] = recurringSpy.mock.calls[0]!;
      expect(interval).toBe(120_000);
      recurringSpy.mockRestore();
    });

    it('startAutoSave() is idempotent (does not double-register)', async () => {
      const { ScheduleApi } = await import('../../api/schedule');
      const recurringSpy = vi
        .spyOn(ScheduleApi, 'recurring')
        .mockReturnValue({ id: 'h1' } as never);
      const avatar = makeAvatar('autosave-3');
      avatar.startAutoSave();
      avatar.startAutoSave();
      avatar.startAutoSave();
      expect(recurringSpy).toHaveBeenCalledTimes(1);
      recurringSpy.mockRestore();
    });

    it('the captured callback delegates to save()', async () => {
      const { ScheduleApi } = await import('../../api/schedule');
      let captured: (() => void) | null = null;
      vi.spyOn(ScheduleApi, 'recurring').mockImplementation(
        (_int, fn) => {
          captured = fn;
          return { id: 'h1' } as never;
        }
      );
      const avatar = makeAvatar('autosave-4');
      const saveSpy = vi
        .spyOn(Avatar.prototype, 'save')
        .mockResolvedValue(undefined);
      avatar.startAutoSave();
      expect(captured).not.toBeNull();
      captured!();
      // Wait for the microtask the callback created.
      await Promise.resolve();
      expect(saveSpy).toHaveBeenCalledTimes(1);
      saveSpy.mockRestore();
    });

    it('stopAutoSave() cancels the handle via ScheduleApi.cancel', async () => {
      const { ScheduleApi } = await import('../../api/schedule');
      vi.spyOn(ScheduleApi, 'recurring').mockReturnValue({
        id: 'sentinel',
      } as never);
      const cancelSpy = vi
        .spyOn(ScheduleApi, 'cancel')
        .mockImplementation(() => {});
      const avatar = makeAvatar('autosave-5');
      avatar.startAutoSave();
      avatar.stopAutoSave();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(cancelSpy.mock.calls[0]![0]).toEqual({ id: 'sentinel' });
      // Second stop is a no-op (already cleared).
      avatar.stopAutoSave();
      expect(cancelSpy).toHaveBeenCalledTimes(1);
    });

    it('periodic-save callback logs and stays alive when save throws', async () => {
      const { ScheduleApi } = await import('../../api/schedule');
      let captured: (() => void) | null = null;
      vi.spyOn(ScheduleApi, 'recurring').mockImplementation((_, fn) => {
        captured = fn;
        return { id: 'h1' } as never;
      });
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveSpy = vi
        .spyOn(Avatar.prototype, 'save')
        .mockRejectedValue(new Error('boom'));
      const avatar = makeAvatar('autosave-6');
      avatar.startAutoSave();
      expect(captured).not.toBeNull();
      captured!();
      // Wait for the rejected save microtask + the .catch.
      await Promise.resolve();
      await Promise.resolve();
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(errSpy).toHaveBeenCalled();
      // The thrown rejection should be swallowed; this test
      // completing without unhandled-rejection is the assertion.
      saveSpy.mockRestore();
      errSpy.mockRestore();
    });
  });

  describe('enter() — session start', () => {
    /**
     * `Avatar.enter(interactive)` is the session-start hand-off
     * called by `Login.enter`. Tests cover the starting-location
     * resolution (live ref vs fallback singleton), the autosave
     * install, the welcome scene, and the PlayerLoggedIn emit.
     */
    interface FakeInteractive {
      stuffId: string;
      getUser: ReturnType<typeof vi.fn>;
      getUserId: () => string;
      getSocketId: () => string;
      getSessionId: () => string;
    }

    function fakeInteractive(): FakeInteractive {
      return {
        stuffId: 'ix-stuffId',
        getUser: vi.fn(),
        getUserId: () => 'user-1',
        getSocketId: () => 'sock-1',
        getSessionId: () => 'sess-1',
      };
    }

    it('reads the starting location from getContainer() and does not call into StuffApi.singleton', async () => {
      const { StuffApi } = await import('../../api/stuff');
      const { MessageApi } = await import('../../api/message');
      const { EventApi } = await import('../../api/event');

      const fakeLocation = {
        stuffId: 'pre-set-stuffId',
        getPresentation: () => 'somewhere',
        getTemplatePath: () => null,
      } as never;
      const avatar = makeAvatar('enter-1');
      vi.spyOn(avatar, 'getContainer').mockReturnValue(fakeLocation);
      const teleportSpy = vi
        .spyOn(avatar, 'teleport')
        .mockImplementation(() => undefined);
      const startSpy = vi
        .spyOn(avatar, 'startAutoSave')
        .mockImplementation(() => {});

      const singletonSpy = vi
        .spyOn(StuffApi, 'singleton')
        .mockResolvedValue({} as never);
      vi.spyOn(EventApi, 'emit').mockImplementation(() => {});

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

      const ix = fakeInteractive() as unknown as Interactive;
      await avatar.enter(ix);

      // enter() is pure ceremony — no template-resolution calls
      // and no teleport. Container placement and default-loadout
      // install run during clone (applyContainer + postRegister)
      // before enter ever fires.
      expect(singletonSpy).not.toHaveBeenCalled();
      expect(teleportSpy).not.toHaveBeenCalled();
      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it('throws when the avatar has no container (data integrity backstop)', async () => {
      const avatar = makeAvatar('enter-2');
      vi.spyOn(avatar, 'getContainer').mockReturnValue(null);

      const ix = fakeInteractive() as unknown as Interactive;
      await expect(avatar.enter(ix)).rejects.toThrow(
        /has no container/
      );
    });

    it('starts autosave', async () => {
      const { MessageApi } = await import('../../api/message');
      const { EventApi } = await import('../../api/event');

      const avatar = makeAvatar('enter-3');
      vi.spyOn(avatar, 'getContainer').mockReturnValue({
        stuffId: 's',
        getPresentation: () => 'somewhere',
        getTemplatePath: () => null,
      } as never);
      const startSpy = vi
        .spyOn(avatar, 'startAutoSave')
        .mockImplementation(() => {});
      vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
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

      await avatar.enter(fakeInteractive() as unknown as Interactive);
      expect(startSpy).toHaveBeenCalledTimes(1);
    });

    it('emits Events.PlayerLoggedIn', async () => {
      const { MessageApi } = await import('../../api/message');
      const { EventApi } = await import('../../api/event');
      const { Events } = await import('../../lib/events');

      const avatar = makeAvatar('enter-4');
      vi.spyOn(avatar, 'getContainer').mockReturnValue({
        stuffId: 's',
        getPresentation: () => 'somewhere',
        getTemplatePath: () => null,
      } as never);
      vi.spyOn(avatar, 'startAutoSave').mockImplementation(() => {});
      const emitSpy = vi
        .spyOn(EventApi, 'emit')
        .mockImplementation(() => {});
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

      await avatar.enter(fakeInteractive() as unknown as Interactive);
      expect(emitSpy).toHaveBeenCalledWith(Events.PlayerLoggedIn, {
        playerId: 'enter-4',
        userId: 'user-1',
      });
    });

    it('emits PlayerReconnected on a second enter (returning to a lingering body)', async () => {
      const { MessageApi } = await import('../../api/message');
      const { EventApi } = await import('../../api/event');
      const { Events } = await import('../../lib/events');

      const avatar = makeAvatar('enter-rc');
      vi.spyOn(avatar, 'getContainer').mockReturnValue({
        stuffId: 's',
        getPresentation: () => 'somewhere',
        getTemplatePath: () => null,
      } as never);
      vi.spyOn(avatar, 'startAutoSave').mockImplementation(() => {});
      const emitSpy = vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
      const send = vi.fn();
      vi.spyOn(MessageApi, 'scene').mockImplementation(
        () =>
          ({
            topic: () => ({
              toSelf: () => ({ payload: () => ({ send }), send }),
            }),
          }) as never
      );

      // First enter: fresh login.
      await avatar.enter(fakeInteractive() as unknown as Interactive);
      // Second enter: the instance survived a linkdead window → reconnect.
      await avatar.enter(fakeInteractive() as unknown as Interactive);

      expect(emitSpy).toHaveBeenCalledWith(Events.PlayerLoggedIn, {
        playerId: 'enter-rc',
        userId: 'user-1',
      });
      expect(emitSpy).toHaveBeenCalledWith(Events.PlayerReconnected, {
        playerId: 'enter-rc',
        userId: 'user-1',
      });
    });

    it('onLinkdead emits PlayerDisconnected on an involuntary drop', async () => {
      const { EventApi } = await import('../../api/event');
      const { Events } = await import('../../lib/events');
      const avatar = makeAvatar('ld-drop');
      const emitSpy = vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
      avatar.onLinkdead();
      expect(emitSpy).toHaveBeenCalledWith(Events.PlayerDisconnected, {
        playerId: 'ld-drop',
      });
    });

    it('onLinkdead emits PlayerLoggedOut after a deliberate leave intent', async () => {
      const { EventApi } = await import('../../api/event');
      const { Events } = await import('../../lib/events');
      const avatar = makeAvatar('ld-leave');
      const emitSpy = vi.spyOn(EventApi, 'emit').mockImplementation(() => {});
      avatar.setLeaveIntent(true);
      avatar.onLinkdead();
      expect(emitSpy).toHaveBeenCalledWith(Events.PlayerLoggedOut, {
        playerId: 'ld-leave',
      });
      // The intent is consumed — a subsequent drop is an involuntary one.
      emitSpy.mockClear();
      avatar.onLinkdead();
      expect(emitSpy).toHaveBeenCalledWith(Events.PlayerDisconnected, {
        playerId: 'ld-leave',
      });
    });

    it('welcome-scene payload carries topicCatalogue from the singleton', async () => {
      const { MessageApi } = await import('../../api/message');
      const { EventApi } = await import('../../api/event');
      const { default: TopicCatalogue } = await import('../TopicCatalogue');
      const TemplateMod = await import('../../lib/stuff/Template');

      // Stub the mongo read with one authored topic descriptor.
      vi.spyOn(TemplateMod.Template, 'findDescendants').mockImplementation(
        async () =>
          [
            {
              path: '/obj/Topic/world',
              data: {
                topic: 'world',
                family: '',
                label: 'World',
                description: 'In-world events.',
              },
            },
          ] as unknown as InstanceType<typeof TemplateMod.Template>[],
      );

      const cat = makeStuff(() => new TopicCatalogue());
      const stampTpl = await import(
        '../../lib/security/__tests__/test-setup'
      );
      stampTpl.stampTemplatePathForTest(cat, '/obj/TopicCatalogue');
      await cat.postRegister();

      const avatar = makeAvatar('enter-5');
      vi.spyOn(avatar, 'getContainer').mockReturnValue({
        stuffId: 's',
        getPresentation: () => 'somewhere',
        getTemplatePath: () => null,
      } as never);
      vi.spyOn(avatar, 'startAutoSave').mockImplementation(() => {});
      vi.spyOn(EventApi, 'emit').mockImplementation(() => {});

      // Capture the payload value as fed into MessageApi.scene chain.
      const payloadSpy = vi.fn();
      const send = vi.fn();
      vi.spyOn(MessageApi, 'scene').mockImplementation(
        () =>
          ({
            topic: () => ({
              toSelf: () => ({
                payload: payloadSpy.mockReturnValue({ send }),
                send,
              }),
            }),
          }) as never,
      );

      await avatar.enter(fakeInteractive() as unknown as Interactive);

      expect(payloadSpy).toHaveBeenCalledTimes(1);
      const passedPayload = payloadSpy.mock.calls[0]?.[0];
      expect(passedPayload).toBeTruthy();
      expect(Array.isArray(passedPayload.topicCatalogue)).toBe(true);
      expect(passedPayload.topicCatalogue.length).toBeGreaterThan(0);
      const worldEntry = passedPayload.topicCatalogue.find(
        (d: { topic: string }) => d.topic === 'world',
      );
      expect(worldEntry).toBeTruthy();
      expect(worldEntry.label).toBe('World');

      // HasInteractiveMixin declares the console schema; the
      // snapshot ships at least the two console keys with their
      // defaults.
      expect(typeof passedPayload.clientState).toBe('object');
      expect(passedPayload.clientState['console.activeTab']).toBe('All');
      expect(passedPayload.clientState['console.tabs']).toEqual([
        { name: 'All', muted: [] },
      ]);
    });
  });

  // Regression: the stream-tuning `watch`/`tune` verbs shipped in
  // cmd/stream/ but were listed in no `commandContributions`, so a player
  // saw "I don't understand 'watch'." Availability = static
  // `commandContributions.self` on the class + its mixins, NOT the verb's
  // directory. These two verbs require HasInteractive + write cockpit.watch,
  // so they belong on the player Avatar's own console surface.
  describe('stream verb affordances', () => {
    it('affords the watch and tune verbs to the player Avatar', () => {
      expect(Avatar.commandContributions.self).toContain('stream/watch.yaml');
      expect(Avatar.commandContributions.self).toContain('stream/tune.yaml');
    });

    it('the afforded stream contributions resolve to real verbs', () => {
      expect(CommandApi.getCommand('stream/watch.yaml')?.verbs).toContain(
        'watch'
      );
      expect(CommandApi.getCommand('stream/tune.yaml')?.verbs).toContain(
        'tune'
      );
    });
  });
});
