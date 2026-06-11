/**
 * Tests for the `FromController(...controllers)` policy sugar.
 *
 * The pattern is: a privileged Api method is restricted to one or more
 * verb controllers via `FromController(...)`. Calls from inside one of
 * the listed controllers' modules pass; calls from anywhere else are
 * denied. This is the narrow-entry half of the access build's pattern
 * — the verb controller does the access check before invoking.
 *
 * The tests run against the real plugin-stamped module identities of
 * actual controllers in `obj/command/`.
 */

import { describe, it, expect } from 'vitest';
import { SecurityPolicies } from '../SecurityPolicies';
import DestructController from '../../../obj/command/author/DestructController';
import TeleportController from '../../../obj/command/author/TeleportController';
import GotoController from '../../../obj/command/author/GotoController';
import { StuffApi } from '../../../api/stuff';

describe('FromController', () => {
  it('throws when given no controllers', () => {
    expect(() => SecurityPolicies.FromController()).toThrow();
  });

  describe('single-controller form', () => {
    it('allows calls from inside the named controller', () => {
      const policy = SecurityPolicies.FromController(DestructController);
      // The controller instance carries the controller's class identity.
      const inst = Object.create(DestructController.prototype);
      expect(policy.allows(inst, null, 'm')).toBe(true);
    });

    it('denies calls from outside the controller', () => {
      const policy = SecurityPolicies.FromController(DestructController);
      const teleport = Object.create(TeleportController.prototype);
      expect(policy.allows(teleport, null, 'm')).toBe(false);
    });

    it('denies non-controller callers (Api classes etc.)', () => {
      const policy = SecurityPolicies.FromController(DestructController);
      expect(policy.allows(StuffApi, null, 'm')).toBe(false);
      expect(policy.allows(null, null, 'm')).toBe(false);
    });
  });

  describe('multi-controller form', () => {
    it('allows calls from any listed controller', () => {
      const policy = SecurityPolicies.FromController(
        TeleportController,
        GotoController,
      );
      const tele = Object.create(TeleportController.prototype);
      const goto = Object.create(GotoController.prototype);
      expect(policy.allows(tele, null, 'm')).toBe(true);
      expect(policy.allows(goto, null, 'm')).toBe(true);
    });

    it('denies calls from controllers not in the list', () => {
      const policy = SecurityPolicies.FromController(
        TeleportController,
        GotoController,
      );
      const destruct = Object.create(DestructController.prototype);
      expect(policy.allows(destruct, null, 'm')).toBe(false);
    });
  });
});
