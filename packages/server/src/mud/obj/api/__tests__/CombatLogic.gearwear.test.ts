/**
 * CombatLogic gear wear — the crafting-branches combat coupling: a landed
 * weapon strike wears the weapon (Law 2: use, never the clock), an
 * attenuating covering layer wears the armor, and the bounded
 * instrument-delivery scale folds grade × condition into strike energy
 * with a broken floor (a ruined blade barely bites).
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { Idea } from "../../../lib/stuff/Idea";
import { Character } from "../../../lib/character/Character";
import Species from "../../../lib/species/Species";
import BodyPlan from "../../../lib/species/BodyPlan";
import Weapon from "../../../lib/equipment/Weapon";
import Armor from "../../../lib/equipment/Armor";
import Material from "../../../lib/material/Material";
import { Construction } from "../../../lib/material/Construction";
import { ContainerMixin } from "../../../lib/spatial/Container";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { SchedulerApi } from "../../../api/scheduler";
import { MixinApi } from "../../../api/mixin";
import { Quantity } from "../../../lib/quantity";
import { CombatApi } from "../../../api/combat";
import {
  CombatTerms,
  type TermsProposal,
} from "../../../lib/combat/CombatTerms";
import { CombatSession } from "../../../lib/combat/CombatSession";
import EventRegistry from "../../../obj/EventRegistry";
import { EventApi } from "../../../api/event";

class TestRoom extends ContainerMixin(Idea) {}
class TestFighter extends Character {}

let seq = 0;

function mat(hardness: number, toughness: number, name: string): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, "MPa"));
  m.setToughness(Quantity.of(toughness, "MJ/m³"));
  m.setName(name);
  stampTemplatePathForTest(m, `/lib/material/test/gw-${seq++}`);
  return m;
}
const steel = () => mat(600, 200, "steel");

function planPathOf(c: TestFighter): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

function makeFighter(room: TestRoom): TestFighter {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("test-biped");
  plan.setSlots([
    {
      name: "torso",
      accepts: "WearableMixin",
      capacity: 2,
      covers: ["body.torso"],
    },
    { name: "grip", accepts: "WieldableMixin", covers: ["body.arm.right"] },
  ]);
  plan.setBodyParts([
    {
      key: "body.torso",
      parent: null,
      tissues: [
        { tissuePath: "/lib/material/tissue/bone", mass: 8 },
        { tissuePath: "/lib/material/tissue/flesh", mass: 20 },
      ],
    },
    {
      key: "body.head",
      parent: "body.torso",
      tissues: [{ tissuePath: "/lib/material/tissue/flesh", mass: 4 }],
    },
    {
      key: "body.arm.right",
      parent: "body.torso",
      tissues: [{ tissuePath: "/lib/material/tissue/flesh", mass: 3 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/lib/body-plans/test-gw-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/lib/species/test/gw-${id}`);

  const f = makeStuff(() => new TestFighter());
  stampTemplatePathForTest(f, `/test/gw-fighter-${id}`);
  f.setSpecies(species);
  ContainmentApi.move(f as never, room as never);
  return f;
}

function armWith(f: TestFighter, condition = 1): Weapon {
  const w = makeStuff(() => new Weapon());
  w.setMaterial(steel());
  w.setConstruction(Construction.of("bladed"));
  w.setCondition(condition);
  w.setSlotClaim(planPathOf(f), ["grip"]);
  (f as unknown as { occupy(x: unknown, s: string): void }).occupy(w, "grip");
  return w;
}

function armorWith(f: TestFighter, form = "plate"): Armor {
  const a = makeStuff(() => new Armor());
  a.setMaterial(steel());
  a.setConstruction(Construction.of(form));
  a.setSlotClaim(planPathOf(f), ["torso"]);
  (f as unknown as { occupy(x: unknown, s: string): void }).occupy(a, "torso");
  return a;
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    stampTemplatePathForTest(r, "/obj/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

const nonLethal: TermsProposal = {
  lethality: "non-lethal",
  stopCondition: "yield",
  stakes: "",
};

const openSessions: CombatSession[] = [];

function open(a: TestFighter, b: TestFighter): CombatSession {
  const terms = CombatTerms.agreed(a.getTemplatePath() ?? "a", nonLethal, true);
  const res = CombatApi.openSession(a as never, b as never, terms);
  if (!res.ok) throw new Error(`openSession failed: ${res.reason}`);
  openSessions.push(res.session);
  return res.session;
}

/** Land one committed strike from `atkr` (target driven to reeling). */
function landStrike(
  session: CombatSession,
  atkr: TestFighter,
  target: TestFighter,
): void {
  session.getState(target)!.poise.erode(0.6, 0);
  CombatApi.queueGambit(atkr, "strike");
  CombatApi.advance(session);
}

/** The most severe trauma severity on the body, or 0. */
function worstSeverity(body: TestFighter): number {
  let worst = 0;
  for (const c of body.getConditions()) {
    if (c.kind === "trauma" && c.severity > worst) worst = c.severity;
  }
  return worst;
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

describe("CombatLogic — gear wear on use", () => {
  it("a landed weapon strike wears the weapon", () => {
    const room = makeStuff(() => new TestRoom());
    const atkr = makeFighter(room);
    const blade = armWith(atkr);
    const bare = makeFighter(room);
    const session = open(atkr, bare);

    expect(blade.getCondition()).toBe(1);
    landStrike(session, atkr, bare);
    expect(blade.getCondition()).toBeLessThan(1);
  });

  it("a covering layer that attenuates the blow wears", () => {
    const room = makeStuff(() => new TestRoom());
    const atkr = makeFighter(room);
    armWith(atkr);
    const armored = makeFighter(room);
    const plate = armorWith(armored);
    const session = open(atkr, armored);

    expect(plate.getCondition()).toBe(1);
    landStrike(session, atkr, armored);
    expect(plate.getCondition()).toBeLessThan(1);
  });

  it("a landed edge strike dulls the blade; a dulled blade lands less; sharpen restores; the two axes are independent", () => {
    // A dulled-but-sound blade vs a keen one — same fight twice.
    const room1 = makeStuff(() => new TestRoom());
    const atkr1 = makeFighter(room1);
    const keenBlade = armWith(atkr1, 1);
    const bare1 = makeFighter(room1);
    const s1 = open(atkr1, bare1);
    landStrike(s1, atkr1, bare1);
    const keenSeverity = worstSeverity(bare1);
    expect(keenSeverity).toBeGreaterThan(0);
    // The landed edge strike dulled the working surface AND wore the
    // structure — two axes, both moved by use.
    expect(MixinApi.isKeen(keenBlade) && keenBlade.getKeenness()).toBeLessThan(1);
    expect(keenBlade.getCondition()).toBeLessThan(1);

    const room2 = makeStuff(() => new TestRoom());
    const atkr2 = makeFighter(room2);
    const dulledBlade = armWith(atkr2, 1);
    if (MixinApi.isKeen(dulledBlade)) dulledBlade.setKeenness(0); // blunted, sound
    const bare2 = makeFighter(room2);
    const s2 = open(atkr2, bare2);
    landStrike(s2, atkr2, bare2);
    const dulledSeverity = worstSeverity(bare2);
    // Measurably less on the edge channel — and no repair needed:
    // sharpen alone restores the delivery.
    expect(dulledSeverity).toBeLessThan(keenSeverity);
    if (MixinApi.isKeen(dulledBlade)) {
      dulledBlade.hone();
      expect(dulledBlade.getKeenness()).toBe(1);
    }
    // Sharpening never touched the structural axis.
    expect(dulledBlade.getCondition()).toBeLessThan(1); // worn by its strike
  });

  it("a wrecked blade's delivered energy is floored down (broken floor)", () => {
    // Same fight twice — a pristine blade vs a near-zero-condition one.
    const room1 = makeStuff(() => new TestRoom());
    const atkr1 = makeFighter(room1);
    armWith(atkr1, 1);
    const bare1 = makeFighter(room1);
    const s1 = open(atkr1, bare1);
    landStrike(s1, atkr1, bare1);
    const pristineSeverity = worstSeverity(bare1);
    expect(pristineSeverity).toBeGreaterThan(0);

    const room2 = makeStuff(() => new TestRoom());
    const atkr2 = makeFighter(room2);
    const wreck = armWith(atkr2, 0.02);
    expect(MixinApi.isDurable(wreck) && wreck.isBroken()).toBe(true);
    const bare2 = makeFighter(room2);
    const s2 = open(atkr2, bare2);
    landStrike(s2, atkr2, bare2);
    const brokenSeverity = worstSeverity(bare2);

    // The broken blade lands measurably less (floored, not zeroed).
    expect(brokenSeverity).toBeLessThan(pristineSeverity);
  });
});
