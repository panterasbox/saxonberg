/**
 * Tests for Interactive
 *
 * Covers:
 * - Basic connection properties
 * - Loading available avatars via user.playerIds
 * - Character switching
 * - Multiplexing integration
 * - Connection lifecycle
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Interactive } from './Interactive';
import { Avatar } from './Avatar';
import { User } from '../lib/identity/User';
import { StuffApi } from '../api/stuff';
import { PlayerApi } from '../api/player';
import { makeStuff } from '../lib/security/test-setup';

function makeUser(id: string, playerIds: string[] = []): User {
  const user = new User();
  user._id = id;
  user.playerIds = [...playerIds];
  return user;
}

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.playerId = playerId;
  return a;
}

describe('Interactive', () => {
  let interactive: Interactive;
  const testSocketId = 'socket123';
  const testSessionId = 'session456';
  const testUserId = 'user789';

  beforeEach(() => {
    vi.clearAllMocks();
    PlayerApi.clearAll();
  });

  afterEach(() => {
    if (interactive && !interactive.isDestroyed()) {
      StuffApi.destruct(interactive);
    }
  });

  describe('constructor', () => {
    it('should create Interactive with basic properties', () => {
      const user = makeUser(testUserId);
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, user));

      expect(interactive.socketId).toBe(testSocketId);
      expect(interactive.sessionId).toBe(testSessionId);
      expect(interactive.user).toBe(user);
      expect(interactive.userId).toBe(testUserId);
      expect(interactive.connectedAt).toBeInstanceOf(Date);
    });

    it('should initialize with null currentAvatar', () => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
      expect(interactive.currentAvatar).toBeNull();
    });

    it('should initialize with empty availableAvatars', () => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
      expect(interactive.availableAvatars.size).toBe(0);
    });

    it('should have unique stuffId', () => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));

      expect(interactive.stuffId).toBeTruthy();
      expect(typeof interactive.stuffId).toBe('string');
      expect(interactive.stuffId.length).toBeGreaterThan(0);
    });
  });

  describe('loadAvailableAvatars', () => {
    let mockAvatar1: Avatar;
    let mockAvatar2: Avatar;

    beforeEach(() => {
      mockAvatar1 = makeAvatar('player1');
      mockAvatar1.firstName = 'Alice';
      mockAvatar2 = makeAvatar('player2');
      mockAvatar2.firstName = 'Bob';
    });

    it('should clone one avatar per playerId from user.playerIds', async () => {
      interactive = makeStuff(() => new Interactive(
        testSocketId,
        testSessionId,
        makeUser(testUserId, ['player1', 'player2'])
      ));
      const cloneSpy = vi
        .spyOn(StuffApi, 'clone')
        .mockResolvedValueOnce(mockAvatar1)
        .mockResolvedValueOnce(mockAvatar2);

      await interactive.loadAvailableAvatars();

      expect(cloneSpy).toHaveBeenCalledTimes(2);
      expect(cloneSpy).toHaveBeenNthCalledWith(
        1,
        Avatar.getTemplatePath('player1'),
        { user: interactive.user, playerId: 'player1' }
      );
      expect(interactive.availableAvatars.size).toBe(2);
    });

    it('should pass { user, playerId } context to clone', async () => {
      interactive = makeStuff(() => new Interactive(
        testSocketId,
        testSessionId,
        makeUser(testUserId, ['player1'])
      ));
      const cloneSpy = vi.spyOn(StuffApi, 'clone').mockResolvedValue(mockAvatar1);

      await interactive.loadAvailableAvatars();

      expect(cloneSpy).toHaveBeenCalledWith(Avatar.getTemplatePath('player1'), {
        user: interactive.user,
        playerId: 'player1',
      });
    });

    it('should reuse Avatars already registered (multiplexing)', async () => {
      interactive = makeStuff(() => new Interactive(
        testSocketId,
        testSessionId,
        makeUser(testUserId, ['player1'])
      ));
      mockAvatar1.playerId = 'player1';
      PlayerApi.registerAvatar(mockAvatar1);

      const cloneSpy = vi.spyOn(StuffApi, 'clone');

      await interactive.loadAvailableAvatars();

      expect(cloneSpy).not.toHaveBeenCalled();
      expect(interactive.availableAvatars.get('player1')).toBe(mockAvatar1);
    });

    it('should populate availableAvatars map with playerId keys', async () => {
      interactive = makeStuff(() => new Interactive(
        testSocketId,
        testSessionId,
        makeUser(testUserId, ['player1', 'player2'])
      ));
      vi.spyOn(StuffApi, 'clone')
        .mockResolvedValueOnce(mockAvatar1)
        .mockResolvedValueOnce(mockAvatar2);

      await interactive.loadAvailableAvatars();

      expect(interactive.availableAvatars.get('player1')).toBe(mockAvatar1);
      expect(interactive.availableAvatars.get('player2')).toBe(mockAvatar2);
    });

    it('should handle user with no playerIds', async () => {
      interactive = makeStuff(() => new Interactive(
        testSocketId,
        testSessionId,
        makeUser(testUserId)
      ));

      await interactive.loadAvailableAvatars();

      expect(interactive.availableAvatars.size).toBe(0);
    });
  });

  describe('switchAvatar', () => {
    let mockAvatar1: Avatar;
    let mockAvatar2: Avatar;

    beforeEach(() => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));

      mockAvatar1 = makeAvatar('player1');
      mockAvatar1.firstName = 'Alice';
      mockAvatar2 = makeAvatar('player2');
      mockAvatar2.firstName = 'Bob';

      interactive.availableAvatars.set('player1', mockAvatar1);
      interactive.availableAvatars.set('player2', mockAvatar2);
    });

    it('should switch to new Avatar', async () => {
      await interactive.switchAvatar('player1');

      expect(interactive.currentAvatar).toBe(mockAvatar1);
      expect(mockAvatar1.interactives.has(interactive)).toBe(true);
    });

    it('should remove from old Avatar when switching', async () => {
      await interactive.switchAvatar('player1');
      await interactive.switchAvatar('player2');

      expect(mockAvatar1.interactives.has(interactive)).toBe(false);
      expect(mockAvatar2.interactives.has(interactive)).toBe(true);
      expect(interactive.currentAvatar).toBe(mockAvatar2);
    });

    it('should throw if playerId not found', async () => {
      await expect(interactive.switchAvatar('nonexistent')).rejects.toThrow(
        'Interactive.switchAvatar(): Avatar not found for playerId: nonexistent'
      );
    });

    it('should handle switching from null currentAvatar', async () => {
      expect(interactive.currentAvatar).toBeNull();

      await interactive.switchAvatar('player1');

      expect(interactive.currentAvatar).toBe(mockAvatar1);
    });
  });

  describe('multiplexing integration', () => {
    let interactive1: Interactive;
    let interactive2: Interactive;
    let mockAvatar: Avatar;

    beforeEach(() => {
      interactive1 = makeStuff(() => new Interactive('socket1', 'session1', makeUser(testUserId)));
      interactive2 = makeStuff(() => new Interactive('socket2', 'session2', makeUser(testUserId)));

      mockAvatar = makeAvatar('player1');
      mockAvatar.firstName = 'Alice';

      interactive1.availableAvatars.set('player1', mockAvatar);
      interactive2.availableAvatars.set('player1', mockAvatar);
    });

    afterEach(() => {
      if (interactive1 && !interactive1.isDestroyed()) {
        StuffApi.destruct(interactive1);
      }
      if (interactive2 && !interactive2.isDestroyed()) {
        StuffApi.destruct(interactive2);
      }
    });

    it('should support multiple Interactives on same Avatar', async () => {
      await interactive1.switchAvatar('player1');
      await interactive2.switchAvatar('player1');

      expect(mockAvatar.interactives.size).toBe(2);
      expect(mockAvatar.interactives.has(interactive1)).toBe(true);
      expect(mockAvatar.interactives.has(interactive2)).toBe(true);
    });

    it('should both Interactives reference same Avatar', async () => {
      await interactive1.switchAvatar('player1');
      await interactive2.switchAvatar('player1');

      expect(interactive1.currentAvatar).toBe(mockAvatar);
      expect(interactive2.currentAvatar).toBe(mockAvatar);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
    });

    it('should have send method', () => {
      expect(typeof interactive.send).toBe('function');
    });

    it('should call send without throwing', () => {
      expect(() => {
        interactive.send({ type: 'test', payload: { data: 'hello' } });
      }).not.toThrow();
    });
  });

  describe('getConnectionDuration', () => {
    beforeEach(() => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
    });

    it('should return elapsed time in milliseconds', async () => {
      const duration1 = interactive.getConnectionDuration();
      expect(duration1).toBeGreaterThanOrEqual(0);

      await new Promise(resolve => setTimeout(resolve, 10));

      const duration2 = interactive.getConnectionDuration();
      expect(duration2).toBeGreaterThan(duration1);
    });
  });

  describe('prepareDestroy', () => {
    let mockAvatar: Avatar;

    beforeEach(() => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
      mockAvatar = makeAvatar('player1');
      interactive.availableAvatars.set('player1', mockAvatar);
    });

    it('should remove from currentAvatar on destroy', async () => {
      await interactive.switchAvatar('player1');

      StuffApi.destruct(interactive);

      expect(mockAvatar.interactives.has(interactive)).toBe(false);
    });

    it('should clear currentAvatar on destroy', async () => {
      await interactive.switchAvatar('player1');

      StuffApi.destruct(interactive);

      expect(interactive.currentAvatar).toBeNull();
    });

    it('should clear availableAvatars on destroy', async () => {
      await interactive.switchAvatar('player1');

      StuffApi.destruct(interactive);

      expect(interactive.availableAvatars.size).toBe(0);
    });

    it('should mark object as destroyed', () => {
      expect(interactive.isDestroyed()).toBe(false);

      StuffApi.destruct(interactive);

      expect(interactive.isDestroyed()).toBe(true);
    });
  });

  describe('toString', () => {
    beforeEach(() => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
    });

    it('should include socketId and userId', () => {
      const str = interactive.toString();

      expect(str).toContain(testSocketId);
      expect(str).toContain(testUserId);
    });

    it('should include avatar name when connected', async () => {
      const mockAvatar = makeAvatar('player1');
      mockAvatar.firstName = 'Alice';
      mockAvatar.lastName = 'Smith';
      interactive.availableAvatars.set('player1', mockAvatar);

      await interactive.switchAvatar('player1');
      const str = interactive.toString();

      expect(str).toContain('Alice Smith');
    });
  });
});
