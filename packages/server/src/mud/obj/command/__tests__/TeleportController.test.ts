/**
 * TeleportController tests — focus-resolution rule for the
 * destination default. The yaml's `default: "$focus"` runs through
 * MQL to a Stuff; the controller then routes that Stuff through
 * `_resolveDestinationContainer` to pick the actual landing
 * container. Container-wins precedence covers Avatars and Vessels;
 * Containable-only fallback covers "point at this item, drop the
 * target near it."
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TeleportController } from '../TeleportController';
import {
  makeWorld,
  type MqlWorld,
} from '../../../api/__tests__/fixtures/mql-world';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';

describe('TeleportController._resolveDestinationContainer', () => {
  let world: MqlWorld;
  beforeEach(() => {
    world = makeWorld();
  });

  it('Container-shaped focus is used as-is (room → room)', () => {
    expect(MixinApi.isContainer(world.location)).toBe(true);
    const dest = TeleportController._resolveDestinationContainer(world.location);
    expect(dest).toBe(world.location);
  });

  it('Container + Containable focus uses the Container side (giver → giver inventory)', () => {
    // The fixture giver composes both Container and Containable —
    // analogous to an Avatar with inventory. Container-wins
    // precedence: focus on bob, teleport sword → into bob.
    expect(MixinApi.isContainer(world.giver)).toBe(true);
    expect(MixinApi.isContainable(world.giver)).toBe(true);
    const dest = TeleportController._resolveDestinationContainer(world.giver);
    expect(dest).toBe(world.giver);
  });

  it('Containable-only focus walks up to the environment (rose → location)', () => {
    // The rose is a Containable item with no Container side. Focus
    // on it and teleport-target should land where the rose
    // currently is — the location.
    expect(MixinApi.isContainable(world.rose)).toBe(true);
    expect(MixinApi.isContainer(world.rose)).toBe(false);
    const dest = TeleportController._resolveDestinationContainer(world.rose);
    expect(dest).toBe(world.location);
  });

  it('Containable focus with no environment returns null', () => {
    // Synthetic case: a Containable that's been detached. Walk-up
    // finds nothing → controller surfaces a clear error.
    const orphan = world.daisy;
    expect(MixinApi.isContainable(orphan)).toBe(true);
    // Detach via the standard chokepoint.
    ContainmentApi.move(orphan as never, null);
    expect(TeleportController._resolveDestinationContainer(orphan)).toBeNull();
  });
});
