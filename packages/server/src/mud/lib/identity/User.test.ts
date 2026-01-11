/**
 * Tests for User
 *
 * Covers:
 * - Persistent fields configuration
 * - Verification that playerIds was removed (no bidirectional relationship)
 * - Collection name configuration
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

    it('should NOT include playerIds (removed bidirectional relationship)', () => {
      expect(User.persistentFields).not.toContain('playerIds');
    });

    it('should be an array', () => {
      expect(Array.isArray(User.persistentFields)).toBe(true);
    });

    it('should only contain expected fields', () => {
      // User has no mixins, so persistentFields should only have class fields
      expect(User.persistentFields).toEqual(['googleProfileId']);
    });

    it('should have correct number of persistent fields', () => {
      // Should only have googleProfileId after playerIds removal
      expect(User.persistentFields.length).toBe(1);
    });
  });

  describe('User instance', () => {
    it('should create user with googleProfileId field', () => {
      const user = new User();

      expect(user).toHaveProperty('googleProfileId');
      expect(user.googleProfileId).toBe('');
    });

    it('should NOT have playerIds field', () => {
      const user = new User();

      // Verify playerIds was removed
      expect(user).not.toHaveProperty('playerIds');
    });

    it('should have stuffId from Stuff base class', () => {
      const user = new User();

      expect(user).toHaveProperty('stuffId');
      expect(user.stuffId).toBeDefined();
      expect(typeof user.stuffId).toBe('string');
    });

    it('should have _id field from Persistent base class', () => {
      const user = new User();

      expect(user).toHaveProperty('_id');
    });

    it('should be able to set googleProfileId', () => {
      const user = new User();
      const testProfileId = '507f1f77bcf86cd799439011';

      user.googleProfileId = testProfileId;

      expect(user.googleProfileId).toBe(testProfileId);
    });
  });

  describe('User relationship to Player', () => {
    it('should NOT maintain bidirectional relationship via playerIds array', () => {
      // This test documents the architectural decision to remove User.playerIds
      // Players reference User via userId, but User does NOT store playerIds
      // To find a User's players, query: PersistenceManager.find(Collections.Players, { userId })

      const user = new User();

      // Verify the bidirectional relationship was removed
      expect('playerIds' in user).toBe(false);
      expect(User.persistentFields.includes('playerIds')).toBe(false);
    });
  });
});
