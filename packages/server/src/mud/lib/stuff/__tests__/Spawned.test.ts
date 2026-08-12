/**
 * SpawnedMixin tests — the held side of the substrate.
 *
 * Covers the R2.3 self-heal getter and the basic setter/getter
 * round-trip. R2.4 cleanup is in `Spawner.cleanup.test.ts`.
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

describe('SpawnedMixin', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('registers in the mixin registry under Mixins.Spawned', () => {
    const baby = makeStuff(() => new Hatchling());
    expect(MixinApi.isSpawned(baby)).toBe(true);
    expect(MixinApi.hasMixin(baby, Mixins.Spawned)).toBe(true);
  });

  it('getSpawner / setSpawner round-trip', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());
    baby.setSpawner(nest);
    expect(baby.getSpawner()).toBe(nest);
    baby.setSpawner(null);
    expect(baby.getSpawner()).toBeNull();
  });

  it('R2.3 self-heal: getSpawner returns null when the Spawner is destroyed', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());
    baby.setSpawner(nest);

    StuffApi.destruct(nest);

    // Spawner is destroyed. The first read self-heals to null AND
    // clears the slot so subsequent reads are idempotent.
    expect(baby.getSpawner()).toBeNull();
    // Idempotent.
    expect(baby.getSpawner()).toBeNull();
  });
});
