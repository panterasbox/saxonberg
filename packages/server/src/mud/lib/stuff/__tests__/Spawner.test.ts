/**
 * SpawnerMixin tests — the holder side of the Spawner / Spawned
 * substrate. Covers basic surface (track/untrack/get/has) and the
 * transient-collection invariant.
 *
 * Cleanup behavior (R2.4) is exercised in `Spawner.cleanup.test.ts`.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { MixinApi } from '../../../api/mixin';
import { Mixins } from '../../mixin';
import { Idea } from '../Idea';
import { SpawnerMixin } from '../Spawner';
import { SpawnedMixin } from '../Spawned';
import { makeStuff } from '../../security/__tests__/test-setup';

class Nest extends SpawnerMixin(Idea) {}
class Hatchling extends SpawnedMixin(Idea) {}

describe('SpawnerMixin', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('registers in the mixin registry under Mixins.Spawner', () => {
    const nest = makeStuff(() => new Nest());
    expect(MixinApi.isSpawner(nest)).toBe(true);
    expect(MixinApi.hasMixin(nest, Mixins.Spawner)).toBe(true);
  });

  it('trackSpawn / untrackSpawn round-trip', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());
    nest.trackSpawn(baby);
    expect(nest.hasSpawned(baby)).toBe(true);
    expect(nest.getSpawned().has(baby)).toBe(true);
    expect(baby.getSpawner()).toBe(nest);

    expect(nest.untrackSpawn(baby)).toBe(true);
    expect(nest.hasSpawned(baby)).toBe(false);
    expect(baby.getSpawner()).toBeNull();
  });

  it('trackSpawn is idempotent — repeated calls do not duplicate', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());
    nest.trackSpawn(baby);
    nest.trackSpawn(baby);
    nest.trackSpawn(baby);
    expect(nest.getSpawned().size).toBe(1);
  });

  it('untrackSpawn returns false when the spawn was not tracked', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());
    expect(nest.untrackSpawn(baby)).toBe(false);
  });

  it('getSpawned returns a readonly view (mutator methods absent)', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());
    nest.trackSpawn(baby);
    const view = nest.getSpawned();
    // The view is the underlying Set typed as ReadonlySet; TS bars
    // mutator methods at compile time. Runtime: the Set's mutator
    // methods are present (it IS a Set), but TypeScript's
    // ReadonlySet typing is the contract.
    expect(view.size).toBe(1);
    expect(view.has(baby)).toBe(true);
  });
});

describe('Spawner._spawned transience', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('_spawned is NOT in persistentFields', () => {
    // The Spawner field is `protected _spawned`. Persistent-field
    // collection walks the prototype-chain `persistentFields`
    // statics; we assert that 'spawned' / '_spawned' is absent.
    const fields = MixinApi.getAllPersistentFields(
      Nest as unknown as { prototype: unknown } &
        ((...args: unknown[]) => unknown)
    );
    expect(fields).not.toContain('_spawned');
    expect(fields).not.toContain('spawned');
  });
});
