/**
 * Tests for Interactive
 *
 * Interactive is now a thin connection-state object: it holds the
 * authenticated User, the current `holder` (a HasInteractive — Login
 * during entry, Avatar during play), socketId/sessionId/connectedAt,
 * and a `send` stub. Avatar loading and connection routing live in
 * `PlayerApi.loadAvatarsForUser` and `ConnectionApi.transfer/detach`
 * respectively — those have their own tests.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Interactive from '../idea/Interactive';
import Avatar from '../agent/Avatar';
import { User } from '../../lib/identity/User';
import { StuffApi } from '../../api/stuff';
import { ProxyApi } from '../../api/proxy';
import { ConnectionApi } from '../../api/connection';
import { PlayerApi } from '../../api/player';
import { MqlSubscriptionApi } from '../../api/mql-subscription';
import { ForumsApi } from '../../api/forums';
import { ReactionApi } from '../../api/reaction';
import { PromptApi } from '../../api/prompt';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

function makeUser(id: string, playerIds: string[] = []): User {
  const user = new User();
  user._id = id;
  user.playerIds = [...playerIds];
  return user;
}

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.setPlayerId(playerId);
  return a;
}

describe('Interactive', () => {
  let interactive: Interactive;
  const testSocketId = 'socket123';
  const testSessionId = 'session456';
  const testUserId = 'user789';

  beforeEach(() => {
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

      expect(interactive.getSocketId()).toBe(testSocketId);
      expect(interactive.getSessionId()).toBe(testSessionId);
      expect(interactive.getUser()).toBe(user);
      expect(interactive.getUserId()).toBe(testUserId);
      expect(interactive.getConnectedAt()).toBeInstanceOf(Date);
    });

    it('should initialize with null holder', () => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
      expect(interactive.getHolder()).toBeNull();
    });

    it('should have unique stuffId', () => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));

      expect(interactive.stuffId).toBeTruthy();
      expect(typeof interactive.stuffId).toBe('string');
      expect(interactive.stuffId.length).toBeGreaterThan(0);
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
      mockAvatar.setName('Alice');
    });

    afterEach(() => {
      if (interactive1 && !interactive1.isDestroyed()) {
        StuffApi.destruct(interactive1);
      }
      if (interactive2 && !interactive2.isDestroyed()) {
        StuffApi.destruct(interactive2);
      }
    });

    it('should support multiple Interactives on same Avatar', () => {
      ConnectionApi.transfer(interactive1, mockAvatar);
      ConnectionApi.transfer(interactive2, mockAvatar);

      expect(mockAvatar.getInteractives().size).toBe(2);
      expect(mockAvatar.getInteractives().has(interactive1)).toBe(true);
      expect(mockAvatar.getInteractives().has(interactive2)).toBe(true);
    });

    it('should both Interactives reference same Avatar via holder', () => {
      ConnectionApi.transfer(interactive1, mockAvatar);
      ConnectionApi.transfer(interactive2, mockAvatar);

      expect(interactive1.getHolder()).toBe(mockAvatar);
      expect(interactive2.getHolder()).toBe(mockAvatar);
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

  describe('onDestruct', () => {
    let mockAvatar: Avatar;

    beforeEach(() => {
      interactive = makeStuff(() => new Interactive(testSocketId, testSessionId, makeUser(testUserId)));
      mockAvatar = makeAvatar('player1');
    });

    it('should remove from holder on destroy', () => {
      ConnectionApi.transfer(interactive, mockAvatar);

      StuffApi.destruct(interactive);

      expect(mockAvatar.getInteractives().has(interactive)).toBe(false);
    });

    it('should clear holder on destroy', () => {
      ConnectionApi.transfer(interactive, mockAvatar);

      StuffApi.destruct(interactive);

      // Methods on destroyed Stuff throw via the security gate, so reach
      // for the underlying state through the canonical raw-target seam.
      const raw = ProxyApi.unwrap(interactive) as unknown as { holder: unknown };
      expect(raw.holder).toBeNull();
    });

    it('should mark object as destroyed', () => {
      expect(interactive.isDestroyed()).toBe(false);

      StuffApi.destruct(interactive);

      expect(interactive.isDestroyed()).toBe(true);
    });

    it('should handle destroy with no holder', () => {
      expect(interactive.getHolder()).toBeNull();
      expect(() => StuffApi.destruct(interactive)).not.toThrow();
      expect(interactive.isDestroyed()).toBe(true);
    });
  });

  describe('teardownSubstrateState', () => {
    beforeEach(() => {
      interactive = makeStuff(
        () => new Interactive(testSocketId, testSessionId, makeUser(testUserId)),
      );
    });

    it('cancels MQL + forum subscriptions, reactions, then prompts', () => {
      const mql = vi
        .spyOn(MqlSubscriptionApi, 'cancelAllForInteractive')
        .mockImplementation(() => {});
      const forum = vi
        .spyOn(ForumsApi, 'cancelAllForInteractive')
        .mockImplementation(() => {});
      const reaction = vi
        .spyOn(ReactionApi, 'cancelAllForInteractive')
        .mockImplementation(() => {});
      const prompt = vi
        .spyOn(PromptApi, 'cancelAll')
        .mockImplementation(() => 0);

      interactive.teardownSubstrateState();

      // Each cancellation receives this Interactive (the proxy identity
      // used as the subscription/registry key).
      expect(mql).toHaveBeenCalledWith(interactive);
      expect(forum).toHaveBeenCalledWith(interactive);
      expect(reaction).toHaveBeenCalledWith(interactive);
      expect(prompt).toHaveBeenCalledWith(interactive, 'host-disconnected');

      // Prompts reject last so a controller's catch can react while the
      // Interactive is still live.
      const order = [mql, forum, reaction, prompt].map(
        (s) => s.mock.invocationCallOrder[0]!,
      );
      expect(order).toEqual([...order].sort((a, b) => a - b));

      mql.mockRestore();
      forum.mockRestore();
      reaction.mockRestore();
      prompt.mockRestore();
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

    it('should include holder name when connected', () => {
      const mockAvatar = makeAvatar('player1');
      mockAvatar.setName('Alice');
      mockAvatar.setSurname('Smith');

      ConnectionApi.transfer(interactive, mockAvatar);
      const str = interactive.toString();

      // toString uses getPresentation() (casual register),
      // which returns Named.name, not the fullName form.
      expect(str).toContain('Alice');
    });
  });
});
