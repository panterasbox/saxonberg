/**
 * The sting — ⭐⭐ **and the whole design is that nothing here is about
 * bees.**
 *
 * A sting is a `point`-channel delivery down the same
 * `ConditionApi.inflict` path as a poisoned dart. So:
 *
 *  - bare skin takes a puncture and half a unit of venom;
 *  - **woven linen over the site stops both** — not because it is a bee
 *    veil, but because it is cloth over the place the bees go for, and
 *    the shipped covering stack attenuates a sting the way it attenuates
 *    anything else. Nobody authored a mitigation table (AC 3);
 *  - one sting is an annoyance well under venom's first band and thirty
 *    is a medical problem, and the bands do that arithmetic themselves
 *    (AC 4);
 *  - **the count is DERIVED, not drawn** — run the same disturbance twice
 *    and the same thing happens, which is how you learn what to cover.
 *
 * ⚠ And this file is where `apiculture.stingJ` is calibrated. If a veil
 * stops stopping them, that dial moved.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Colony from '../thing/Colony';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { MetabolicMixin } from '@saxonberg/server/mud/lib/metabolism/Metabolic';
import { WearableMixin } from '@saxonberg/server/mud/lib/slot/Wearable';
import { SlottableMixin } from '@saxonberg/server/mud/lib/slot/Slottable';
import { ConstructedMixin } from '@saxonberg/server/mud/lib/material/Constructed';
import { Construction } from '@saxonberg/server/mud/lib/material/Construction';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import Material from '@saxonberg/server/mud/lib/material/Material';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import BodyPlan from '@saxonberg/server/mud/platform/idea/species/BodyPlan';
import Smoker from '../thing/Smoker';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { Reserve } from '@saxonberg/server/mud/lib/reserve';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Trauma } from '@saxonberg/server/mud/platform/idea/Condition';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

/**
 * A body with hands and a head.
 *
 * ⚠⚠ **`Creature` ALREADY composes the slot family** — `Attired`,
 * `BodyPlanSlots` and `Slotted`, in that order, with `BodyPlanSlots`
 * outer so the slot universe comes from the species' body plan.
 * Re-composing `SlottedMixin` here put a bare `Slotted` back OUTSIDE
 * `BodyPlanSlots` and SHADOWED it, so the covering slots happened to
 * work and `hand:left` did not exist. *Mixins union; base classes
 * shadow* — and this is what that costs.
 */
class Keeper extends MetabolicMixin(Creature) {
  static _mixinName = 'ApicultureKeeper';
}

const Garb = WearableMixin(SlottableMixin(ConstructedMixin(Good)));
class TestGarment extends Garb {
  static _mixinName = 'ApicultureTestGarment';
}

let n = 0;
let bodyPlanPath = '';
let plan: BodyPlan;
let beeSpecies: Species;

function singleton<T extends Stuff>(path: string, factory: () => T): T {
  const found = StuffApi.findByTemplatePath<T>(path);
  if (found) return found;
  return makeStuffAtPath(factory, path);
}

/**
 * The gap ladder's sites, with a covering slot over each of the three
 * that matter: the head and the two hands.
 */
function keeperBodyPlan(): BodyPlan {
  const p = makeStuff(() => new BodyPlan());
  p.setName('apiculture-biped');
  p.setSlots([
    { name: 'head', accepts: 'WearableMixin', covers: ['body.head'] },
    {
      name: 'hands',
      accepts: 'WearableMixin',
      covers: ['body.arm.left.hand', 'body.arm.right.hand'],
    },
    { name: 'torso', accepts: 'WearableMixin', covers: ['body.torso'] },
    { name: 'hand:left', accepts: 'WieldableMixin', bodyPart: 'body.arm.left.hand' },
    { name: 'hand:right', accepts: 'WieldableMixin', bodyPart: 'body.arm.right.hand' },
  ]);
  p.setBodyParts([
    { key: 'body.torso', parent: null, tissues: [] },
    { key: 'body.head', parent: 'body.torso', tissues: [] },
    { key: 'body.arm.left', parent: 'body.torso', tissues: [] },
    { key: 'body.arm.left.hand', parent: 'body.arm.left', tissues: [] },
    { key: 'body.arm.right', parent: 'body.torso', tissues: [] },
    { key: 'body.arm.right.hand', parent: 'body.arm.right', tissues: [] },
    { key: 'body.leg.left', parent: 'body.torso', tissues: [] },
    { key: 'body.leg.right', parent: 'body.torso', tissues: [] },
  ]);
  stampTemplatePathForTest(p, bodyPlanPath);
  return p;
}

function keeper(): Keeper {
  const k = makeStuff(() => new Keeper());
  k.setSpecies(beeSpecies);
  stampTemplatePathForTest(k, `/platform/agent/Avatar/keeper-${++n}`);
  return k;
}

/** Woven linen — a veil, gloves, a smock. Whatever covers the site. */
function linen(): Material {
  return singleton('/stuff/idea/material/textile/linen-sting-test', () => {
    const m = new Material();
    m.setName('linen');
    m.setHardness(Quantity.of(20, 'MPa'));
    m.setToughness(Quantity.of(30, 'MJ/m³'));
    return m;
  });
}

function garment(slot: string): TestGarment {
  const g = makeStuff(() => new TestGarment());
  g.setSlotClaim(bodyPlanPath, [slot]);
  g.setMaterial(linen());
  g.setConstruction(Construction.of('woven'));
  return g;
}

/** A smoker that claims a hand on this test's body plan. */
function held(): Smoker {
  const s = makeStuff(() => new Smoker());
  s.setSlotClaim(bodyPlanPath, ['hand:right']);
  s.douse();
  return s;
}

/**
 * …and one that is actually going.
 *
 * ⚠ It has to be FUELLED first — `ignite` refuses `not-flammable` on an
 * empty burner, which is right and is also the one thing about a smoker
 * a beekeeper actually forgets. The ROW authors this reserve.
 */
function lit(): Smoker {
  const s = held();
  s.setReserve(
    new Reserve(
      'fuel',
      Quantity.of(100, '%'),
      Quantity.of(100, '%'),
      'combustion',
      null,
    ),
  );
  const outcome = s.ignite();
  expect(outcome.lit).toBe(true);
  return s;
}

/** A colony with a temper you can set. */
function colony(handling = 0.3): Colony {
  const c = makeStuff(() => {
    const x = new Colony();
    x.strength = 0.8;
    x.hasQueen = true;
    x.setLifecycleState('alive');
    return x;
  });
  stampTemplatePathForTest(c, `/trade/apiculture/thing/swarm-sting-${n}`);
  c.handling = handling;
  c._outsideK = 293;
  c.colonyStamp = WorldClockApi.getNow().rawValue();
  return c;
}

function punctures(k: Keeper): Trauma[] {
  return k
    .getConditions()
    .filter((c) => c.kind === 'trauma') as unknown as Trauma[];
}

function venom(k: Keeper): number {
  return (
    (k as unknown as { toxinBurdens: Record<string, number> }).toxinBurdens
      .venom ?? 0
  );
}

describe('the sting', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    singleton('/platform/idea/WorldClockRegistry', () => new WorldClockRegistry());
    WorldClockApi._setNowProviderForTesting(() => 200_000_000);
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.toPeers = () => b;
      b.send = () => {};
      return b as never;
    });
    // The veil is `woven` linen and the gloves are `hide`; a unit test
    // has no `FabricCatalogue` warm, so the fabric this file dresses
    // people in is registered by hand.
    Construction.registerFabric({
      key: 'woven',
      layerBand: 0,
      loft: 0.1,
      weaveDensity: 0.75,
      drape: 0.6,
    });
    n += 1;
    bodyPlanPath = `/stuff/idea/species/BodyPlan/apiculture-${n}`;
    plan = keeperBodyPlan();
    beeSpecies = makeStuff(() => new Species());
    beeSpecies.setBodyPlan(plan);
    stampTemplatePathForTest(beeSpecies, `/stuff/idea/species/apiculture-${n}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Construction.clearFabrics();
    WorldClockApi._resetForTesting();
  });

  it('⭐ a bare keeper working a cross colony gets stung, and takes venom', () => {
    const k = keeper();
    const c = colony(0.15);
    const report = c.disturb(k as unknown as Stuff);
    expect(report.landed).toBeGreaterThan(0);
    expect(punctures(k).length).toBe(report.landed);
    expect(punctures(k)[0]!.type).toBe('puncture');
    // Half a unit each, and venom's first band is at 3 — so one sting
    // hurts and does nothing else (AC 4).
    expect(venom(k)).toBeCloseTo(report.landed * 0.5, 6);
  });

  it('⭐⭐ AC 3 — cloth over the site stops the sting AND the venom', () => {
    const bare = keeper();
    const covered = keeper();
    covered.occupy(garment('head'), 'head');
    covered.occupy(garment('hands'), 'hands');
    covered.occupy(garment('torso'), 'torso');
    const c1 = colony(0.15);
    const c2 = colony(0.15);
    const bareReport = c1.disturb(bare as unknown as Stuff);
    const coveredReport = c2.disturb(covered as unknown as Stuff);
    expect(bareReport.landed).toBeGreaterThan(coveredReport.landed);
    // ⭐ …but not to zero: the legs are bare, and that is the lesson.
    expect(coveredReport.landed).toBeGreaterThan(0);
    // ⭐ And nothing at all reached the covered sites: the dose rides the
    // wound, so the veil that turns the sting turns the venom with it.
    for (const t of punctures(covered)) {
      expect(t.site.startsWith('body.head')).toBe(false);
      expect(t.site.endsWith('.hand')).toBe(false);
    }
    expect(venom(covered)).toBeLessThan(venom(bare));
  });

  it('⭐ AC 4 — thirty stings is a different kind of problem from one', () => {
    const one = keeper();
    const many = keeper();
    const dose = (k: Keeper, times: number): void => {
      for (let i = 0; i < times; i++) {
        (k as unknown as {
          introduceToxin(t: string, a: number): void;
        }).introduceToxin('venom', 0.5);
      }
    };
    dose(one, 1);
    dose(many, 30);
    // ⭐ One sting is well under venom's FIRST band (3): it hurts and
    // does nothing else. Thirty is past its THIRD (15), which is a
    // medical problem — and nobody authored a bee-specific severity
    // anywhere. The shipped condition's own bands do the arithmetic.
    expect(venom(one)).toBeLessThan(3);
    expect(venom(many)).toBeGreaterThanOrEqual(15);
  });

  it('⭐⭐ a lit smoker in the hand is the biggest single difference', () => {
    const bare = keeper();
    const smoked = keeper();
    const smoker = lit();
    expect(smoker.isLit()).toBe(true);
    smoked.occupy(smoker as never, 'hand:right');
    const bareReport = colony(0.15).disturb(bare as unknown as Stuff);
    const smokedReport = colony(0.15).disturb(smoked as unknown as Stuff);
    expect(smokedReport.smoked).toBe(true);
    expect(bareReport.smoked).toBe(false);
    expect(smokedReport.landed).toBeLessThan(bareReport.landed);
  });

  it('⚠ an UNLIT smoker is a tin — the colony reads the fire, not the object', () => {
    const k = keeper();
    const smoker = held();
    expect(smoker.isLit()).toBe(false);
    k.occupy(smoker as never, 'hand:right');
    expect(colony(0.15).disturb(k as unknown as Stuff).smoked).toBe(false);
  });

  it('⭐ a quiet colony hardly notices you', () => {
    const k = keeper();
    const quiet = colony(0.9);
    const report = quiet.disturb(k as unknown as Stuff);
    expect(report.landed).toBeLessThan(3);
  });

  it('⭐⭐ the count is DERIVED, not drawn — twice is twice the same', () => {
    const a = colony(0.15);
    const b = colony(0.15);
    const k1 = keeper();
    const k2 = keeper();
    // Same temper, same weather, same disturbance count, same body.
    expect(a.disturb(k1 as unknown as Stuff).landed).toBe(
      b.disturb(k2 as unknown as Stuff).landed,
    );
  });

  it('a cross colony stings more than a settled one — the temper is the term', () => {
    const cross = colony(0.1).disturb(keeper() as unknown as Stuff);
    const settled = colony(0.7).disturb(keeper() as unknown as Stuff);
    expect(cross.landed).toBeGreaterThan(settled.landed);
  });

  it('⚠ a bee dies when it stings — every landed sting costs the colony', () => {
    const c = colony(0.15);
    const before = c.getStrength();
    const report = c.disturb(keeper() as unknown as Stuff);
    expect(report.landed).toBeGreaterThan(0);
    expect(c.getStrength()).toBeLessThan(before);
  });

  it('an empty box stings nobody', () => {
    const c = makeStuff(() => new Colony());
    expect(c.disturb(keeper() as unknown as Stuff).landed).toBe(0);
  });
});
