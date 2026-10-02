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
  // ⚠⚠ **The species warm is NOT here any more, and its absence is
  // asserted rather than assumed.**
  //
  // This file's reason for existing is the pets-build defect: the warm
  // (and the home seed) sat on `Bonded.postRegister`, which never ran on
  // a live animal because the marker mixin above it swallowed the chain.
  // Both halves were therefore pinned here, through the SHIPPED stack.
  //
  // The hydration build moved the warm OFF the hook (2026-10-01): warming
  // a shared `Species` row somebody else authored is not hydration —
  // nothing is remembered about this instance and there is no capture
  // side — so it belongs beside the reads that need it, where
  // `preloadAnatomy`'s nine other callers already put it. The readers are
  // `offer`, `call`, `stay`, `pet` and the deliberation beat, and the
  // positive assertions that the DIALS read live in `Bonded.test.ts`.
  //
  // ⭐ This case inverts rather than disappears, because "the hook warms
  // the species" silently coming back is a regression worth catching: it
  // would mean the limb crept back onto the lifecycle.
  it('⭐⭐ does NOT warm its species — that limb moved to the readers', async () => {
    const cat = makeStuffAtPath(() => new KeptAnimal(), '/test/agent/cat');
    await cat.onCreate();
    expect(SpeciesApi.preloadAnatomy).not.toHaveBeenCalled();
  });

  it('⭐⭐ but the hook STILL reaches Bonded through the whole shipped stack', async () => {
    // The thing this file actually guards, now carried by the limbs that
    // stayed: the hook has to reach `Bonded` at all. `home` and
    // born-hungry are both `Bonded.onCreate`'s, so either of the two
    // cases below failing means the chain is broken again — which is the
    // defect, not the warm specifically.
    const lane = makeStuff(() => new Room());
    const cat = makeStuffAtPath(() => new KeptAnimal(), '/test/agent/cat');
    ContainmentApi.move(cat, lane);
    await cat.onCreate();
    expect(cat.getHome()).toBe('/test/world/Lane');
    expect(cat.isHungry()).toBe(true);
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
