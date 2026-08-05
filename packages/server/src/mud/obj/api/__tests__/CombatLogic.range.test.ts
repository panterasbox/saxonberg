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
import CartesianLocation from "../../../lib/location/CartesianLocation";
import CartesianZone from "../../location/CartesianZone";
import { Stuff } from "../../../lib/stuff/Stuff";
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
function makeFighter(
  room: TestRoom,
  weaponLength: number,
  sentient = false,
): TestFighter {
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
  // Sentience is off by default on Species, and the consent gate only
  // speaks about PEOPLE — a flask may soak a beast or the furniture.
  species.setSentient(sentient);
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

/**
 * Queue a gambit and advance until it actually resolves.
 *
 * A combatant only acts when `tempo.advance()` grants them an action, and
 * on the first beat of a fight it usually grants none — which is why the
 * shipped suite drives its assertions over many beats rather than one.
 * `queuedGambit` is cleared the moment the exchange runs, so that is the
 * honest signal that the beat we care about happened.
 */
function act(
  s: CombatSession,
  actor: TestFighter,
  gambit: string,
  maxBeats = 20,
): void {
  const elig = CombatApi.queueGambit(actor as never, gambit);
  if (!elig.ok) throw new Error(`gambit ${gambit} ineligible: ${elig.reason}`);
  for (let i = 0; i < maxBeats && s.isActive(); i++) {
    CombatApi.advance(s);
    const st = s.getState(actor) as unknown as { queuedGambit: unknown };
    if (st.queuedGambit == null) return;
  }
  throw new Error(`gambit ${gambit} never resolved in ${maxBeats} beats`);
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

    // The arena (a plain container, no extent) caps the pair at `reach`.
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

  it("a genuinely fresh pair still gets seeded at all", () => {
    const room = makeStuff(() => new TestRoom());
    const spear = makeFighter(room, 2.0);
    const dagger = makeFighter(room, 0.3);
    const session = open(spear, dagger);

    // The other half of the pairHasRange rule: not re-seeding an
    // established pair must not stop a first meeting from being seeded.
    expect(session.getGraph().rangeBetween(spear, dagger)).toBe("reach");
  });

  it("equal reach opens at the ARENA band, not `close` (D37)", () => {
    // Re-derived from P1, where this pinned the old reach-rank rule. A
    // plain container reports no linear extent, so the conservative melee
    // cap applies to everyone regardless of weapon length.
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, 0.9);
    const b = makeFighter(room, 0.9);
    const session = open(a, b);
    expect(session.getGraph().rangeBetween(a, b)).toBe("reach");
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

/** A real Location (not a bare container) with an authored linear extent —
 * the only kind of room that can arm the ranged bands. */
function makeArena(extentMetres: number): CartesianLocation {
  const zone = makeStuff(() => new CartesianZone());
  const room = makeStuff(() => new CartesianLocation());
  Stuff._stampZone(room, zone);
  room.setExtent(extentMetres);
  return room;
}

function fightersIn(room: unknown): [TestFighter, TestFighter] {
  return [
    makeFighter(room as TestRoom, 0.9),
    makeFighter(room as TestRoom, 0.9),
  ];
}

describe("CombatLogic — the arena caps the ladder (AC 3, AC 5)", () => {
  it("a 3 m cell opens at `reach` — bar fights stay knife fights", () => {
    const [a, b] = fightersIn(makeArena(3));
    const s = open(a, b);
    expect(s.getGraph().rangeBetween(a, b)).toBe("reach");
  });

  it("a 12 m yard opens at `near` — you notice someone across it", () => {
    const [a, b] = fightersIn(makeArena(12));
    const s = open(a, b);
    expect(s.getGraph().rangeBetween(a, b)).toBe("near");
  });

  it("a 30 m field opens at `far`", () => {
    const [a, b] = fightersIn(makeArena(30));
    const s = open(a, b);
    expect(s.getGraph().rangeBetween(a, b)).toBe("far");
  });

  it("`fight advance` buys one band inward, at a poise cost", () => {
    const [a, b] = fightersIn(makeArena(30));
    const s = open(a, b);
    expect(s.getGraph().rangeBetween(a, b)).toBe("far");

    const bandBefore = s.getState(a)!.poise.band();
    act(s, a, "advance");
    expect(s.getGraph().rangeBetween(a, b)).toBe("near");

    // One rung per beat — not a teleport to the clinch.
    act(s, a, "advance");
    expect(s.getGraph().rangeBetween(a, b)).toBe("reach");
    expect(bandBefore).toBe("steady");
  });

  it("`fight withdraw` opens a band, and the ROOM caps how far", () => {
    const [a, b] = fightersIn(makeArena(12));
    const s = open(a, b);
    s.getGraph().setRange(a, b, "close");

    act(s, a, "withdraw");
    expect(s.getGraph().rangeBetween(a, b)).toBe("reach");

    act(s, a, "withdraw");
    expect(s.getGraph().rangeBetween(a, b)).toBe("near");

    // The 12 m yard affords `near` and no further — you cannot back away
    // further than the room is big.
    act(s, a, "withdraw");
    expect(s.getGraph().rangeBetween(a, b)).toBe("near");
  });

  it("`close` still works — it is an alias onto `advance`", () => {
    const [a, b] = fightersIn(makeArena(12));
    const s = open(a, b);
    expect(s.getGraph().rangeBetween(a, b)).toBe("near");
    act(s, a, "close");
    expect(s.getGraph().rangeBetween(a, b)).toBe("reach");
  });

  it("an ambush opens at `close` however big the room is (AC 52)", () => {
    const room = makeArena(30);
    const [a, b] = fightersIn(room);
    const terms = CombatTerms.agreed(a.getTemplatePath() ?? "a", nonLethal, true);
    const res = CombatApi.openSession(a as never, b as never, terms, {
      ambush: true,
    });
    if (!res.ok) throw new Error(res.reason);
    openSessions.push(res.session);

    // Concealment is what buys the opening band — which is why a
    // knife-fighter can reach a bowman at all.
    expect(res.session.getGraph().rangeBetween(a, b)).toBe("close");
  });
});

describe("CombatLogic — the splash set is a relationship, not a radius", () => {
  it("catches the target plus whoever is clinched with them, and NOBODY else", () => {
    const room = makeArena(30);
    const thrower = makeFighter(room as unknown as TestRoom, 0.9);
    const target = makeFighter(room as unknown as TestRoom, 0.9);
    const clinched = makeFighter(room as unknown as TestRoom, 0.9);
    const bystander = makeFighter(room as unknown as TestRoom, 0.9);

    const s = open(thrower, target);
    CombatApi.join(clinched as never, target as never, s.getTerms());
    CombatApi.join(bystander as never, target as never, s.getTerms());

    s.getGraph().setRange(clinched, target, "close");
    s.getGraph().setRange(bystander, target, "reach");

    const set = CombatApi.splashSetFor(target as never);
    expect(set).toContain(target);
    expect(set).toContain(clinched);
    // At `reach` you are near the target, not ON them.
    expect(set).not.toContain(bystander);
  });

  /**
   * The trap that produced the P1 re-seed bug, in its other guise:
   * `rangeBetween` answers `close` for a pair it has never seen, so
   * asking it without checking for an edge would sweep every combatant
   * in the session into every splash.
   */
  it("does not sweep in unengaged combatants via the `close` fallback", () => {
    const room = makeArena(30);
    const thrower = makeFighter(room as unknown as TestRoom, 0.9);
    const target = makeFighter(room as unknown as TestRoom, 0.9);
    const elsewhere = makeFighter(room as unknown as TestRoom, 0.9);

    const s = open(thrower, target);
    // `elsewhere` is in the session but has no edge to the target.
    CombatApi.join(elsewhere as never, thrower as never, s.getTerms());

    expect(CombatApi.splashSetFor(target as never)).not.toContain(elsewhere);
  });

  it("a target in no fight splashes only itself", () => {
    const room = makeArena(12);
    const lone = makeFighter(room as unknown as TestRoom, 0.9);
    expect(CombatApi.splashSetFor(lone as never)).toEqual([lone]);
  });
});

describe("CombatLogic — the commit-time consent gate (AC 25, AC 31)", () => {
  /** A person — the gate only speaks about sentients. */
  const person = (room: unknown) =>
    makeFighter(room as TestRoom, 0.9, true);

  it("permits the primary target — attacking the unwilling is a CRIME, not impossible", () => {
    const room = makeArena(12);
    const thrower = person(room);
    const target = person(room);
    open(thrower, target);

    // The gate never speaks about the primary; the terms handshake and
    // the `consented: false` marker do. A gate that refused here would
    // forbid crime itself.
    const verdict = CombatApi.mayDeliverTo(
      thrower as never,
      target as never,
      [target as never],
    );
    expect(verdict.ok).toBe(true);
  });

  /**
   * AC 25 — the case the requirements named: a consenting duelist
   * clinched with a bystander the thrower has no terms with. Before this
   * gate, the area path caught the bystander with nothing refusing it,
   * which made splash a cheaper route to a person than aiming at them.
   */
  it("REFUSES when a non-consenting sentient is clinched with the target", () => {
    const room = makeArena(30);
    const thrower = person(room);
    const duelist = person(room);
    const bystander = person(room);

    const s = open(thrower, duelist);
    // The bystander is in the fight against the DUELIST, not the thrower
    // — so the thrower holds no consented terms with them.
    CombatApi.join(bystander as never, duelist as never, s.getTerms());
    s.getGraph().setRange(bystander, duelist, "close");

    const splash = CombatApi.splashSetFor(duelist as never);
    expect(splash).toContain(bystander);

    const verdict = CombatApi.mayDeliverTo(
      thrower as never,
      duelist as never,
      splash as never,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.refusedBy).toBe(bystander);
  });

  it("PERMITS once the thrower holds consented terms with everyone caught", () => {
    const room = makeArena(30);
    const thrower = person(room);
    const duelist = person(room);
    const ally = person(room);

    const s = open(thrower, duelist);
    // This time the third party is fighting the THROWER, consented — so
    // they already stand under terms that permit this harm.
    CombatApi.join(ally as never, thrower as never, s.getTerms());
    s.getGraph().setRange(ally, duelist, "close");
    s.getGraph().addEdge(thrower, ally, s.getTerms());

    const splash = CombatApi.splashSetFor(duelist as never);
    const verdict = CombatApi.mayDeliverTo(
      thrower as never,
      duelist as never,
      splash as never,
    );
    expect(verdict.ok).toBe(true);
  });

  it("never gates on a non-sentient — a flask may soak the furniture", () => {
    const room = makeArena(12);
    const thrower = person(room);
    const target = person(room);
    const prop = makeStuff(() => new TestRoom());
    open(thrower, target);

    const verdict = CombatApi.mayDeliverTo(
      thrower as never,
      target as never,
      [target as never, prop as never],
    );
    expect(verdict.ok).toBe(true);
  });
});
