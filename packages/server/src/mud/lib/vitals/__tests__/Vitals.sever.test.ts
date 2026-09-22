/**
 * The sever — `VitalsMixin.severPart`, the one writer of
 * `BodyPartDelta.missing`, which shipped as a persisted field nothing ever
 * set.
 *
 * What is pinned here:
 *
 * - the **subtree** goes, not the part (sever the arm, lose the hand);
 * - what the part **held falls** — the slot is vacated and the occupant
 *   lands wherever the body is;
 * - it **persists** through a capture/materialize round-trip, which is what
 *   makes "log out and back in; it is still missing" true;
 * - ⭐ a **vetoed** avulsion severs nothing (D1's whole point — the onset
 *   now runs after `afflict` has accepted the wound).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Thing from '../../stuff/Thing';
import { SlottableMixin } from '../../slot/Slottable';
import { ContainerMixin } from '../../spatial/Container';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import {
  AVULSION_BEHAVIOR,
  HARM_DEFAULTS,
  type Trauma,
} from '../../../platform/idea/Condition';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';

const SlottableThingBase = SlottableMixin(Thing);
class SlottableThing extends SlottableThingBase {}

const ContainerThingBase = ContainerMixin(Thing);
class Room extends ContainerThingBase {}

/** A Creature with an arm, a hand under it, and a grip slot on the hand. */
function armedCreature(): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    { name: 'grip', accepts: 'SlottableMixin', bodyPart: 'body.arm.left.hand' },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 }],
    },
    {
      key: 'body.arm.left',
      parent: 'body.torso',
      severable: true,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 3 }],
    },
    {
      key: 'body.arm.left.hand',
      parent: 'body.arm.left',
      severable: true,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 0.4 }],
    },
    {
      key: 'body.torso.heart',
      parent: 'body.torso',
      governs: ['heartRate'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 0.3 }],
    },
  ]);
  stampTemplatePathForTest(plan, '/stuff/idea/species/BodyPlan/test-biped');

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, '/stuff/idea/species/test/armed');

  const creature = makeStuff(() => new Creature());
  creature.setSpecies(species);
  return creature;
}

function avulsionAt(site: string, severity: number): Trauma {
  return { kind: 'trauma', type: 'avulsion', site, severity };
}

describe('VitalsMixin — severPart', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('takes the part AND every descendant', () => {
    const creature = armedCreature();

    creature.severPart('body.arm.left');

    const missing = creature.getMissingParts().map((p) => p.key).sort();
    expect(missing).toEqual(['body.arm.left', 'body.arm.left.hand']);
    // Nothing above it goes — a lost arm is not a lost torso.
    expect(creature.getPart('body.torso')?.missing).toBe(false);
  });

  it('releases what the lost slot was holding, onto the floor', () => {
    const room = makeStuff(() => new Room());
    const creature = armedCreature();
    const sword = makeStuff(() => new SlottableThing());
    ContainmentApi.move(creature, room);
    ContainmentApi.move(sword, room);
    creature.occupy(sword, 'grip');
    expect(creature.getOccupant('grip')).toBe(sword);

    creature.severPart('body.arm.left.hand');

    // ⭐ The shipped `canOccupy` gate only ever refused NEW occupancy — a
    // severed hand kept its sword. It does not any more.
    expect(creature.getOccupant('grip')).toBeNull();
    expect(sword.getContainer()).toBe(room);
  });

  it('severing the arm also drops what the hand under it held', () => {
    const room = makeStuff(() => new Room());
    const creature = armedCreature();
    const sword = makeStuff(() => new SlottableThing());
    ContainmentApi.move(creature, room);
    ContainmentApi.move(sword, room);
    creature.occupy(sword, 'grip');

    creature.severPart('body.arm.left');

    expect(creature.getOccupant('grip')).toBeNull();
  });

  it('is idempotent, and ignores a part the plan does not have', () => {
    const creature = armedCreature();
    creature.severPart('body.arm.left.hand');
    creature.severPart('body.arm.left.hand');
    creature.severPart('body.wing.left');
    expect(creature.getMissingParts().map((p) => p.key)).toEqual([
      'body.arm.left.hand',
    ]);
  });

  it('survives a persistence round-trip — the loss is not runtime-only', () => {
    const creature = armedCreature();
    creature.severPart('body.arm.left.hand');

    // `bodyPartDeltas` is `{persistent, runtimeState}`, so the capture the
    // login path uses carries it. Assert the SHAPE that rides — serialize
    // it, wipe the live state as a logout would, and restore.
    const captured = JSON.parse(
      JSON.stringify(creature.bodyPartDeltas),
    ) as Record<string, { missing?: boolean }>;
    expect(captured['body.arm.left.hand']?.missing).toBe(true);

    creature.bodyPartDeltas = {};
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(false);

    creature.bodyPartDeltas = captured;
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
    expect(creature.isSlotDisabledByAnatomy('grip')).toBe(true);
  });

  it('a missing leg costs the limp even with no wound left', () => {
    // The limp sums WOUND severity, and a severed part carries none — so
    // without the missing-part term a body walks off a lost leg.
    const plan = makeStuff(() => new BodyPlan());
    plan.setName('test-walker');
    plan.setBodyParts([
      {
        key: 'body.torso',
        parent: null,
        tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 }],
      },
      {
        key: 'body.leg.left',
        parent: 'body.torso',
        severable: true,
        serves: ['locomotion'],
        tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 9 }],
      },
      {
        key: 'body.leg.left.foot',
        parent: 'body.leg.left',
        severable: true,
        tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 1 }],
      },
    ]);
    stampTemplatePathForTest(plan, '/stuff/idea/species/BodyPlan/test-walker');
    const species = makeStuff(() => new Species());
    species.setBodyPlan(plan);
    stampTemplatePathForTest(species, '/stuff/idea/species/test/walker');
    const creature = makeStuff(() => new Creature());
    creature.setSpecies(species);

    const before = creature.getReserve('endurance')?.current.rawValue() ?? 0;
    creature.severPart('body.leg.left');
    creature.drainForLimp();
    const after = creature.getReserve('endurance')?.current.rawValue() ?? 0;

    // ⭐ The ONLY leg is gone, so the `locomotion` capacity is zero and the
    // shortfall is total. (The plan below authors one leg; a biped losing
    // one of two would cost half this.)
    expect(before - after).toBeCloseTo(
      HARM_DEFAULTS.LIMP_DRAIN_PER_SEVERITY * HARM_DEFAULTS.LIMP_SHORTFALL_SCALE,
      5,
    );
  });
});

describe('AVULSION_BEHAVIOR — the sever gate', () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it('severs at or above SEVER_SEVERITY on a severable part', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', HARM_DEFAULTS.SEVER_SEVERITY);
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
  });

  it('does NOT sever below the threshold — a severe wound is still a wound', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', HARM_DEFAULTS.SEVER_SEVERITY - 0.5);
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(false);
    // …and it still bleeds like the severe laceration it is.
    expect(t.bleeding).toBe(true);
  });

  it('does NOT sever an unseverable part however bad the wound', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.torso', 99);
    AVULSION_BEHAVIOR.onset(creature, t);
    // ⭐ You cannot lop off somebody's chest. `severable` is authored on
    // limbs and the head, and this is its first production reader.
    expect(creature.getPart('body.torso')?.missing).toBe(false);
  });

  it('floors severity to AVULSION_SEVERITY_FLOOR before the sever gate', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', 0.1);
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(t.severity).toBe(HARM_DEFAULTS.AVULSION_SEVERITY_FLOOR);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(false);
  });

  it('⭐⭐ does NOT sever when the blow was not authorized to maim', () => {
    // A non-lethal fight sets `maimAllowed: false`. The wound is exactly
    // as severe; it simply does not take the part. The severe avulsion
    // stays — grievously wounded, not maimed.
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', HARM_DEFAULTS.SEVER_SEVERITY);
    t.maimAllowed = false;
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(false);
    expect(t.bleeding).toBe(true);
  });

  it('⭐ severs when maiming IS authorized (a cull, a hazard, a lethal fight)', () => {
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', HARM_DEFAULTS.SEVER_SEVERITY);
    t.maimAllowed = true;
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
  });

  it('⚠ undefined maimAllowed severs — the environmental default is YES', () => {
    // A fall onto spikes, a mine cave-in: nature does not ask consent.
    // Only combat sets the flag; everything else leaves it unset.
    const creature = armedCreature();
    const t = avulsionAt('body.arm.left.hand', HARM_DEFAULTS.SEVER_SEVERITY);
    expect(t.maimAllowed).toBeUndefined();
    AVULSION_BEHAVIOR.onset(creature, t);
    expect(creature.getPart('body.arm.left.hand')?.missing).toBe(true);
  });
});

/* ─────────── the anatomy death floor (a severed head is lethal) ─────────── */

import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';

let headedSeq = 0;
/** A body whose head is severable and whose brain governs consciousness. */
function headedCreature(): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-headed');
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 }],
    },
    {
      key: 'body.head',
      parent: 'body.torso',
      severable: true,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 1 }],
    },
    {
      key: 'body.head.brain',
      parent: 'body.head',
      governs: ['consciousness'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 1.3 }],
    },
    {
      key: 'body.arm.left',
      parent: 'body.torso',
      severable: true,
      serves: ['manipulation'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/muscle', mass: 3 }],
    },
  ]);
  const id = headedSeq++;
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/test-headed-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/headed-${id}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  c.setLifecycleState('alive');
  return c;
}

describe('the anatomy death floor', () => {
  // The clock idiom from Vitals.dying-disconnect: the provider returns a
  // wall-ms `real`, and the shipped 12× scale turns it into game-seconds.
  const SCALE = 12;
  let real = 100000;
  const advance = (c: Creature, gameSec: number): void => {
    real += (gameSec / SCALE) * 1000;
    c.getConditions();
  };
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    // ⚠ NOT `StuffApi.clearAll()` — that wipes the WorldClockRegistry
    // singleton the import registered, and the reconcile's clock guard
    // then early-returns before the anatomy floor. The disconnect test
    // avoids clearAll for the same reason; unique fixture paths keep the
    // few leaked creatures from colliding.
    WorldClockApi._resetForTesting();
  });

  it('⭐⭐ a severed head is LETHAL — the body dies, of decerebration', () => {
    // Brain gone means no breathing drive and no airway; "unconscious"
    // was the shipped answer and it left a decapitated body beating away
    // forever. And it fires with NO other wound — the head clotted, no
    // active condition — which is why the floor sits above the all-empty
    // guard.
    const c = headedCreature();
    c.severPart('body.head');
    c.getConditions(); // reconcile-on-read → the floor opens the window
    expect(c.isDying()).toBe(true);

    advance(c, 1); // seed the dying tick
    advance(c, HARM_DEFAULTS.VITAL_ORGAN_LOSS_DYING_WINDOW_SEC + 5);
    expect(c.getLifecycleState()).toBe('dead');
    expect(c.getCauseOfDeath()).toBe('decerebration');
  });

  it('⭐ …but the window is real — inside it, the body is dying, not dead', () => {
    // The two-stage discipline: a bystander could still act in the beat.
    const c = headedCreature();
    c.severPart('body.head');
    c.getConditions();
    expect(c.isDying()).toBe(true);

    advance(c, 1);
    advance(c, HARM_DEFAULTS.VITAL_ORGAN_LOSS_DYING_WINDOW_SEC - 10);
    expect(c.getLifecycleState()).not.toBe('dead');
    expect(c.getDyingRemainingSec() ?? 0).toBeGreaterThan(0);
  });

  it('⚠ losing a non-vital part is NOT lethal — a hand governs nothing vital', () => {
    const c = headedCreature();
    c.severPart('body.arm.left');
    c.getConditions();
    expect(c.isDying()).toBe(false);
  });

  it('⭐⭐ death clears the anatomy → a revived body is not re-killed', () => {
    // The bricking guard. Without `resetAnatomyToSpeciesBaseline`, a
    // reembodied player would arrive headless and the floor would fire
    // again on the first read — dead on arrival, forever.
    const c = headedCreature();
    c.severPart('body.head');
    expect(c.getMissingParts().length).toBeGreaterThan(0);

    c.resetAnatomyToSpeciesBaseline();
    expect(c.getMissingParts()).toEqual([]);
    c.getConditions();
    expect(c.isDying()).toBe(false);
  });

  it('⚠ an untouched body never walks the plan for this — the delta guard', () => {
    // A body with no deltas reads whole and never begins dying from
    // anatomy, however many times it reconciles.
    const c = headedCreature();
    c.getConditions();
    c.getConditions();
    expect(c.isDying()).toBe(false);
  });
});
