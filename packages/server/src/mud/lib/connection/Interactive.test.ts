/**
 * Tests for Interactive
 *
 * Covers:
 * - Basic connection properties
 * - Loading available avatars
 * - Character switching
 * - Multiplexing integration
 * - Legacy method compatibility
 * - Connection lifecycle
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Interactive } from './Interactive.js';
import { Player } from '../identity/Player.js';
import { Avatar } from '../../obj/Avatar.js';
import { StuffApi } from '../../api/stuff.js';
import { PlayerApi } from '../../api/player.js';

describe('Interactive', () => {
  let interactive: Interactive;
  const testSocketId = 'socket123';
  const testSessionId = 'session456';
  const testUserId = 'user789';

  beforeEach(() => {
    // Clear any previous registrations
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up registered objects
    if (interactive && !interactive.isDestroyed) {
      interactive.destroy();
    }
  });

  describe('constructor', () => {
    it('should create Interactive with basic properties', () => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);

      expect(interactive.socketId).toBe(testSocketId);
      expect(interactive.sessionId).toBe(testSessionId);
      expect(interactive.userId).toBe(testUserId);
      expect(interactive.connectedAt).toBeInstanceOf(Date);
    });

    it('should initialize with null currentAvatar', () => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);

      expect(interactive.currentAvatar).toBeNull();
    });

    it('should initialize with empty availableAvatars', () => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);

      expect(interactive.availableAvatars.size).toBe(0);
    });

    it('should have unique stuffId', () => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);

      expect(interactive.stuffId).toBeTruthy();
      expect(typeof interactive.stuffId).toBe('string');
      expect(interactive.stuffId.length).toBeGreaterThan(0);
    });
  });

  describe('loadAvailableAvatars', () => {
    let mockPlayer1: Player;
    let mockPlayer2: Player;
    let mockAvatar1: Avatar;
    let mockAvatar2: Avatar;

    beforeEach(() => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);

      // Create mock players
      mockPlayer1 = new Player();
      mockPlayer1._id = 'player1';
      mockPlayer1.userId = testUserId;
      mockPlayer1.firstName = 'Alice';

      mockPlayer2 = new Player();
      mockPlayer2._id = 'player2';
      mockPlayer2.userId = testUserId;
      mockPlayer2.firstName = 'Bob';

      // Create mock avatars
      mockAvatar1 = new Avatar({ playerId: 'player1' });
      mockAvatar1.firstName = 'Alice';
      mockAvatar2 = new Avatar({ playerId: 'player2' });
      mockAvatar2.firstName = 'Bob';
    });

    it('should load all Players for userId', async () => {
      const findSpy = vi.spyOn(Player, 'find').mockResolvedValue([mockPlayer1, mockPlayer2]);
      vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(undefined);
      vi.spyOn(StuffApi, 'clone').mockResolvedValueOnce(mockAvatar1).mockResolvedValueOnce(mockAvatar2);

      await interactive.loadAvailableAvatars();

      expect(findSpy).toHaveBeenCalledWith({ userId: testUserId });
      expect(interactive.availableAvatars.size).toBe(2);
    });

    it('should create new Avatars if not already loaded', async () => {
      vi.spyOn(Player, 'find').mockResolvedValue([mockPlayer1]);
      vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(undefined);
      const cloneSpy = vi.spyOn(StuffApi, 'clone').mockResolvedValue(mockAvatar1);

      await interactive.loadAvailableAvatars();

      expect(cloneSpy).toHaveBeenCalledWith(Avatar.getTemplatePath('player1'));
      expect(interactive.availableAvatars.get('player1')).toBe(mockAvatar1);
    });

    it('should reuse existing Avatars if already loaded', async () => {
      vi.spyOn(Player, 'find').mockResolvedValue([mockPlayer1]);
      vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(mockAvatar1);
      const cloneSpy = vi.spyOn(StuffApi, 'clone');

      await interactive.loadAvailableAvatars();

      expect(cloneSpy).not.toHaveBeenCalled();
      expect(interactive.availableAvatars.get('player1')).toBe(mockAvatar1);
    });

    it('should populate availableAvatars map with playerId keys', async () => {
      vi.spyOn(Player, 'find').mockResolvedValue([mockPlayer1, mockPlayer2]);
      vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(undefined);
      vi.spyOn(StuffApi, 'clone')
        .mockResolvedValueOnce(mockAvatar1)
        .mockResolvedValueOnce(mockAvatar2);

      await interactive.loadAvailableAvatars();

      expect(interactive.availableAvatars.has('player1')).toBe(true);
      expect(interactive.availableAvatars.has('player2')).toBe(true);
      expect(interactive.availableAvatars.get('player1')).toBe(mockAvatar1);
      expect(interactive.availableAvatars.get('player2')).toBe(mockAvatar2);
    });

    it('should handle user with no Players', async () => {
      vi.spyOn(Player, 'find').mockResolvedValue([]);

      await interactive.loadAvailableAvatars();

      expect(interactive.availableAvatars.size).toBe(0);
    });
  });

  describe('switchAvatar', () => {
    let mockAvatar1: Avatar;
    let mockAvatar2: Avatar;

    beforeEach(() => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);

      mockAvatar1 = new Avatar({ playerId: 'player1' });
      mockAvatar1.firstName = 'Alice';
      mockAvatar2 = new Avatar({ playerId: 'player2' });
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

    it('should call removeInteractive on old Avatar', async () => {
      const removeSpy = vi.spyOn(mockAvatar1, 'removeInteractive');

      await interactive.switchAvatar('player1');
      await interactive.switchAvatar('player2');

      expect(removeSpy).toHaveBeenCalledWith(interactive);
    });

    it('should call addInteractive on new Avatar', async () => {
      const addSpy = vi.spyOn(mockAvatar1, 'addInteractive');

      await interactive.switchAvatar('player1');

      expect(addSpy).toHaveBeenCalledWith(interactive);
    });

    it('should throw error if playerId not found', async () => {
      await expect(interactive.switchAvatar('nonexistent')).rejects.toThrow(
        'Interactive.switchAvatar(): Avatar not found for playerId: nonexistent'
      );
    });

    it('should handle switching from null currentAvatar', async () => {
      expect(interactive.currentAvatar).toBeNull();

      await interactive.switchAvatar('player1');

      expect(interactive.currentAvatar).toBe(mockAvatar1);
    });

    it('should update bidirectional link correctly', async () => {
      await interactive.switchAvatar('player1');

      // Check Interactive → Avatar
      expect(interactive.currentAvatar).toBe(mockAvatar1);

      // Check Avatar → Interactive
      expect(mockAvatar1.interactives.has(interactive)).toBe(true);
    });
  });

  describe('multiplexing integration', () => {
    let interactive1: Interactive;
    let interactive2: Interactive;
    let mockAvatar: Avatar;

    beforeEach(() => {
      interactive1 = new Interactive('socket1', 'session1', testUserId);
      interactive2 = new Interactive('socket2', 'session2', testUserId);

      mockAvatar = new Avatar({ playerId: 'player1' });
      mockAvatar.firstName = 'Alice';

      interactive1.availableAvatars.set('player1', mockAvatar);
      interactive2.availableAvatars.set('player1', mockAvatar);
    });

    afterEach(() => {
      if (interactive2 && !interactive2.isDestroyed) {
        interactive2.destroy();
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
      expect(interactive1.currentAvatar).toBe(interactive2.currentAvatar);
    });

    it('should remove only one Interactive when switching', async () => {
      await interactive1.switchAvatar('player1');
      await interactive2.switchAvatar('player1');

      const mockAvatar2 = new Avatar({ playerId: 'player2' });
      interactive1.availableAvatars.set('player2', mockAvatar2);

      await interactive1.switchAvatar('player2');

      expect(mockAvatar.interactives.size).toBe(1);
      expect(mockAvatar.interactives.has(interactive2)).toBe(true);
      expect(mockAvatar2.interactives.has(interactive1)).toBe(true);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);
    });

    it('should have send method', () => {
      expect(typeof interactive.send).toBe('function');
    });

    it('should call send without throwing', () => {
      expect(() => {
        interactive.send({ type: 'test', payload: { data: 'hello' } });
      }).not.toThrow();
    });

    it('should accept any message format', () => {
      interactive.send({ type: 'test' });
      interactive.send({ type: 'test', payload: { foo: 'bar' } });
      interactive.send('string message');
      interactive.send(123);
    });
  });

  describe('legacy methods', () => {
    let mockAvatar: Avatar;

    beforeEach(() => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);
      mockAvatar = new Avatar({ playerId: 'player1' });
    });

    it('linkAvatar should set currentAvatar and add to Avatar', () => {
      interactive.linkAvatar(mockAvatar);

      expect(interactive.currentAvatar).toBe(mockAvatar);
      expect(mockAvatar.interactives.has(interactive)).toBe(true);
    });

    it('unlinkAvatar should clear currentAvatar and remove from Avatar', () => {
      interactive.linkAvatar(mockAvatar);
      interactive.unlinkAvatar();

      expect(interactive.currentAvatar).toBeNull();
      expect(mockAvatar.interactives.has(interactive)).toBe(false);
    });

    it('unlinkAvatar should handle null currentAvatar', () => {
      expect(() => {
        interactive.unlinkAvatar();
      }).not.toThrow();
    });

    it('avatar getter should return currentAvatar', () => {
      interactive.currentAvatar = mockAvatar;

      expect(interactive.avatar).toBe(mockAvatar);
    });

    it('avatar getter should return undefined when null', () => {
      interactive.currentAvatar = null;

      expect(interactive.avatar).toBeUndefined();
    });

    it('avatar setter should set currentAvatar', () => {
      interactive.avatar = mockAvatar;

      expect(interactive.currentAvatar).toBe(mockAvatar);
    });

    it('avatar setter should handle undefined', () => {
      interactive.avatar = undefined;

      expect(interactive.currentAvatar).toBeNull();
    });
  });

  describe('getConnectionDuration', () => {
    beforeEach(() => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);
    });

    it('should return elapsed time in milliseconds', async () => {
      const duration1 = interactive.getConnectionDuration();
      expect(duration1).toBeGreaterThanOrEqual(0);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const duration2 = interactive.getConnectionDuration();
      expect(duration2).toBeGreaterThan(duration1);
    });

    it('should be based on connectedAt timestamp', () => {
      const now = Date.now();
      const duration = interactive.getConnectionDuration();
      const expectedDuration = now - interactive.connectedAt.getTime();

      // Allow 5ms tolerance
      expect(Math.abs(duration - expectedDuration)).toBeLessThan(5);
    });
  });

  describe('prepareDestroy', () => {
    let mockAvatar: Avatar;

    beforeEach(() => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);
      mockAvatar = new Avatar({ playerId: 'player1' });
      interactive.availableAvatars.set('player1', mockAvatar);
    });

    it('should remove from currentAvatar on destroy', async () => {
      await interactive.switchAvatar('player1');

      interactive.destroy();

      expect(mockAvatar.interactives.has(interactive)).toBe(false);
    });

    it('should clear currentAvatar on destroy', async () => {
      await interactive.switchAvatar('player1');

      interactive.destroy();

      expect(interactive.currentAvatar).toBeNull();
    });

    it('should clear availableAvatars on destroy', async () => {
      await interactive.switchAvatar('player1');

      interactive.destroy();

      expect(interactive.availableAvatars.size).toBe(0);
    });

    it('should handle destroy with null currentAvatar', () => {
      expect(() => {
        interactive.destroy();
      }).not.toThrow();
    });

    it('should mark object as destroyed', () => {
      expect(interactive.isDestroyed()).toBe(false);

      interactive.destroy();

      expect(interactive.isDestroyed()).toBe(true);
    });
  });

  describe('toString', () => {
    beforeEach(() => {
      interactive = new Interactive(testSocketId, testSessionId, testUserId);
    });

    it('should include socketId and userId', () => {
      const str = interactive.toString();

      expect(str).toContain(testSocketId);
      expect(str).toContain(testUserId);
    });

    it('should include avatar name when connected', async () => {
      const mockAvatar = new Avatar({ playerId: 'player1' });
      mockAvatar.firstName = 'Alice';
      mockAvatar.lastName = 'Smith';
      interactive.availableAvatars.set('player1', mockAvatar);

      await interactive.switchAvatar('player1');
      const str = interactive.toString();

      expect(str).toContain('Alice Smith');
    });

    it('should not include avatar info when not connected', () => {
      const str = interactive.toString();

      expect(str).not.toContain('avatar=');
    });
  });
});
