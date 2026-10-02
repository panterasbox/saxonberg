/**
 * ⚠⚠ `onCreate` must REACH `Bonded` through the real `KeptAnimal` stack.
 *
 * The shipped defect this pins: `PostRegistrationMixin.onCreate` (the hook
 * was `postRegister`, the mixin retired 2026-10-01) was a terminal no-op
 * that never called `super`. Composed between `Behaved` and `Bonded` — as
 * it shipped — every layer inside it was shadowed: `Bonded.onCreate` never
 * ran on a live animal, so no home was seeded and (once the species
 * preload lived there) no species was warmed. Every unit test called
 * `Bonded.onCreate` on a fixture that composed no marker layer above it,
 * and every live assertion was refusal-shaped, so nothing could see it.
 * Found live: `offer` to a cat answered `no-hand-rung` because
 * `getSpecies()` was null. The hook is a terminal on `Stuff` now, so the
 * failure class is structurally gone — this test keeps the chain honest.
 *
 * This test composes the SHIPPED class and walks the chain.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KeptAnimal } from '../KeptAnimal';
import { Idea } from '../../stuff/Idea';
import { ContainerMixin } from '../../spatial/Container';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { SpeciesApi } from '../../../api/species';
import { PersistableApi } from '../../../api/persistable';
import { ContainmentApi } from '../../../api/containment';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { BORN_HUNGRY_SATIATION } from '../../husbandry/Bonded';

class Room extends ContainerMixin(Idea) {}

beforeEach(() => {
  StuffApi.clearAll();
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  vi.spyOn(SpeciesApi, 'preloadAnatomy').mockResolvedValue(undefined);
  vi.spyOn(PersistableApi, 'placeIdOf').mockReturnValue('/test/world/Lane');
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('KeptAnimal.onCreate reaches Bonded', () => {
  it('⭐⭐ warms its species — through the whole shipped stack', async () => {
    const cat = makeStuffAtPath(() => new KeptAnimal(), '/test/agent/cat');
    await cat.onCreate();
    expect(SpeciesApi.preloadAnatomy).toHaveBeenCalledWith(cat);
  });

  it('and seeds home when it is born somewhere', async () => {
    const lane = makeStuff(() => new Room());
    const cat = makeStuffAtPath(() => new KeptAnimal(), '/test/agent/cat');
    ContainmentApi.move(cat, lane);
    await cat.onCreate();
    expect(cat.getHome()).toBe('/test/world/Lane');
  });

  it('⭐ an UNKEPT animal is born hungry — a thin stray wants a meal', async () => {
    const cat = makeStuffAtPath(() => new KeptAnimal(), '/test/agent/cat');
    expect(cat.getSatiation().current.rawValue()).toBe(100);
    await cat.onCreate();
    expect(cat.getSatiation().current.rawValue()).toBeCloseTo(BORN_HUNGRY_SATIATION, 5);
    expect(cat.isHungry()).toBe(true);
  });
});
