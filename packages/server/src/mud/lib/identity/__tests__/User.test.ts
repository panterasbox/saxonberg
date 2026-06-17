/**
 * Tests for User (a Document — plain persisted record, NOT a Stuff).
 *
 * Covers:
 * - Persistent fields configuration (includes playerIds ownership list)
 * - Collection name configuration
 * - User instances are plain objects (no stuffId / no StuffApi registration)
 */

import { describe, it, expect } from 'vitest';
import { User } from '../User';

describe('User', () => {
  describe('collectionName', () => {
    it('should have correct MongoDB collection name', () => {
      expect(User.collectionName).toBe('users');
    });
  });

  describe('persistentFields', () => {
    it('should include googleProfileId', () => {
      expect(User.persistentFields).toContain('googleProfileId');
    });

    it('should include twitchProfileId (the second provider FK)', () => {
      expect(User.persistentFields).toContain('twitchProfileId');
    });

    it('should include playerIds (authoritative character-ownership list)', () => {
      expect(User.persistentFields).toContain('playerIds');
    });

    it('should be exactly [googleProfileId, twitchProfileId, playerIds]', () => {
      expect(User.persistentFields).toEqual([
        'googleProfileId',
        'twitchProfileId',
        'playerIds',
      ]);
    });
  });

  describe('User instance', () => {
    it('should leave both provider FKs unset by default', () => {
      const user = new User();
      expect(user.googleProfileId).toBeUndefined();
      expect(user.twitchProfileId).toBeUndefined();
    });

    it('hasAnyProvider reflects the at-least-one invariant', () => {
      const user = new User();
      expect(user.hasAnyProvider()).toBe(false);
      user.googleProfileId = 'gp-1';
      expect(user.hasAnyProvider()).toBe(true);
      user.googleProfileId = undefined;
      user.twitchProfileId = 'tp-1';
      expect(user.hasAnyProvider()).toBe(true);
    });

    it('profileFieldFor maps providers to FK field names', () => {
      expect(User.profileFieldFor('google')).toBe('googleProfileId');
      expect(User.profileFieldFor('twitch')).toBe('twitchProfileId');
    });

    it('should initialize playerIds to an empty array', () => {
      const user = new User();
      expect(Array.isArray(user.playerIds)).toBe(true);
      expect(user.playerIds).toEqual([]);
    });

    it('should have _id field (undefined until saved)', () => {
      const user = new User();
      expect(user).toHaveProperty('_id');
      expect(user._id).toBeUndefined();
    });

    it('should be a plain object, not a registered Stuff (no stuffId)', () => {
      const user = new User();
      expect((user as unknown as { stuffId?: unknown }).stuffId).toBeUndefined();
    });

    it('should initialize createdAt and updatedAt timestamps', () => {
      const user = new User();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow appending to playerIds', () => {
      const user = new User();
      user.playerIds.push('slot-1', 'slot-2');
      expect(user.playerIds).toEqual(['slot-1', 'slot-2']);
    });
  });
});
