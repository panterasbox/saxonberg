/**
 * ⭐⭐ The combat-side couplings, characterized — **including the one that
 * is ABSENT.**
 *
 * The fight already has a rich set of edges: poise band → blow energy,
 * focus-fire → erosion, endurance → how much poise you can buy back.
 * Exactly one edge is missing, and it is the one the whole consequence
 * build turns on: **a landed wound does not touch the poise of the
 * fighter it lands on.** Getting cut costs you nothing tactically; the
 * fight is decided by pressure alone, and the injury is bookkeeping that
 * happens beside it.
 *
 * ⚠ Two assertions here are **negative on purpose**. Each is marked
 * `ABSENT` and names the wave that flips it (W1). A failure after that
 * wave is the expected outcome, not a regression.
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
  /* ───────────────────── the absent edge ───────────────────── */

  it('⚠ ABSENT (W1 flips this) — a landed wound leaves the target exactly where pressure alone put it', () => {
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

    // …and it made no tactical difference whatsoever.
    expect(sA.getState(bare)!.poise.band()).toBe(
      sB.getState(plated)!.poise.band(),
    );
  });

  it('⚠ ABSENT (W1 flips this) — nothing can cap how much poise a fighter buys back but endurance', () => {
    // `restore`'s only ceiling is the endurance ratio the caller passes.
    // A fighter who has been opened to the bone recovers to full as
    // readily as one who has not been touched — there is no per-fighter
    // ceiling to lower, and no caller that would lower one.
    const p = new Poise();
    p.erode(0.8, 0);
    expect(p.band()).toBe('open');
    p.restore(1, 1);
    expect(p.band()).toBe('steady');
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
