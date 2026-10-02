/**
 * The lounge's three Location classes, on the floor roster.
 *
 * ⭐ Same guard as `lib/stuff/__tests__/Location.floor.test.ts` and it lives
 * here rather than there for a reason worth knowing: a kernel test may not
 * name `/world/<locality>` (`lint:test-content` — a kernel test proves the
 * kernel over synthetic fixtures; a test of real content lives beside the
 * content), and these three classes ARE content.
 *
 * What it guards: the floor is minted by `Location.onCreate`, so any
 * override that forgets `await super.onCreate(context)` silently leaves
 * its rooms with no floor and nothing else goes wrong. (Until
 * 2026-10-01 the hazard was worse: `PostRegistrationMixin`'s default was
 * a non-chaining no-op, so a second composition anywhere above the base
 * swallowed the base's hook. The terminal on `Stuff` removed that whole
 * class of failure; forgetting `super` in your own override is the only
 * way left.) All three of these
 * override the hook (`verifyOutboundExits`), and all three had no `super`
 * call before this build.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Lounge from '../location/Lounge';
import Bar from '../location/Bar';
import type Location from '../../../lib/stuff/Location';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { installStore, loungeDocs } from './lounge-fixtures';

describe('the lounge classes all get a floor', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installStore(loungeDocs());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  const ROSTER: Array<[string, () => Location]> = [
    ['Lounge', () => new Lounge() as unknown as Location],
    ['Bar', () => new Bar() as unknown as Location],
  ];

  for (const [name, factory] of ROSTER) {
    it(`${name}.onCreate chains super, so the room has a floor`, async () => {
      const room = await StuffApi.create(factory);
      const floor = room.getFloor();
      expect(floor, `${name} has no floor`).not.toBeNull();
      expect(MixinApi.isFloor(floor!)).toBe(true);
      expect(floor!.getKeywords()).toContain('ground');
    });
  }
});
