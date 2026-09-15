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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BondedMixin, FOLLOW_BOND, NAME_BOND } from '../Bonded';
import { HandlingMixin } from '../Handling';
import { BeliefStoreMixin } from '../../belief/BeliefStore';
import { OrganismMixin } from '../../species/Organism';
import Species from '../../../platform/idea/species/Species';
import Thing from '../../stuff/Thing';
import { Idea } from '../../stuff/Idea';
import WorldClockRegistry from '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { MixinApi } from '../../../api/mixin';
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
