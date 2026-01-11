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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Avatar } from './Avatar';
import { Interactive } from '../lib/connection/Interactive';
import { Character } from '../lib/stuff/Character';

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

  describe('Character inheritance', () => {
    let avatar: Avatar;

    beforeEach(() => {
      avatar = new Avatar({ playerId: 'test123' });
    });

    it('should be instance of Character', () => {
      expect(avatar instanceof Character).toBe(true);
    });

    it('should have all Character mixin properties', () => {
      expect(avatar).toHaveProperty('firstName');
      expect(avatar).toHaveProperty('lastName');
      expect(avatar).toHaveProperty('pronouns');
      expect(avatar).toHaveProperty('hp');
      expect(avatar).toHaveProperty('maxHp');
    });

    it('should have Named mixin fullName getter', () => {
      avatar.firstName = 'Jane';
      avatar.lastName = 'Smith';
      expect(avatar.fullName).toBe('Jane Smith');
    });

    it('should have Mortal mixin methods', () => {
      expect(typeof avatar.isDead).toBe('function');
      expect(typeof avatar.takeDamage).toBe('function');
      expect(typeof avatar.heal).toBe('function');
    });
  });

  describe('multiplexing support', () => {
    let avatar: Avatar;
    let interactive1: Interactive;
    let interactive2: Interactive;
    let interactive3: Interactive;

    beforeEach(() => {
      avatar = new Avatar({ playerId: 'test123' });
      interactive1 = new Interactive('socket1', 'session1', 'user1');
      interactive2 = new Interactive('socket2', 'session2', 'user1');
      interactive3 = new Interactive('socket3', 'session3', 'user1');
    });

    describe('addInteractive', () => {
      it('should add single interactive', () => {
        avatar.addInteractive(interactive1);
        expect(avatar.interactives.size).toBe(1);
        expect(avatar.interactives.has(interactive1)).toBe(true);
      });

      it('should add multiple interactives', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);
        avatar.addInteractive(interactive3);

        expect(avatar.interactives.size).toBe(3);
        expect(avatar.interactives.has(interactive1)).toBe(true);
        expect(avatar.interactives.has(interactive2)).toBe(true);
        expect(avatar.interactives.has(interactive3)).toBe(true);
      });

      it('should not add duplicate interactive (Set behavior)', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive1);

        expect(avatar.interactives.size).toBe(1);
      });
    });

    describe('removeInteractive', () => {
      beforeEach(() => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);
      });

      it('should remove interactive', () => {
        avatar.removeInteractive(interactive1);

        expect(avatar.interactives.size).toBe(1);
        expect(avatar.interactives.has(interactive1)).toBe(false);
        expect(avatar.interactives.has(interactive2)).toBe(true);
      });

      it('should handle removing non-existent interactive', () => {
        avatar.removeInteractive(interactive3);

        expect(avatar.interactives.size).toBe(2);
      });

      it('should handle removing all interactives', () => {
        avatar.removeInteractive(interactive1);
        avatar.removeInteractive(interactive2);

        expect(avatar.interactives.size).toBe(0);
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

    describe('legacy methods', () => {
      it('setInteractive should add to interactives set', () => {
        avatar.setInteractive(interactive1);
        expect(avatar.interactives.has(interactive1)).toBe(true);
      });

      it('unlinkInteractive should remove all interactives', () => {
        avatar.addInteractive(interactive1);
        avatar.addInteractive(interactive2);

        avatar.unlinkInteractive();

        expect(avatar.interactives.size).toBe(0);
      });
    });
  });
});
