/**
 * The bond — ⭐⭐ **regard × handling**, and the asymmetry between them.
 *
 * The thing worth pinning is not the multiplication. It is that **regard
 * does not decay and handling does**: an animal you abandoned and came
 * back to has not forgotten you, it has become harder to work with. *It
 * becomes difficult, not feral.* Every test below exists to stop that
 * being quietly turned into a single decaying "affection" number.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BondedMixin,
  FOLLOW_BOND,
  NAME_BOND,
  TRAIL_LENGTH,
} from '../Bonded';
import { HandlingMixin } from '../Handling';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { OrganismMixin } from '../../species/Organism';
import Species from '../../../platform/idea/species/Species';
import Thing from '../../stuff/Thing';
import { Idea } from '../../stuff/Idea';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
import { BulkableApi } from '../../../api/bulk';
import { StuffApi as StuffApiForDestruct } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';

/** The kept-animal shape, in the composition order `KeptAnimal` uses. */
class Animal extends BondedMixin(
  HandlingMixin(BeliefStoreMixin(OrganismMixin(Thing))),
) {}

let seq = 0;
function species(dials: {
  biddability?: number | null;
  floor?: number;
  ceiling?: number;
}): Species {
  seq += 1;
  const sp = makeStuffAtPath(
    () => new Species(),
    `/stuff/idea/species/_test/bond-${seq}`,
  ) as Species;
  if (dials.biddability !== undefined) sp.setBiddability(dials.biddability);
  if (dials.floor !== undefined && dials.ceiling !== undefined) {
    sp.setHandlingRange({ floor: dials.floor, ceiling: dials.ceiling });
  }
  return sp;
}

/** A species with only its feeding rungs declared. */
function speciesFeeding(styles: string[]): Species {
  const sp = species({});
  sp.setFeedingStyle(styles as never);
  return sp;
}

/** A scrap of something edible. */
function scrap(): Stuff {
  return {
    stuffId: 'scrap',
    getMaterial: () => ({ getEdibility: () => true }),
  } as unknown as Stuff;
}

function animal(sp?: Species): Animal {
  makeStuffAtPath(
    () => new WorldClockRegistry(),
    '/platform/idea/WorldClockRegistry',
  );
  const a = makeStuff(() => new Animal());
  if (sp) a.setSpecies(sp);
  return a;
}

function person(id: string) {
  return makeStuffAtPath(() => new Idea(), '/platform/agent/Avatar', id);
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => StuffApi.clearAll());

describe('bondWith — the two factors', () => {
  it('is regard × handling, and zero when either is', () => {
    const a = animal();
    const me = person('/platform/agent/Avatar/me');

    // Handling starts at 0.4; no regard yet.
    expect(a.bondWith(me)).toBe(0);

    a.setRegard(me, 50);
    expect(a.bondWith(me)).toBeCloseTo(0.5 * 0.4, 5);
  });

  it('⚠ dislike is NOT negative bond — it is no bond', () => {
    // An animal that dislikes you is unbonded, not anti-bonded: every
    // gate must refuse identically either way, and a negative product
    // would have made a much-disliked, much-handled animal read as
    // strongly bonded once anything squared it.
    const a = animal();
    const me = person('/platform/agent/Avatar/me');
    a.setRegard(me, -80);
    expect(a.bondWith(me)).toBe(0);
  });

  it('⭐ cooling comes from HANDLING, never from regard', () => {
    const a = animal(species({ floor: 0.15, ceiling: 0.9 }));
    const me = person('/platform/agent/Avatar/me');
    a.setRegard(me, 100);
    a.handle(1);
    const warm = a.bondWith(me);

    // Neglect: drop handling to the species floor by hand (the decay
    // path is time-driven and tested in Handling.test.ts).
    a.handling = 0.15;
    const cold = a.bondWith(me);

    expect(cold).toBeLessThan(warm);
    // ⭐⭐ THE point: it still remembers you exactly as well.
    expect(a.regardFor(me)).toBe(100);
  });
});

describe('wouldComply — deterministic, and the cat proves it', () => {
  it('a cat never complies, however devoted', () => {
    // biddability 0.1 × any bond ≤ 1 can never reach 0.5. A cat can love
    // you and still not come when called, and that is not a bug report.
    const cat = animal(species({ biddability: 0.1 }));
    const me = person('/platform/agent/Avatar/me');
    cat.setRegard(me, 100);
    cat.handling = 1;
    expect(cat.bondWith(me)).toBe(1);
    expect(cat.wouldComply(me)).toBe(false);
  });

  it('a collie complies once well bonded, and not before', () => {
    const dog = animal(species({ biddability: 0.9 }));
    const me = person('/platform/agent/Avatar/me');
    dog.setRegard(me, 100);
    dog.handling = 0.5; // half-bonded
    expect(dog.wouldComply(me)).toBe(false);
    dog.handling = 1;
    expect(dog.wouldComply(me)).toBe(true);
  });

  it('⚠ a species with NO biddability is not askable at all', () => {
    // Absent means "not in this conversation", never "average" — which
    // is what makes `lint:kept-animals` direction 2 writable.
    const thing = animal(species({}));
    const me = person('/platform/agent/Avatar/me');
    thing.setRegard(me, 100);
    thing.handling = 1;
    expect(thing.wouldComply(me)).toBe(false);
  });

  it('is a pure function of the two dials — never a roll', () => {
    const dog = animal(species({ biddability: 0.9 }));
    const me = person('/platform/agent/Avatar/me');
    dog.setRegard(me, 80);
    dog.handling = 0.8;
    const answers = new Set(
      Array.from({ length: 50 }, () => dog.wouldComply(me)),
    );
    expect(answers.size).toBe(1);
  });
});

describe('home moves by being fed there, over DAYS', () => {
  it('moves on the third distinct game day and not the second', () => {
    const a = animal();
    a.creditHomeCandidate('/test/lane', 1);
    a.creditHomeCandidate('/test/lane', 1); // same day — does not count
    expect(a.getHome()).toBe('');
    a.creditHomeCandidate('/test/lane', 2);
    expect(a.getHome()).toBe('');
    a.creditHomeCandidate('/test/lane', 3);
    expect(a.getHome()).toBe('/test/lane');
  });

  it('⚠ a different room RESTARTS the count', () => {
    const a = animal();
    a.creditHomeCandidate('/test/lane', 1);
    a.creditHomeCandidate('/test/lane', 2);
    a.creditHomeCandidate('/test/yard', 3);
    a.creditHomeCandidate('/test/yard', 4);
    expect(a.getHome()).toBe('');
  });
});

describe('the naming gate', () => {
  it('remembers who it has followed home, once each', () => {
    const a = animal();
    const me = person('/platform/agent/Avatar/me');
    a.rememberFollowed(me);
    a.rememberFollowed(me);
    expect(a.getFollowedKeys()).toEqual(['/platform/agent/Avatar/me']);
  });

  it('NAME_BOND is a higher bar than FOLLOW_BOND', () => {
    // Following is what earns the right to name; naming must cost more
    // than the thing that unlocks it, or the two collapse.
    expect(NAME_BOND).toBeGreaterThan(FOLLOW_BOND);
  });
});

describe('composition', () => {
  it('is Bonded, and a bare Thing is not', () => {
    expect(MixinApi.isBonded(animal())).toBe(true);
    expect(MixinApi.isBonded(makeStuff(() => new Thing()))).toBe(false);
  });
});

/* ────────────────────────────────────────────────────────────────────
 * ⚠⚠ THE LADDER — and the test that would have caught the dead loop.
 * ──────────────────────────────────────────────────────────────────── */

describe('⚠⚠ the ladder has a bottom rung', () => {
  /**
   * ⭐ The credit correctly happens only AFTER a real meal — an animal
   * that did not eat must not get more tractable. So the swallow itself
   * is stubbed (digestion has its own suite) and what is under test is
   * the CREDIT SPLIT: which factor a meal moves, and whose.
   */
  beforeEach(() => {
    // The scrap is a stub, not a composed Tangible; `eatFood` reads its
    // material through the narrow.
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true as never);
    vi.spyOn(BulkableApi, 'ingestSolid').mockReturnValue(999);
    vi.spyOn(StuffApiForDestruct, 'destruct').mockResolvedValue(undefined as never);
  });
  afterEach(() => vi.restoreAllMocks());

  /**
   * **The bug this exists for.** The cat ships at `handling 0.25`
   * (flighty). `pet` refuses below `wary` (0.40). `offer` below the band
   * set the food down and returned before crediting anything. And
   * `KeptAnimal` composes no `HandledMixin`, so ranching's `handle` verb
   * cannot reach it.
   *
   * ⭐ So handling could only DECAY, and **the cat was untameable** — the
   * one thing the build exists for. Every suite was green, because the
   * collie ships at 0.55 and was already over the line. The drive
   * asserted that `pet` refuses and never that the refusal can LIFT: it
   * tested the closed door and called it a feature.
   */
  it('⭐ a meal nobody handed over raises handling', async () => {
    const a = animal(species({ biddability: 0.1, floor: 0.15, ceiling: 0.9 }));
    a.handling = 0.25;
    await a.eatFood(scrap(), null);
    expect(a.getHandling()).toBeGreaterThan(0.25);
  });

  it('⚠ and earns NOBODY any regard — the floor is delegable', async () => {
    const a = animal();
    const friend = person('/platform/agent/Avatar/friend');
    a.handling = 0.25;
    await a.eatFood(scrap(), null);
    // Somebody kept it alive and approachable and won none of it.
    expect(a.regardFor(friend)).toBe(0);
  });

  it('⭐⭐ a stray fed from the ground REACHES the band a hand needs', () => {
    // The whole loop, closed: enough meals and the refusal lifts. Before
    // the bottom rung existed this number never moved.
    const a = animal(species({ biddability: 0.1, floor: 0.15, ceiling: 0.9 }));
    a.handling = 0.25;
    for (let i = 0; i < 40; i++) a.handle(0.25);
    expect(a.getHandling()).toBeGreaterThanOrEqual(0.4);
  });

  it('a hand feeds it AND wins it — both factors, one act', async () => {
    const a = animal();
    const me = person('/platform/agent/Avatar/me2');
    a.handling = 0.5;
    const before = a.getHandling();
    await a.eatFood(scrap(), me);
    expect(a.getHandling()).toBeGreaterThan(before);
    expect(a.regardFor(me)).toBeGreaterThan(0);
  });
});

describe('⭐⭐ offerRung — how it answers a held-out hand', () => {
  const cat = () => species({ biddability: 0.1, floor: 0.15, ceiling: 0.9 });
  const known = (a: Animal, p: Stuff) => a.adjustRegard(p, 10);

  it('a steady animal takes from any hand', () => {
    const a = animal(speciesFeeding(['hand', 'ground']));
    a.handling = 0.7;
    expect(a.offerRung(person('/platform/agent/Avatar/x'))).toBe('hand');
  });

  it('a wary one takes from a hand it KNOWS, and comes to one it does not', () => {
    const a = animal(speciesFeeding(['hand', 'ground']));
    a.handling = 0.5;
    const stranger = person('/platform/agent/Avatar/s');
    const friend = person('/platform/agent/Avatar/f');
    known(a, friend);
    expect(a.offerRung(stranger)).toBe('approach');
    expect(a.offerRung(friend)).toBe('hand');
  });

  it('a flighty one comes to a hand it knows if it keeps still; a stranger sets it down', () => {
    const a = animal(speciesFeeding(['hand', 'ground']));
    a.handling = 0.3;
    const stranger = person('/platform/agent/Avatar/s');
    const friend = person('/platform/agent/Avatar/f');
    known(a, friend);
    expect(a.offerRung(stranger)).toBe('after-you-go');
    expect(a.offerRung(friend)).toBe('approach');
  });

  it('a wild one: on the floor, whoever you are', () => {
    const a = animal(speciesFeeding(['hand', 'ground']));
    a.handling = 0.1;
    const friend = person('/platform/agent/Avatar/f');
    known(a, friend);
    expect(a.offerRung(friend)).toBe('after-you-go');
  });

  it('⚠ somebody who made it ill is a stranger again, whatever the band', () => {
    const a = animal(speciesFeeding(['hand', 'ground']));
    a.handling = 0.9;
    const poisoner = person('/platform/agent/Avatar/p');
    a.adjustRegard(poisoner, -25);
    expect(a.offerRung(poisoner)).toBe('after-you-go');
  });

  it('⭐ a species with no hand rung never takes from one — a hopper bird', () => {
    const a = animal(speciesFeeding(['hopper']));
    a.handling = 0.8;
    expect(a.offerRung(person('/platform/agent/Avatar/x'))).toBe('after-you-go');
  });

  it('is a pure function of the dials — never a roll', () => {
    const a = animal(cat());
    a.handling = 0.5;
    const p = person('/platform/agent/Avatar/x');
    const first = a.offerRung(p);
    for (let i = 0; i < 20; i++) expect(a.offerRung(p)).toBe(first);
  });
});

describe('⭐ feelsSafeToEatAmong — the step-back rule', () => {
  it('a steady animal eats in front of anyone', () => {
    const a = animal();
    a.handling = 0.7;
    expect(a.feelsSafeToEatAmong([person('/platform/agent/Avatar/s')])).toBe(true);
  });

  it('a wary one waits while a stranger is in the room, and eats among people it knows', () => {
    const a = animal();
    a.handling = 0.5;
    const stranger = person('/platform/agent/Avatar/s');
    const friend = person('/platform/agent/Avatar/f');
    a.adjustRegard(friend, 10);
    expect(a.feelsSafeToEatAmong([stranger])).toBe(false);
    expect(a.feelsSafeToEatAmong([friend])).toBe(true);
    expect(a.feelsSafeToEatAmong([friend, stranger])).toBe(false);
    expect(a.feelsSafeToEatAmong([])).toBe(true);
  });
});

describe('⭐⭐ need paces the bond', () => {
  beforeEach(() => {
    vi.spyOn(MixinApi, 'isTangible').mockReturnValue(true as never);
    vi.spyOn(BulkableApi, 'ingestSolid').mockReturnValue(999);
    vi.spyOn(StuffApiForDestruct, 'destruct').mockResolvedValue(undefined as never);
  });
  afterEach(() => vi.restoreAllMocks());

  function withSatiation(a: Animal, level: number): void {
    vi.spyOn(MixinApi, 'isReserved').mockReturnValue(true as never);
    (a as unknown as { getReserve: unknown }).getReserve = () => ({
      current: { rawValue: () => level },
    });
  }

  it.each([
    [0, 10, 'starving: the whole of it'],
    [35, 5, 'half: half'],
    [69, 0, 'nearly full: nothing'],
  ])('satiation %i → +%i regard (%s)', async (level, gain) => {
    const a = animal();
    const me = person('/platform/agent/Avatar/me');
    withSatiation(a, level);
    await a.eatFood(scrap(), me);
    expect(a.regardFor(me)).toBe(gain);
  });

  it('⚠ being made ill costs the same however hungry it was', async () => {
    const a = animal();
    const me = person('/platform/agent/Avatar/me');
    withSatiation(a, 69);
    vi.spyOn(MixinApi, 'isContaminable').mockReturnValue(true as never);
    const bad = Object.assign(scrap(), { getPathogenLoads: () => ({ x: 1 }) });
    await a.eatFood(bad, me);
    expect(a.regardFor(me)).toBe(-25);
  });

  it('isHungry is below HUNGRY_SATIATION, and never for an animal with no reserve', () => {
    const a = animal();
    expect(a.isHungry()).toBe(false);
    withSatiation(a, 39);
    expect(a.isHungry()).toBe(true);
    withSatiation(a, 40);
    expect(a.isHungry()).toBe(false);
  });
});

describe('feeding style — the rungs a species has', () => {
  it('⭐⭐ a canary has no hand rung, and it never lifts', () => {
    const bird = animal(speciesFeeding(['hopper']));
    expect(bird.feedsBy('hopper')).toBe(true);
    expect(bird.feedsBy('hand')).toBe(false);
    expect(bird.feedsBy('ground')).toBe(false);
  });

  it('a cat has bowl, ground and hand', () => {
    const cat = animal(speciesFeeding(['bowl', 'ground', 'hand']));
    for (const s of ['bowl', 'ground', 'hand'] as const) {
      expect(cat.feedsBy(s)).toBe(true);
    }
    expect(cat.feedsBy('trough')).toBe(false);
  });

  it('⚠ a species declaring none feeds by no modelled way', () => {
    // Absent is "not in this conversation", the same rule as the dials.
    const wolf = animal(species({}));
    expect(wolf.feedsBy('ground')).toBe(false);
  });

  it('refuses an unknown rung rather than dropping it silently', () => {
    const sp = species({});
    expect(() =>
      sp.setFeedingStyle(['nibble' as never]),
    ).toThrow(/not a feeding style/);
  });
});

describe('the trail — how it knows the way back', () => {
  it('remembers where it has been, oldest first', () => {
    const a = animal();
    a.rememberPlace('/test/a');
    a.rememberPlace('/test/b');
    expect(a.getTrail()).toEqual(['/test/a', '/test/b']);
  });

  it('does not repeat the place it is already standing in', () => {
    const a = animal();
    a.rememberPlace('/test/a');
    a.rememberPlace('/test/a');
    expect(a.getTrail()).toEqual(['/test/a']);
  });

  it('⭐ walking in a circle FORGETS the circle', () => {
    // Revisiting a remembered place rewinds to it: you did not really
    // go anywhere, so there is nothing extra to find your way back from.
    const a = animal();
    for (const p of ['/test/a', '/test/b', '/test/c']) a.rememberPlace(p);
    a.rememberPlace('/test/a');
    expect(a.getTrail()).toEqual(['/test/a']);
  });

  it('⭐ arriving home clears it outright', () => {
    const a = animal();
    a.setHome('/test/home');
    a.rememberPlace('/test/a');
    a.rememberPlace('/test/home');
    expect(a.getTrail()).toEqual([]);
  });

  it('⚠ is capped — a week lost must not beat stepping out this morning', () => {
    const a = animal();
    for (let i = 0; i < TRAIL_LENGTH + 10; i++) a.rememberPlace(`/test/r${i}`);
    expect(a.getTrail()).toHaveLength(TRAIL_LENGTH);
    // The OLDEST are dropped: it forgets the far end, not the near one.
    expect(a.getTrail()[0]).not.toBe('/test/r0');
  });
});
