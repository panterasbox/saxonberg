/**
 * Tests for ConnectionApi.transfer / detach.
 *
 * Routing semantics: transfer moves an Interactive between holders;
 * detach removes it from any holder. Connection lifecycle (the
 * Interactive itself going up or down) is tested in Interactive.test.ts.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionApi } from '../connection';
import { ConnectionLogic } from '../../platform/idea/api/ConnectionLogic';
import { SecurityError } from '../../lib/security/errors';
import Interactive from '../../platform/idea/Interactive';
import Avatar from '../../platform/agent/Avatar';
import { User } from '../../lib/identity/User';
import { StuffApi } from '../stuff';
import { PlayerApi } from '../player';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

function makeUser(): User {
  return new User();
}

function makeAvatar(playerId: string): Avatar {
  const a = makeStuff(() => new Avatar());
  a.setPlayerId(playerId);
  return a;
}

function makeInteractive(socketId: string): Interactive {
  return makeStuff(() => new Interactive(socketId, `${socketId}-session`, makeUser()));
}

describe('ConnectionApi', () => {
  let interactive: Interactive;
  let avatarA: Avatar;
  let avatarB: Avatar;

  beforeEach(() => {
    PlayerApi.clearAll();
    interactive = makeInteractive('s1');
    avatarA = makeAvatar('player-a');
    avatarB = makeAvatar('player-b');
  });

  afterEach(() => {
    if (!interactive.isDestroyed()) StuffApi.destruct(interactive);
  });

  describe('transfer', () => {
    it('attaches an unowned Interactive to a holder', () => {
      expect(interactive.getHolder()).toBeNull();

      interactive.transferTo(avatarA);

      expect(interactive.getHolder()).toBe(avatarA);
      expect(avatarA.getInteractives().has(interactive)).toBe(true);
    });

    it('moves an Interactive from one holder to another', () => {
      interactive.transferTo(avatarA);
      interactive.transferTo(avatarB);

      expect(interactive.getHolder()).toBe(avatarB);
      expect(avatarA.getInteractives().has(interactive)).toBe(false);
      expect(avatarB.getInteractives().has(interactive)).toBe(true);
    });

    it('is idempotent on the same target', () => {
      interactive.transferTo(avatarA);
      interactive.transferTo(avatarA);

      expect(interactive.getHolder()).toBe(avatarA);
      expect(avatarA.getInteractives().size).toBe(1);
      expect(avatarA.getInteractives().has(interactive)).toBe(true);
    });
  });

  describe('detach', () => {
    it('removes an Interactive from its current holder', () => {
      interactive.transferTo(avatarA);

      interactive.detach();

      expect(interactive.getHolder()).toBeNull();
      expect(avatarA.getInteractives().has(interactive)).toBe(false);
    });

    it('is a no-op when there is no current holder', () => {
      expect(interactive.getHolder()).toBeNull();

      expect(() => interactive.detach()).not.toThrow();

      expect(interactive.getHolder()).toBeNull();
    });
  });
});

describe('ConnectionLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-ConnectionApi caller', () => {
    // A facade call lazily creates the logic singleton.
    ConnectionApi.getConnectionCount();
    const logic = StuffApi.findByTemplatePath<ConnectionLogic>(
      '/platform/idea/api/connection'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/connection#ConnectionApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.getConnectionCount()).toThrow(SecurityError);
  });
});
