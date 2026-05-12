/**
 * Spawner / Spawned R2.4 cleanup tests.
 *
 * Covers:
 *  - Spawned destruct unhooks from Spawner._spawned (R2.4 symmetric
 *    cleanup, dispatched by the mixin-registry walk).
 *  - Default Spawner destruct does NOT cascade to spawns (spawns
 *    survive, getSpawner() self-heals to null).
 *  - Author opt-in cascade: subclass overrides onDestruct to
 *    destruct each tracked spawn before chaining super.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { Idea } from '../Idea';
import type { Stuff } from '../Stuff';
import { SpawnerMixin, type Spawner } from '../Spawner';
import { SpawnedMixin, type Spawned } from '../Spawned';
import { makeStuff } from '../../security/__tests__/test-setup';

class Nest extends SpawnerMixin(Idea) {}
class Hatchling extends SpawnedMixin(Idea) {}

describe('Spawner / Spawned cleanup', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('R2.4: Spawned destruct unhooks from Spawner._spawned', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());
    nest.trackSpawn(baby);
    expect(nest.hasSpawned(baby)).toBe(true);

    StuffApi.destruct(baby);

    expect(nest.hasSpawned(baby)).toBe(false);
    expect(nest.getSpawned().size).toBe(0);
  });

  it('default: Spawner destruct does NOT cascade to spawns', () => {
    const nest = makeStuff(() => new Nest());
    const a = makeStuff(() => new Hatchling());
    const b = makeStuff(() => new Hatchling());
    nest.trackSpawn(a);
    nest.trackSpawn(b);

    StuffApi.destruct(nest);

    // Spawns survive the parent's destruct.
    expect(a.isDestroyed()).toBe(false);
    expect(b.isDestroyed()).toBe(false);
    // Back-pointer self-heals to null on the next read.
    expect(a.getSpawner()).toBeNull();
    expect(b.getSpawner()).toBeNull();
  });

  it('author opt-in cascade via onDestruct override', () => {
    // Subclasses that WANT cascade-destruct override onDestruct and
    // walk getSpawned() before chaining super. This is the
    // documented extension site (see slate ⚠ SPAWNER-Q1).
    class CascadingNest extends SpawnerMixin(Idea) {
      override onDestruct(): void {
        for (const child of [...this.getSpawned()]) {
          StuffApi.destruct(child as unknown as Stuff);
        }
        super.onDestruct();
      }
    }
    const nest = makeStuff(() => new CascadingNest());
    const a = makeStuff(() => new Hatchling());
    const b = makeStuff(() => new Hatchling());
    nest.trackSpawn(a);
    nest.trackSpawn(b);

    StuffApi.destruct(nest);

    expect(a.isDestroyed()).toBe(true);
    expect(b.isDestroyed()).toBe(true);
    expect(nest.isDestroyed()).toBe(true);
  });

  it('trackSpawn writes both sides; untrackSpawn clears both sides', () => {
    const nest = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());

    nest.trackSpawn(baby);
    expect(baby.getSpawner()).toBe(nest);
    expect(nest.hasSpawned(baby)).toBe(true);

    nest.untrackSpawn(baby);
    expect(baby.getSpawner()).toBeNull();
    expect(nest.hasSpawned(baby)).toBe(false);
  });

  it('singular-Spawner invariant: re-tracking transfers ownership atomically', () => {
    // Hand-off scenario (e.g., a recruiter steals a wild monster).
    // `trackSpawn` on the new owner auto-untracks from the previous
    // owner so the previous collection doesn't silently leak the
    // entry and R2.4 cleanup remains correct.
    const nestA = makeStuff(() => new Nest());
    const nestB = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());

    nestA.trackSpawn(baby);
    expect(nestA.hasSpawned(baby)).toBe(true);

    nestB.trackSpawn(baby);
    // Ownership has fully transferred.
    expect(baby.getSpawner()).toBe(nestB);
    expect(nestB.hasSpawned(baby)).toBe(true);
    // A's collection no longer contains baby — auto-untrack ran.
    expect(nestA.hasSpawned(baby)).toBe(false);
  });

  it('destruct after ownership transfer cleans the new owner (not the old)', () => {
    // Regression for the pre-auto-untrack bug: if baby destructed
    // while A still listed it, A's collection would leak the dead
    // entry because R2.4 cleanup only consults baby.getSpawner().
    const nestA = makeStuff(() => new Nest());
    const nestB = makeStuff(() => new Nest());
    const baby = makeStuff(() => new Hatchling());

    nestA.trackSpawn(baby);
    nestB.trackSpawn(baby); // auto-untracks from nestA

    StuffApi.destruct(baby);

    expect(nestB.hasSpawned(baby)).toBe(false);
    expect(nestA.hasSpawned(baby)).toBe(false);
  });

  // Silence unused-import warnings when test refactors strip Stuff
  // imports — references kept here so the file imports stay tidy.
  void ([] as unknown as Spawner);
  void ([] as unknown as Spawned);
});
