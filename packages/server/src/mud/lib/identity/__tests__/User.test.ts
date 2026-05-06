/**
 * Tests for User (a Persistable, Idea-rooted).
 *
 * Covers:
 * - Persistent fields configuration (includes playerIds ownership list)
 * - Collection name configuration
 * - User IS a Stuff (has stuffId, registered with StuffApi)
 */

import { describe, it, expect } from 'vitest';
import { User } from '../User';
import { makeStuff } from '../../security/__tests__/test-setup';
import { Idea } from "../../stuff/Idea";

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
      const user = makeStuff(() => new User());
      expect(user.googleProfileId).toBe('');
    });

    it('should initialize playerIds to an empty array', () => {
      const user = makeStuff(() => new User());
      expect(Array.isArray(user.playerIds)).toBe(true);
      expect(user.playerIds).toEqual([]);
    });

    it('should have _id field (undefined until saved)', () => {
      const user = makeStuff(() => new User());
      expect(user).toHaveProperty('_id');
      expect(user._id).toBeUndefined();
    });

    it('should be a Stuff (has stuffId)', () => {
      const user = makeStuff(() => new User());
      expect(typeof user.stuffId).toBe('string');
      expect(user.stuffId.length).toBeGreaterThan(0);
    });

    it('should initialize createdAt and updatedAt timestamps', () => {
      const user = makeStuff(() => new User());
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow appending to playerIds', () => {
      const user = makeStuff(() => new User());
      user.playerIds.push('slot-1', 'slot-2');
      expect(user.playerIds).toEqual(['slot-1', 'slot-2']);
    });
  });
});
