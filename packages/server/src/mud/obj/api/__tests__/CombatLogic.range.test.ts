/**
 * CombatLogic — the band ladder's effects on the shipped melee engine.
 *
 * Wave 1 of the ranged build widened `RangeState` from two melee tiers to
 * four bands. The compiler catches almost none of that: every consumer is
 * a `===`/`!==` comparison rather than an exhaustive switch, so these are
 * the assertions standing in for a type error.
 *
 * Two behaviour changes are pinned here:
 *
 *  1. **The re-seed bug** (plan §5 row 11) — `rangeBetween(...) === "close"`
 *     was doing duty as a "have these two met yet" sentinel, immediately
 *     after `addEdge` minted the edge at the `close` default. A pair that
 *     had fought its way to `close` was silently reset to its opening band
 *     every time the engine re-picked the target.
 *  2. **The melee-band gate** (row 7) — a hand weapon cannot cross a
 *     ranged band. `reachAdvantage` stays a pure reach term (0 outside
 *     melee); the cannot-connect fact rides its own predicate.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { Idea } from "../../../lib/stuff/Idea";
import { Character } from "../../../lib/character/Character";
import Species from "../../species/Species";
import BodyPlan from "../../species/BodyPlan";
import Weapon from "../../equipment/Weapon";
import Material from "../../../lib/material/Material";
import { Construction } from "../../../lib/material/Construction";
import { ContainerMixin } from "../../../lib/spatial/Container";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { SchedulerApi } from "../../../api/scheduler";
import { Quantity } from "../../../lib/quantity";
import { CombatApi } from "../../../api/combat";
import { CombatTerms, type TermsProposal } from "../../../lib/combat/CombatTerms";
import type { CombatSession } from "../../../lib/combat/CombatSession";
import EventRegistry from "../../EventRegistry";
import { EventApi } from "../../../api/event";

class TestRoom extends ContainerMixin(Idea) {}
class TestFighter extends Character {}

let seq = 0;

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(600, "MPa"));
  m.setToughness(Quantity.of(200, "MJ/m³"));
  m.setName("steel");
  stampTemplatePathForTest(m, `/obj/material/test/m-${seq++}`);
  return m;
}

/** A fighter with an authored weapon length — length drives reach rank. */
function makeFighter(room: TestRoom, weaponLength: number): TestFighter {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("test-biped");
  plan.setSlots([
    { name: "grip", accepts: "WieldableMixin", covers: ["body.arm.right"] },
  ]);
  plan.setBodyParts([
    {
      key: "body.torso",
      parent: null,
      tissues: [
        { tissuePath: "/obj/material/tissue/bone", mass: 8 },
        { tissuePath: "/obj/material/tissue/flesh", mass: 20 },
      ],
    },
    {
      key: "body.arm.right",
      parent: "body.torso",
      tissues: [{ tissuePath: "/obj/material/tissue/flesh", mass: 3 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/obj/species/BodyPlan/range-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/obj/species/test/range-${id}`);

  const f = makeStuff(() => new TestFighter());
  stampTemplatePathForTest(f, `/test/range-fighter-${id}`);
  f.setSpecies(species);
  ContainmentApi.move(f as never, room as never);

  const w = makeStuff(() => new Weapon());
  w.setMaterial(steel());
  w.setConstruction(Construction.of("bladed"));
  w.setMass(Quantity.of(1.0, "kg"));
  w.setLength(Quantity.of(weaponLength, "m"));
  w.setSlotClaim(plan.getTemplatePath()!, ["grip"]);
  (f as unknown as { occupy(x: unknown, s: string): void }).occupy(w, "grip");
  return f;
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
  const terms = CombatTerms.agreed(
    a.getTemplatePath() ?? "a",
    nonLethal,
    true,
  );
  const res = CombatApi.openSession(a as never, b as never, terms);
  if (!res.ok) throw new Error(`openSession failed: ${res.reason}`);
  openSessions.push(res.session);
  return res.session;
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

describe("CombatLogic — a pair's established band survives re-targeting", () => {
  /**
   * The bug, stated as behaviour: two fighters open at `reach` (unequal
   * weapon lengths), one closes to the clinch, and then the engine
   * re-picks the target. Before the fix, minting the forward edge reset
   * the pair to their reach-derived opening — undoing the close for free,
   * and invisibly, because `close` is also a legal band.
   */
  it("a pair that reached `close` is not re-seeded when the edge is re-minted", () => {
    const room = makeStuff(() => new TestRoom());
    const spear = makeFighter(room, 2.0);
    const dagger = makeFighter(room, 0.3);
    const session = open(spear, dagger);
    const graph = session.getGraph();

    // Unequal reach → the shipped heuristic opens the pair at `reach`.
    expect(graph.rangeBetween(spear, dagger)).toBe("reach");

    // The dagger fights its way inside.
    graph.setRange(spear, dagger, "close");
    expect(graph.rangeBetween(spear, dagger)).toBe("close");

    // The engine re-picks: the forward edge is dropped and re-minted (the
    // shape `pickSustained` / `engageToward` hit every beat a combatant
    // has no live edge onto its foe).
    graph.removeEdge(dagger, spear);
    CombatApi.advance(session);

    // The clinch survives. Before the fix this read `reach` again.
    expect(graph.rangeBetween(spear, dagger)).toBe("close");
  });

  it("a genuinely fresh pair still opens at the reach-derived band", () => {
    const room = makeStuff(() => new TestRoom());
    const spear = makeFighter(room, 2.0);
    const dagger = makeFighter(room, 0.3);
    const session = open(spear, dagger);

    // The other half of the same rule: not re-seeding an established pair
    // must not stop a first meeting from being seeded at all.
    expect(session.getGraph().rangeBetween(spear, dagger)).toBe("reach");
  });

  it("equal reach still opens at `close` — no approach phase", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, 0.9);
    const b = makeFighter(room, 0.9);
    const session = open(a, b);
    expect(session.getGraph().rangeBetween(a, b)).toBe("close");
  });
});

describe("CombatLogic — a melee strike cannot cross a ranged band", () => {
  function trauma(f: TestFighter): number {
    return f.getConditions().filter((c) => c.kind === "trauma").length;
  }

  /**
   * The shipped `pinnedWounds` shape: a forced attrition matchup with the
   * band pinned each beat, reporting wounds TAKEN. Deterministic and
   * robust to exact fight timing — the same invariant the reach dance is
   * already tested with.
   */
  function woundsAtBand(
    room: TestRoom,
    band: "close" | "reach" | "near" | "far",
  ): { aHurt: number; bHurt: number } {
    const a = makeFighter(room, 0.9);
    const b = makeFighter(room, 0.9);
    const session = open(a, b);
    for (let i = 0; i < 150 && session.isActive(); i++) {
      session.getGraph().setRange(a, b, band);
      CombatApi.queueGambit(a as never, "strike");
      CombatApi.queueGambit(b as never, "strike");
      CombatApi.advance(session);
    }
    session.dissolve();
    return { aHurt: trauma(a), bHurt: trauma(b) };
  }

  it("neither side can wound the other at `near` or `far`", () => {
    // The state the ranged bands make reachable, and which the shipped
    // melee engine had never seen: equal-reach fighters who simply are
    // not in melee. Before the gate, `reachAdvantage` returned -0 here and
    // the strike landed as if they were toe to toe.
    for (const band of ["near", "far"] as const) {
      const room = makeStuff(() => new TestRoom());
      const { aHurt, bHurt } = woundsAtBand(room, band);
      expect(aHurt).toBe(0);
      expect(bHurt).toBe(0);
    }
  });

  it("the same matchup wounds freely at `close` — the control case", () => {
    // Proves the zeros above are the band and not the harness.
    const room = makeStuff(() => new TestRoom());
    const { aHurt, bHurt } = woundsAtBand(room, "close");
    expect(aHurt + bHurt).toBeGreaterThan(0);
  });
});

describe("CombatLogic — the reach dance stays inside the melee bands", () => {
  it("defending does not push a `near` pair further out", () => {
    const room = makeStuff(() => new TestRoom());
    const spear = makeFighter(room, 2.0);
    const dagger = makeFighter(room, 0.3);
    const session = open(spear, dagger);
    const graph = session.getGraph();

    // `resetReachOnDefend` re-opens distance on a foe who closed. It must
    // act only between `close` and `reach` — a ranged pair is not "reach,
    // further out", and pushing it would be the reach dance leaking.
    graph.setRange(spear, dagger, "near");
    CombatApi.queueGambit(spear as never, "defend");
    CombatApi.advance(session);

    expect(graph.rangeBetween(spear, dagger)).toBe("near");
  });
});
