/**
 * Tests for Avatar
 *
 * Covers:
 * - Template path construction
 * - Template path prefix constant
 * - Path consistency for different player IDs
 */

import { describe, it, expect } from 'vitest';
import { Avatar } from './Avatar.js';

describe('Avatar', () => {
  describe('TEMPLATE_PATH_PREFIX', () => {
    it('should have correct template path prefix', () => {
      expect(Avatar.TEMPLATE_PATH_PREFIX).toBe('/avatar/player/');
    });

    it('should be a string constant', () => {
      expect(typeof Avatar.TEMPLATE_PATH_PREFIX).toBe('string');
    });
  });

  describe('getTemplatePath', () => {
    it('should construct correct template path for playerId', () => {
      const playerId = '6963f6ef384c0c4830a80638';
      const path = Avatar.getTemplatePath(playerId);

      expect(path).toBe('/avatar/player/6963f6ef384c0c4830a80638');
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
        '/avatar/player/507f1f77bcf86cd799439011'
      );

      // Short ID
      const shortId = 'abc123';
      expect(Avatar.getTemplatePath(shortId)).toBe('/avatar/player/abc123');

      // UUID format
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(Avatar.getTemplatePath(uuid)).toBe(
        '/avatar/player/550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should handle empty string playerId', () => {
      const path = Avatar.getTemplatePath('');

      expect(path).toBe('/avatar/player/');
    });

    it('should generate unique paths for different playerIds', () => {
      const path1 = Avatar.getTemplatePath('player1');
      const path2 = Avatar.getTemplatePath('player2');
      const path3 = Avatar.getTemplatePath('player3');

      expect(path1).not.toBe(path2);
      expect(path2).not.toBe(path3);
      expect(path1).not.toBe(path3);

      expect(path1).toBe('/avatar/player/player1');
      expect(path2).toBe('/avatar/player/player2');
      expect(path3).toBe('/avatar/player/player3');
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
      expect(path).toMatch(/^\/avatar\/player\/.+$/);
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
      expect(templatePath.includes('/avatar/player/')).toBe(true);
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
});
