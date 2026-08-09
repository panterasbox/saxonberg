/**
 * Tests for PlayerApi
 *
 * Covers:
 * - Avatar registration and lookup by playerId
 * - Avatar unregistration
 * - Avatar count and listing
 * - Edge cases (missing playerId, duplicate registration)
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlayerApi } from '../player';
import { PlayerLogic } from '../../obj/api/PlayerLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import Avatar from '../../obj/Avatar';
import { User } from '../../lib/identity/User';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

// Mock Avatar objects for testing.
// The migration's methods-only contract means PlayerApi reads
// `avatar.getPlayerId()`; the mock has to implement those methods.
const createMockAvatar = (playerId: string): Avatar => {
  let _playerId = playerId;
  return {
    getPlayerId: () => _playerId,
    setPlayerId: (v: string) => { _playerId = v; },
    getName: () => 'Test',
    getSurname: () => 'User',
    getFullName: () => 'Test User',
    stuffId: `avatar-${playerId}`,
  } as unknown as Avatar;
};

describe('PlayerApi', () => {
  beforeEach(() => {
    // Clear all avatars before each test
    PlayerApi.clearAll();
  });

  describe('registerAvatar', () => {
    it('should register avatar by playerId', () => {
      const avatar = createMockAvatar('test123');

      PlayerApi.registerAvatar(avatar);

      const found = PlayerApi.findAvatarByPlayerId('test123');
      expect(found).toBe(avatar);
    });

    it('should handle avatar without playerId gracefully', () => {
      const avatar = createMockAvatar('');

      // Should not throw
      expect(() => PlayerApi.registerAvatar(avatar)).not.toThrow();

      // Should not be findable
      expect(PlayerApi.findAvatarByPlayerId('')).toBeUndefined();
    });

    it('should warn on duplicate registration', () => {
      const avatar1 = createMockAvatar('test123');
      const avatar2 = createMockAvatar('test123');

      // Register first avatar
      PlayerApi.registerAvatar(avatar1);

      // Register second avatar with same playerId (should warn but not throw)
      expect(() => PlayerApi.registerAvatar(avatar2)).not.toThrow();

      // Most recent registration should be kept (or first, depending on implementation)
      const found = PlayerApi.findAvatarByPlayerId('test123');
      expect(found).toBeDefined();
    });

    it('should register multiple avatars with different playerIds', () => {
      const avatar1 = createMockAvatar('player1');
      const avatar2 = createMockAvatar('player2');
      const avatar3 = createMockAvatar('player3');

      PlayerApi.registerAvatar(avatar1);
      PlayerApi.registerAvatar(avatar2);
      PlayerApi.registerAvatar(avatar3);

      expect(PlayerApi.findAvatarByPlayerId('player1')).toBe(avatar1);
      expect(PlayerApi.findAvatarByPlayerId('player2')).toBe(avatar2);
      expect(PlayerApi.findAvatarByPlayerId('player3')).toBe(avatar3);
    });
  });

  describe('unregisterAvatar', () => {
    it('should unregister avatar by playerId', () => {
      const avatar = createMockAvatar('test123');

      PlayerApi.registerAvatar(avatar);
      expect(PlayerApi.findAvatarByPlayerId('test123')).toBe(avatar);

      PlayerApi.unregisterAvatar(avatar);
      expect(PlayerApi.findAvatarByPlayerId('test123')).toBeUndefined();
    });

    it('should handle unregistering avatar without playerId gracefully', () => {
      const avatar = createMockAvatar('');

      // Should not throw
      expect(() => PlayerApi.unregisterAvatar(avatar)).not.toThrow();
    });

    it('should handle unregistering non-existent avatar gracefully', () => {
      const avatar = createMockAvatar('nonexistent');

      // Should not throw
      expect(() => PlayerApi.unregisterAvatar(avatar)).not.toThrow();
    });

    it('should not affect other avatars when unregistering', () => {
      const avatar1 = createMockAvatar('player1');
      const avatar2 = createMockAvatar('player2');

      PlayerApi.registerAvatar(avatar1);
      PlayerApi.registerAvatar(avatar2);

      PlayerApi.unregisterAvatar(avatar1);

      expect(PlayerApi.findAvatarByPlayerId('player1')).toBeUndefined();
      expect(PlayerApi.findAvatarByPlayerId('player2')).toBe(avatar2);
    });
  });

  describe('findAvatarByPlayerId', () => {
    it('should return avatar for valid playerId', () => {
      const avatar = createMockAvatar('test123');

      PlayerApi.registerAvatar(avatar);

      const found = PlayerApi.findAvatarByPlayerId('test123');
      expect(found).toBe(avatar);
    });

    it('should return undefined for non-existent playerId', () => {
      const found = PlayerApi.findAvatarByPlayerId('nonexistent');
      expect(found).toBeUndefined();
    });

    it('should return undefined after unregistration', () => {
      const avatar = createMockAvatar('test123');

      PlayerApi.registerAvatar(avatar);
      PlayerApi.unregisterAvatar(avatar);

      const found = PlayerApi.findAvatarByPlayerId('test123');
      expect(found).toBeUndefined();
    });
  });

  describe('getAllAvatars', () => {
    it('should return empty array when no avatars registered', () => {
      const avatars = PlayerApi.getAllAvatars();

      expect(avatars).toEqual([]);
      expect(avatars).toHaveLength(0);
    });

    it('should return all registered avatars', () => {
      const avatar1 = createMockAvatar('player1');
      const avatar2 = createMockAvatar('player2');
      const avatar3 = createMockAvatar('player3');

      PlayerApi.registerAvatar(avatar1);
      PlayerApi.registerAvatar(avatar2);
      PlayerApi.registerAvatar(avatar3);

      const avatars = PlayerApi.getAllAvatars();

      expect(avatars).toHaveLength(3);
      expect(avatars).toContain(avatar1);
      expect(avatars).toContain(avatar2);
      expect(avatars).toContain(avatar3);
    });

    it('should return updated list after unregistration', () => {
      const avatar1 = createMockAvatar('player1');
      const avatar2 = createMockAvatar('player2');

      PlayerApi.registerAvatar(avatar1);
      PlayerApi.registerAvatar(avatar2);

      PlayerApi.unregisterAvatar(avatar1);

      const avatars = PlayerApi.getAllAvatars();

      expect(avatars).toHaveLength(1);
      expect(avatars).toContain(avatar2);
      expect(avatars).not.toContain(avatar1);
    });
  });

  describe('getAvatarCount', () => {
    it('should return 0 when no avatars registered', () => {
      expect(PlayerApi.getAvatarCount()).toBe(0);
    });

    it('should return correct count for registered avatars', () => {
      const avatar1 = createMockAvatar('player1');
      const avatar2 = createMockAvatar('player2');
      const avatar3 = createMockAvatar('player3');

      PlayerApi.registerAvatar(avatar1);
      expect(PlayerApi.getAvatarCount()).toBe(1);

      PlayerApi.registerAvatar(avatar2);
      expect(PlayerApi.getAvatarCount()).toBe(2);

      PlayerApi.registerAvatar(avatar3);
      expect(PlayerApi.getAvatarCount()).toBe(3);
    });

    it('should return updated count after unregistration', () => {
      const avatar1 = createMockAvatar('player1');
      const avatar2 = createMockAvatar('player2');

      PlayerApi.registerAvatar(avatar1);
      PlayerApi.registerAvatar(avatar2);
      expect(PlayerApi.getAvatarCount()).toBe(2);

      PlayerApi.unregisterAvatar(avatar1);
      expect(PlayerApi.getAvatarCount()).toBe(1);

      PlayerApi.unregisterAvatar(avatar2);
      expect(PlayerApi.getAvatarCount()).toBe(0);
    });
  });

  describe('loadAvatarsForUser', () => {
    let mockAvatar1: Avatar;
    let mockAvatar2: Avatar;

    function makeUser(id: string, playerIds: string[] = []): User {
      const user = new User();
      // MIGRATION: User has not yet been migrated to the methods-only
      // contract; bracket assignment until `setUserId` / `setPlayerIds`
      // land on the User class.
      user._id = id;
      user.playerIds = [...playerIds];
      return user;
    }

    beforeEach(async () => {
      mockAvatar1 = makeStuff(() => new Avatar());
      mockAvatar1.setPlayerId('player1');
      mockAvatar1.setName('Alice');
      mockAvatar2 = makeStuff(() => new Avatar());
      mockAvatar2.setPlayerId('player2');
      mockAvatar2.setName('Bob');
      // The retirement's materialize path consults the persistence
      // spine before cloning (snapshot present → seed-overlay clone).
      const { PersistableApi } = await import('../persistable');
      vi.spyOn(PersistableApi, 'hasRecord').mockResolvedValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clones one avatar per playerId on the user', async () => {
      const user = makeUser('user1', ['player1', 'player2']);
      const cloneSpy = vi
        .spyOn(StuffApi, 'clone')
        .mockResolvedValueOnce(mockAvatar1)
        .mockResolvedValueOnce(mockAvatar2);

      const avatars = await PlayerApi.loadAvatarsForUser(user);

      expect(cloneSpy).toHaveBeenCalledTimes(2);
      expect(avatars).toHaveLength(2);
      expect(avatars[0]).toBe(mockAvatar1);
      expect(avatars[1]).toBe(mockAvatar2);
    });

    it('threads { user, playerId } context into clone', async () => {
      const user = makeUser('user1', ['player1']);
      const cloneSpy = vi.spyOn(StuffApi, 'clone').mockResolvedValue(mockAvatar1);

      await PlayerApi.loadAvatarsForUser(user);

      // Snapshot-backed identity: the clone SOURCE is the shared seed;
      // the minted identity path rides `asTemplatePath`.
      expect(cloneSpy).toHaveBeenCalledWith(
        Avatar.SEED_TEMPLATE_PATH,
        { user, playerId: 'player1' },
        { asTemplatePath: Avatar.getTemplatePath('player1') },
      );
    });

    it('reuses Avatars already registered (multiplexing)', async () => {
      const user = makeUser('user1', ['player1']);
      PlayerApi.registerAvatar(mockAvatar1);

      const cloneSpy = vi.spyOn(StuffApi, 'clone');

      const avatars = await PlayerApi.loadAvatarsForUser(user);

      expect(cloneSpy).not.toHaveBeenCalled();
      expect(avatars).toHaveLength(1);
      expect(avatars[0]).toBe(mockAvatar1);
    });

    it('handles a user with no playerIds', async () => {
      const user = makeUser('user1');
      const cloneSpy = vi.spyOn(StuffApi, 'clone');

      const avatars = await PlayerApi.loadAvatarsForUser(user);

      expect(cloneSpy).not.toHaveBeenCalled();
      expect(avatars).toEqual([]);
    });

    it('clones once for two concurrent connects and shares the avatar', async () => {
      // Regression: two simultaneous connections for the same user
      // (multiplexing, or a dev StrictMode double-mount) must coordinate
      // on one clone. A bare check-then-clone races — the second connect
      // checks before the first clone registers and starts a duplicate,
      // which hits StuffApi's clone-in-flight guard and drops both
      // connections.
      PlayerApi.clearAll();
      const user = makeUser('user1', ['player1']);
      const cloneSpy = vi
        .spyOn(StuffApi, 'clone')
        .mockImplementation(async () => {
          // Slow enough that the second connect overlaps the first.
          await new Promise((resolve) => setTimeout(resolve, 25));
          return mockAvatar1;
        });

      const [a, b] = await Promise.all([
        PlayerApi.loadAvatarsForUser(user),
        PlayerApi.loadAvatarsForUser(user),
      ]);

      expect(cloneSpy).toHaveBeenCalledTimes(1);
      expect(a[0]).toBe(mockAvatar1);
      expect(b[0]).toBe(mockAvatar1);
      expect(a[0]).toBe(b[0]);
    });
  });

  describe('clearAll', () => {
    it('should clear all avatars', () => {
      const avatar1 = createMockAvatar('player1');
      const avatar2 = createMockAvatar('player2');

      PlayerApi.registerAvatar(avatar1);
      PlayerApi.registerAvatar(avatar2);
      expect(PlayerApi.getAvatarCount()).toBe(2);

      PlayerApi.clearAll();

      expect(PlayerApi.getAvatarCount()).toBe(0);
      expect(PlayerApi.getAllAvatars()).toEqual([]);
      expect(PlayerApi.findAvatarByPlayerId('player1')).toBeUndefined();
      expect(PlayerApi.findAvatarByPlayerId('player2')).toBeUndefined();
    });

    it('should handle clearing empty registry', () => {
      expect(() => PlayerApi.clearAll()).not.toThrow();
      expect(PlayerApi.getAvatarCount()).toBe(0);
    });
  });

  describe('isAvatarStuff', () => {
    // The predicate reads templatePath, NOT instanceof — the
    // template path is the durable identity of a Stuff (per the MR
    // review comment that motivated the move).

    function fakeStuffWithPath(path: string | undefined): {
      getTemplatePath(): string | undefined;
    } {
      return { getTemplatePath: () => path };
    }

    it("returns true for a Stuff whose templatePath starts with Avatar's prefix", () => {
      const stuff = fakeStuffWithPath('/obj/Avatar/abc123') as Avatar;
      expect(PlayerApi.isAvatarStuff(stuff)).toBe(true);
    });

    it('returns false for a Stuff with a non-Avatar templatePath', () => {
      const stuff = fakeStuffWithPath('/obj/npc/Gus') as unknown as Avatar;
      expect(PlayerApi.isAvatarStuff(stuff)).toBe(false);
    });

    it('returns false when the Stuff has no templatePath', () => {
      const stuff = fakeStuffWithPath(undefined) as unknown as Avatar;
      expect(PlayerApi.isAvatarStuff(stuff)).toBe(false);
    });

    it('reads the prefix from Avatar.TEMPLATE_PATH_PREFIX', () => {
      const stuff = fakeStuffWithPath(
        Avatar.TEMPLATE_PATH_PREFIX + 'whatever',
      ) as Avatar;
      expect(PlayerApi.isAvatarStuff(stuff)).toBe(true);
    });
  });
});

describe('PlayerLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-PlayerApi caller', () => {
    // A facade call lazily creates the logic singleton.
    PlayerApi.getAvatarCount();
    const logic = StuffApi.findByTemplatePath<PlayerLogic>('/obj/api/player');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/player#PlayerApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.getAvatarCount()).toThrow(SecurityError);
  });
});
