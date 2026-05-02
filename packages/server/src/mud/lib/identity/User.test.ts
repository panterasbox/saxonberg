/**
 * Tests for User (pure Persistable, not a Stuff).
 *
 * Covers:
 * - Persistent fields configuration (includes playerIds ownership list)
 * - Collection name configuration
 * - User is NOT a Stuff (no stuffId)
 */

import { describe, it, expect } from 'vitest';
import { User } from './User';

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

    it('should include playerIds (authoritative character-ownership list)', () => {
      expect(User.persistentFields).toContain('playerIds');
    });

    it('should be exactly [googleProfileId, playerIds]', () => {
      expect(User.persistentFields).toEqual(['googleProfileId', 'playerIds']);
    });
  });

  describe('User instance', () => {
    it('should initialize googleProfileId to empty string', () => {
      const user = new User();
      expect(user.googleProfileId).toBe('');
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

    it('should NOT be a Stuff (no stuffId)', () => {
      const user = new User();
      expect(user).not.toHaveProperty('stuffId');
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
