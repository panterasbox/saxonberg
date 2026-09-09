/**
 * ⭐⭐ The combat-side couplings — including **the edge W1 closed.**
 *
 * The fight already had a rich set of edges: poise band → blow energy,
 * focus-fire → erosion, endurance → how much poise you can buy back.
 * Exactly one was missing, and it is the one the whole consequence build
 * turns on: **a landed wound did not touch the poise of the fighter it
 * landed on.** Getting cut cost you nothing tactically; the fight was
 * decided by pressure alone, with the injury as bookkeeping happening
 * beside it.
 *
 * This file was written at W0b with those assertions **negative on
 * purpose** — a paired run showing the wounded and the unwounded defender
 * ending the beat in the same poise band. W1 flipped them, and the
 * comments below keep the before/after so the change is legible.
 *
 * Couplings already characterized elsewhere, deliberately not duplicated:
 * the Sharpness curve and its inert `g(composure)` (`Sharpness.test.ts`),
 * the poise band ladder and `restore` capped by endurance
 * (`Poise.test.ts`), weapon + armour wear per blow
 * (`CombatLogic.gearwear.test.ts`).
 *
 * ⚠ Combat is fully deterministic — no `Math.random`, no drawn
 * uncertainty anywhere in `CombatLogic` — so a paired-run comparison is a
 * legitimate instrument here in a way it would not be in a stochastic
 * engine.
 */

import '../../../../test-bootstrap';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { Idea } from '../../stuff/Idea';
import { Character } from '../../character/Character';
import Species from '../../../platform/idea/species/Species';
import BodyPlan from '../../../platform/idea/species/BodyPlan';
import Weapon from '../../../platform/thing/equipment/Weapon';
import Garment from '../../../platform/thing/equipment/Garment';
import Material from '../../material/Material';
import { Construction } from '../../material/Construction';
import { ContainerMixin } from '../../spatial/Container';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { SchedulerApi } from '../../../api/scheduler';
import { Quantity } from '../../quantity';
import { CombatApi } from '../../../api/combat';
import { CombatTerms, type TermsProposal } from '../CombatTerms';
import { CombatSession } from '../CombatSession';
import { Poise } from '../Poise';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { EventApi } from '../../../api/event';

class TestRoom extends ContainerMixin(Idea) {}
class TestFighter extends Character {}

let seq = 0;

function mat(hardness: number, toughness: number, name: string): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, 'MPa'));
  m.setToughness(Quantity.of(toughness, 'MJ/m³'));
  m.setName(name);
  stampTemplatePathForTest(m, `/stuff/idea/material/test/cc-${seq++}`);
  return m;
}
const steel = (): Material => mat(600, 200, 'steel');

function planPathOf(c: TestFighter): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

function makeFighter(room: TestRoom): TestFighter {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('test-biped');
  plan.setSlots([
    {
      name: 'torso',
      accepts: 'WearableMixin',
      capacity: 2,
      covers: ['body.torso'],
    },
    { name: 'grip', accepts: 'WieldableMixin', covers: ['body.arm.right'] },
  ]);
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [
        { tissuePath: '/stuff/idea/material/tissue/bone', mass: 8 },
        { tissuePath: '/stuff/idea/material/tissue/flesh', mass: 20 },
      ],
    },
    {
      key: 'body.head',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 4 }],
    },
    {
      key: 'body.arm.right',
      parent: 'body.torso',
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 3 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/test-cc-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/cc-${id}`);

  const f = makeStuff(() => new TestFighter());
  stampTemplatePathForTest(f, `/test/cc-fighter-${id}`);
  f.setSpecies(species);
  ContainmentApi.move(f as never, room as never);
  return f;
}

function armWith(f: TestFighter): Weapon {
  const w = makeStuff(() => new Weapon());
  w.setMaterial(steel());
  w.setConstruction(Construction.of('bladed'));
  w.setSlotClaim(planPathOf(f), ['grip']);
  (f as unknown as { occupy(x: unknown, s: string): void }).occupy(w, 'grip');
  return w;
}

function armourWith(f: TestFighter): Garment {
  const a = makeStuff(() => new Garment());
  a.setMaterial(steel());
  a.setConstruction(Construction.of('plate'));
  a.setSlotClaim(planPathOf(f), ['torso']);
  (f as unknown as { occupy(x: unknown, s: string): void }).occupy(a, 'torso');
  return a;
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    stampTemplatePathForTest(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

const nonLethal: TermsProposal = {
  lethality: 'non-lethal',
  stopCondition: 'yield',
  stakes: '',
};

const openSessions: CombatSession[] = [];

function open(a: TestFighter, b: TestFighter): CombatSession {
  const terms = CombatTerms.agreed(a.getTemplatePath() ?? 'a', nonLethal, true);
  const res = CombatApi.openSession(a as never, b as never, terms);
  if (!res.ok) throw new Error(`openSession failed: ${res.reason}`);
  openSessions.push(res.session);
  return res.session;
}

/** The most severe trauma severity on the body, or 0. */
function worstSeverity(body: TestFighter): number {
  let worst = 0;
  for (const c of body.getConditions()) {
    if (c.kind === 'trauma' && c.severity > worst) worst = c.severity;
  }
  return worst;
}

/** One committed strike from `atkr`, with the target driven to reeling. */
function landStrike(
  session: CombatSession,
  atkr: TestFighter,
  target: TestFighter,
): void {
  session.getState(target)!.poise.erode(0.6, 0);
  atkr.queueGambit('strike');
  CombatApi.advance(session);
}

beforeAll(async () => {
  await bootRegistry();
});

beforeEach(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  SchedulerApi._clearAllForTesting();
  await bootRegistry();
});

afterEach(() => {
  for (const s of openSessions.splice(0)) s.dissolve();
  StuffApi.clearAll();
});

describe('combat couplings — characterization', () => {
  /* ──────────────── the edge W1 closed (was ABSENT) ──────────────── */

  it('⭐ W1 — a landed wound costs the target footing the deflected twin keeps', () => {
    // Two identical fights. The only difference is the defender's plate:
    // one takes a wound, one turns the blow. Poise erosion is
    // `poiseDamage × reachScale`, which reads the ATTACKER's weapon and
    // the reach, never the defender's armour — so the pressure applied is
    // byte-identical across the pair. If the wound touched poise, the
    // bands would diverge. They do not.
    const roomA = makeStuff(() => new TestRoom());
    const atkrA = makeFighter(roomA);
    armWith(atkrA);
    const bare = makeFighter(roomA);
    const sA = open(atkrA, bare);
    landStrike(sA, atkrA, bare);

    const roomB = makeStuff(() => new TestRoom());
    const atkrB = makeFighter(roomB);
    armWith(atkrB);
    const plated = makeFighter(roomB);
    armourWith(plated);
    const sB = open(atkrB, plated);
    landStrike(sB, atkrB, plated);

    // The premise of the pairing: one bled, one did not.
    expect(worstSeverity(bare)).toBeGreaterThan(0);
    expect(worstSeverity(plated)).toBeLessThan(worstSeverity(bare));

    // ⭐ Before W1 the two ended the beat in the SAME poise band, and the
    // wound was bookkeeping happening beside the fight. Now the wounded
    // one is measurably worse off on the axis that decides fights: their
    // recovery is capped and the plated one's is not.
    const bareCeiling = sA.getState(bare)!.poise.ceiling();
    const platedCeiling = sB.getState(plated)!.poise.ceiling();
    expect(bareCeiling).toBeLessThan(platedCeiling);
    expect(platedCeiling).toBe(1);
    // …and it is bounded: wounds wear a fighter down, they never take
    // recovery away entirely (`combat.wound.ceilingFloor`).
    expect(bareCeiling).toBeGreaterThanOrEqual(0.4);
  });

  it('⭐ W1 — staying cut keeps you losing: the ceiling caps recovery below full', () => {
    // Two identical gauges driven to the same place. The unhurt one buys
    // its footing all the way back; the cut one cannot, however fresh it
    // is — which is what makes breaking off a real decision rather than a
    // forfeit.
    const unhurt = new Poise();
    unhurt.erode(0.8, 0);
    expect(unhurt.band()).toBe('open');
    unhurt.restore(1, 1);
    expect(unhurt.band()).toBe('steady');

    const cut = new Poise();
    cut.erode(0.8, 0);
    cut.lowerCeiling(0.6);
    cut.restore(1, 1); // fully rested, fully fresh
    expect(cut.band()).not.toBe('steady');
    expect(cut.ceiling()).toBe(0.6);

    // The ceiling is a RATCHET — a wound does not un-happen mid-fight.
    cut.lowerCeiling(0.9);
    expect(cut.ceiling()).toBe(0.6);
  });

  it('⭐ W1 — a wound caps recovery and NEVER touches the gauge', () => {
    // One mutation, not two. The exchange that delivered the wound has
    // already eroded the target — that is "getting hit costs you
    // footing". What the wound uniquely says is that it PERSISTS, and a
    // second wound-sized erosion for the same event measurably compressed
    // fights below the length at which tactics can act.
    const p = new Poise();
    p.erode(0.6, 0);
    expect(p.band()).toBe('reeling');
    p.lowerCeiling(0.5);
    expect(p.band()).toBe('reeling'); // the gauge did not move
    expect(p.isOpen()).toBe(false); // …and no opening was manufactured

    // The contest still breaks guards, exactly as before.
    p.spend(0.9, 2);
    expect(p.band()).toBe('open');
  });

  /* ───────────────── the edges that ARE wired ───────────────── */

  it('the target poise band buys blow energy — the same strike bites deeper into an open guard', () => {
    // `energyFor(band)` is the conversion rule the whole "poise is the
    // honest hitpoint bar" argument rests on: the gauge is not damage, it
    // is how much of a blow reaches the body. Steady 1.2 → open 4.5.
    const roomSteady = makeStuff(() => new TestRoom());
    const atkr1 = makeFighter(roomSteady);
    armWith(atkr1);
    const composed = makeFighter(roomSteady);
    const s1 = open(atkr1, composed);
    atkr1.queueGambit('strike');
    CombatApi.advance(s1);
    const steadySeverity = worstSeverity(composed);

    const roomOpen = makeStuff(() => new TestRoom());
    const atkr2 = makeFighter(roomOpen);
    armWith(atkr2);
    const reeling = makeFighter(roomOpen);
    const s2 = open(atkr2, reeling);
    s2.getState(reeling)!.poise.erode(0.9, 0); // driven past the floor
    atkr2.queueGambit('strike');
    CombatApi.advance(s2);
    const openSeverity = worstSeverity(reeling);

    expect(openSeverity).toBeGreaterThan(steadySeverity);
  });

  it('focus fire multiplies erosion — a second attacker wears a defender down faster', () => {
    const room1 = makeStuff(() => new TestRoom());
    const solo = makeFighter(room1);
    armWith(solo);
    const alone = makeFighter(room1);
    const s1 = open(solo, alone);
    solo.queueGambit('strike');
    CombatApi.advance(s1);
    const oneOn = s1.getState(alone)!.poise.band();

    const room2 = makeStuff(() => new TestRoom());
    const a = makeFighter(room2);
    armWith(a);
    const ganged = makeFighter(room2);
    const s2 = open(a, ganged);
    const b = makeFighter(room2);
    armWith(b);
    const joinTerms = CombatTerms.agreed(
      b.getTemplatePath() ?? 'b',
      nonLethal,
      true,
    );
    const joined = CombatApi.join(b as never, ganged as never, joinTerms);
    expect(joined.ok).toBe(true);
    a.queueGambit('strike');
    b.queueGambit('strike');
    CombatApi.advance(s2);
    const twoOn = s2.getState(ganged)!.poise.band();

    // Not a number — the band ladder. Two on one is measurably worse.
    const ladder = ['steady', 'pressed', 'reeling', 'broken', 'open'];
    expect(ladder.indexOf(twoOn)).toBeGreaterThan(ladder.indexOf(oneOn));
  });
});
