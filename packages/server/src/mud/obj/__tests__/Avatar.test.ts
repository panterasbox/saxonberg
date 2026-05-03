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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Avatar } from '../Avatar';
import { Interactive } from '../Interactive';
import { Character } from '../../lib/character/Character';
import { User } from '../../lib/identity/User';
import { makeStuff } from '../../lib/security/test-setup';

function makeUser(id: string): User {
  const user = new User();
  user._id = id;
  return user;
}

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.playerId = playerId;
  return a;
}

describe('Avatar', () => {
  describe('TEMPLATE_PATH_PREFIX', () => {
    it('should have correct template path prefix', () => {
      expect(Avatar.TEMPLATE_PATH_PREFIX).toBe('/avatar/');
    });

    it('should be a string constant', () => {
      expect(typeof Avatar.TEMPLATE_PATH_PREFIX).toBe('string');
    });
  });

  describe('getTemplatePath', () => {
    it('should construct correct template path for playerId', () => {
      const playerId = '6963f6ef384c0c4830a80638';
      const path = Avatar.getTemplatePath(playerId);

      expect(path).toBe('/avatar/6963f6ef384c0c4830a80638');
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
        '/avatar/507f1f77bcf86cd799439011'
      );

      // Short ID
      const shortId = 'abc123';
      expect(Avatar.getTemplatePath(shortId)).toBe('/avatar/abc123');

      // UUID format
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(Avatar.getTemplatePath(uuid)).toBe(
        '/avatar/550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should handle empty string playerId', () => {
      const path = Avatar.getTemplatePath('');

      expect(path).toBe('/avatar/');
    });

    it('should generate unique paths for different playerIds', () => {
      const path1 = Avatar.getTemplatePath('player1');
      const path2 = Avatar.getTemplatePath('player2');
      const path3 = Avatar.getTemplatePath('player3');

      expect(path1).not.toBe(path2);
      expect(path2).not.toBe(path3);
      expect(path1).not.toBe(path3);

      expect(path1).toBe('/avatar/player1');
      expect(path2).toBe('/avatar/player2');
      expect(path3).toBe('/avatar/player3');
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
      expect(path).toMatch(/^\/avatar\/.+$/);
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
      expect(templatePath.includes('/avatar/')).toBe(true);
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
      expect(avatar).toHaveProperty('firstName');
      expect(avatar).toHaveProperty('lastName');
      expect(avatar).toHaveProperty('pronouns');
    });

    it('should have Named mixin fullName getter', () => {
      avatar.firstName = 'Jane';
      avatar.lastName = 'Smith';
      expect(avatar.fullName).toBe('Jane Smith');
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

  });

  describe('onMessage (SensorMixin override)', () => {
    let avatar: Avatar;
    let mockApp: any;
    let interactive1: Interactive;
    let interactive2: Interactive;

    beforeEach(() => {
      // Create a simple avatar for testing
      avatar = makeAvatar('test-player-123');

      // Mock Application.sendMessageToInteractive
      mockApp = {
        sendMessageToInteractive: vi.fn(),
      };

      // Spy on Avatar.getApplicationInstance to return our mock app
      vi.spyOn(Avatar as any, 'getApplicationInstance').mockReturnValue(mockApp);

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

      const message = {
        type: 'output',
        payload: { text: 'Test message' },
      };

      avatar.onMessage(message);

      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledTimes(2);
      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledWith(
        interactive1,
        message
      );
      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledWith(
        interactive2,
        message
      );
    });

    it('should handle single Interactive', () => {
      avatar.addInteractive(interactive1);

      const message = { type: 'test' };

      avatar.onMessage(message);

      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledTimes(1);
      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledWith(
        interactive1,
        message
      );
    });

    it('should handle no Interactives gracefully', () => {
      const message = { type: 'test' };

      // Should not throw
      expect(() => avatar.onMessage(message)).not.toThrow();

      expect(mockApp.sendMessageToInteractive).not.toHaveBeenCalled();
    });

    it('should support multiplexing (same user, multiple devices)', () => {
      // Simulate same user on laptop and phone
      const laptop = makeStuff(() => new Interactive('socket-laptop', 'session-1', makeUser('user-1')));
      const phone = makeStuff(() => new Interactive('socket-phone', 'session-2', makeUser('user-1')));

      avatar.addInteractive(laptop);
      avatar.addInteractive(phone);

      const message = { type: 'output', payload: { text: 'Hello' } };

      avatar.onMessage(message);

      // Both devices receive the message
      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledWith(
        laptop,
        message
      );
      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledWith(
        phone,
        message
      );
    });

    it('should work with different message types', () => {
      avatar.addInteractive(interactive1);

      const outputMsg = { type: 'output', payload: { text: 'Text' } };
      const errorMsg = { type: 'error', payload: { message: 'Error' } };

      avatar.onMessage(outputMsg);
      avatar.onMessage(errorMsg);

      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledWith(
        interactive1,
        outputMsg
      );
      expect(mockApp.sendMessageToInteractive).toHaveBeenCalledWith(
        interactive1,
        errorMsg
      );
    });
  });
});
