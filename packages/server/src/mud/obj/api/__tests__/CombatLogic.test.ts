/**
 * CombatLogic — the fight engine, driven through the real
 * `CombatApi`/`SchedulerApi` the way `DialogueConversation.test` drives a
 * conversation. Bodied fighters are built the way
 * `material-response.inflict.test` builds them (a `BodyPlan` + `Species`),
 * with agency added by subclassing `Character`.
 *
 * The tick loop is stepped manually via `CombatApi.advance(session)` (a
 * live game clock would fire the emission; tests step it), so the
 * emergent-tempo mechanics are asserted deterministically.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
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
import Armor from "../../equipment/Armor";
import Shield from "../../equipment/Shield";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { CompetenceBandName } from "../../../lib/advancement/CompetenceBand";
import Material from "../../../lib/material/Material";
import { Construction } from "../../../lib/material/Construction";
import { ContainerMixin } from "../../../lib/spatial/Container";
import { ContainmentApi } from "../../../api/containment";
import { ProxyApi } from "../../../api/proxy";
import { StuffApi } from "../../../api/stuff";
import { SchedulerApi } from "../../../api/scheduler";
import { ConditionApi } from "../../../api/condition";
import { Quantity } from "../../../lib/quantity";
import { CombatApi } from "../../../api/combat";
import { CombatTerms, type TermsProposal } from "../../../lib/combat/CombatTerms";
import {
  COMBAT_PARTICIPANT_TYPE,
  CombatSession,
} from "../../../lib/combat/CombatSession";
import { PartyApi } from "../../../api/party";
import { AdvancementApi } from "../../../api/advancement";
import { AccountabilityApi } from "../../../api/accountability";
import { COMBAT_COUP_TYPE } from "../../../lib/combat/Coup";
import { PartyMemberMixin } from "../../../lib/party/PartyMember";
import { Party } from "../../Party";
import { CombatFormation } from "../../CombatFormation";
import type { Channel } from "../../../lib/material/Channel";
import EventRegistry from "../../EventRegistry";
import { EventApi } from "../../../api/event";

class TestRoom extends ContainerMixin(Idea) {}
class TestFighter extends Character {}
class TestPartyFighter extends PartyMemberMixin(TestFighter) {}

let seq = 0;

function mat(hardness: number, toughness: number, name: string): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, "MPa"));
  m.setToughness(Quantity.of(toughness, "MJ/m³"));
  m.setName(name);
  stampTemplatePathForTest(m, `/obj/material/test/m-${seq++}`);
  return m;
}
const steel = () => mat(600, 200, "steel");

function planPathOf(c: TestFighter): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

interface FighterOpts {
  natural?: Channel;
  weaponForm?: string;
  weaponMaterial?: Material;
  /** Authored weapon mass (kg) — drives the derived balance → tempo/poise. */
  weaponMass?: number;
  /** Authored weapon length (m) — drives the derived reach. */
  weaponLength?: number;
  /** Give the fighter a wielded shield (off-hand). */
  shield?: boolean;
  /** Shield armor construction form (default `plate`). */
  shieldForm?: string;
  /** Shield material. */
  shieldMaterial?: Material;
  /** A second weapon in the off-hand (dual-wield). */
  offWeaponForm?: string;
  ctor?: new () => TestFighter;
}

function makeFighter(room: TestRoom, opts: FighterOpts = {}): TestFighter {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("test-biped");
  plan.setSlots([
    { name: "torso", accepts: "WearableMixin", capacity: 2, covers: ["body.torso"] },
    { name: "grip", accepts: "WieldableMixin", covers: ["body.arm.right"] },
    { name: "offgrip", accepts: "WieldableMixin" },
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
      key: "body.head",
      parent: "body.torso",
      tissues: [{ tissuePath: "/obj/material/tissue/flesh", mass: 4 }],
    },
    {
      key: "body.arm.right",
      parent: "body.torso",
      tissues: [{ tissuePath: "/obj/material/tissue/flesh", mass: 3 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/obj/species/BodyPlan/test-fighter-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/obj/species/test/fighter-${id}`);

  const f = makeStuff(() => new (opts.ctor ?? TestFighter)());
  // A distinct templatePath per fighter — combat's side seam keys a
  // partyless combatant's `solo:<templatePath>` on it (production
  // combatants always carry one).
  stampTemplatePathForTest(f, `/test/fighter-${id}`);
  f.setSpecies(species);
  if (opts.natural) f.naturalAttackChannel = opts.natural;
  ContainmentApi.move(f as never, room as never);
  if (opts.weaponForm) {
    const w = makeStuff(() => new Weapon());
    if (opts.weaponMaterial) w.setMaterial(opts.weaponMaterial);
    w.setConstruction(Construction.of(opts.weaponForm));
    if (opts.weaponMass !== undefined) w.setMass(Quantity.of(opts.weaponMass, "kg"));
    if (opts.weaponLength !== undefined) {
      w.setLength(Quantity.of(opts.weaponLength, "m"));
    }
    w.setSlotClaim(planPathOf(f), ["grip"]);
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(w, "grip");
  }
  if (opts.shield) {
    const sh = makeStuff(() => new Shield());
    if (opts.shieldMaterial) sh.setMaterial(opts.shieldMaterial);
    sh.setConstruction(Construction.of(opts.shieldForm ?? "plate"));
    sh.setSlotClaim(planPathOf(f), ["offgrip"]);
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(sh, "offgrip");
  }
  if (opts.offWeaponForm) {
    const ow = makeStuff(() => new Weapon());
    ow.setConstruction(Construction.of(opts.offWeaponForm));
    ow.setSlotClaim(planPathOf(f), ["offgrip"]);
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(ow, "offgrip");
  }
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
const lethal: TermsProposal = {
  lethality: "lethal",
  stopCondition: "death",
  stakes: "",
};

// Track opened sessions so we can tear down their real-time recurring
// tick after each test (the beat is now a `ScheduleApi.recurring` timer,
// not a game-clock emission — an unresolved fight would leak a handle).
const openSessions: CombatSession[] = [];

function open(
  a: TestFighter,
  b: TestFighter,
  proposal: TermsProposal,
  consented = true,
): CombatSession {
  const terms = CombatTerms.agreed(
    a.getTemplatePath() ?? "a",
    proposal,
    consented,
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
  // Tear down any still-running fight so its recurring tick handle is
  // cancelled (dissolve is idempotent on a resolved session).
  for (const s of openSessions.splice(0)) s.dissolve();
  StuffApi.clearAll();
});

describe("CombatLogic — session lifecycle", () => {
  it("opens a session holding the body slot on both combatants", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);

    // Every participant carries the same uniform hold (the initiator no
    // longer holds a distinct session engagement).
    expect(a.getEngagementBySlot("body")?.type).toBe(COMBAT_PARTICIPANT_TYPE);
    expect(b.getEngagementBySlot("body")?.type).toBe(COMBAT_PARTICIPANT_TYPE);
    expect(CombatApi.sessionFor(a)).toBe(session);
    expect(CombatApi.sessionFor(b)).toBe(session);
  });

  it("declines a second fight for an already-engaged combatant", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const c = makeFighter(room, { weaponForm: "bladed" });
    open(a, b, nonLethal);
    const terms = CombatTerms.agreed("a", nonLethal, true);
    const res = CombatApi.openSession(a as never, c as never, terms);
    expect(res.ok).toBe(false);
  });
});

describe("CombatLogic — poise economy", () => {
  it("a committed strike spends the actor's own poise", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    const sa = session.getState(a)!;

    expect(sa.poise.band()).toBe("steady");
    CombatApi.queueGambit(a, "strike");
    CombatApi.advance(session);
    // Committing a gambit erodes + overextends the actor off steady.
    expect(sa.poise.band()).not.toBe("steady");
  });

  it("a deliberate strike while broken whiffs and self-opens", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    const sa = session.getState(a)!;

    // Drive A's poise to broken directly, then a deliberate strike whiffs.
    sa.poise.erode(0.85, 0);
    expect(sa.poise.isBroken() || sa.poise.isOpen()).toBe(true);
    CombatApi.queueGambit(a, "strike");
    CombatApi.advance(session);
    // Whiff spends the whiff penalty — still open/broken (self-opened).
    expect(sa.poise.band() === "open" || sa.poise.band() === "broken").toBe(
      true,
    );
  });
});

describe("CombatLogic — gambit eligibility (injury edits the menu)", () => {
  it("a disarmed combatant with no natural attack loses strike", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" }); // armed, no innate
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    const sa = session.getState(a)!;

    expect(CombatApi.eligibilityFor(a, "strike").ok).toBe(true);
    sa.flags.add("disarmed");
    const elig = CombatApi.eligibilityFor(a, "strike");
    expect(elig.ok).toBe(false);
    expect(elig.reason).toBe("no-instrument");
  });

  it("a natural-weapon fighter keeps strike when disarmed", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { natural: "point" }); // claws, no weapon
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(a)!.flags.add("disarmed");
    expect(CombatApi.eligibilityFor(a, "strike").ok).toBe(true);
  });

  it("an impaired (fractured) grip loses the weapon strike", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    open(a, b, nonLethal);
    expect(CombatApi.eligibilityFor(a, "strike").ok).toBe(true);

    // Fracture the grip slot's part (body.arm.right) hard enough to impair.
    ConditionApi.inflict(a, { mechanism: "blunt", site: "body.arm.right", energy: 6 });
    // The engine drops the weapon when its grip slot is impaired; with no
    // innate attack, strike is lost.
    const elig = CombatApi.eligibilityFor(a, "strike");
    if (a.isSlotImpairedByTrauma("grip")) {
      expect(elig.ok).toBe(false);
    }
  });

  it("disarm needs the opponent to be armed", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const unarmed = makeFighter(room, { natural: "blunt" }); // no weapon
    const session = open(a, unarmed, nonLethal);
    void session;
    const elig = CombatApi.eligibilityFor(a, "disarm");
    expect(elig.ok).toBe(false);
    expect(elig.reason).toBe("target-unarmed");
  });
});

describe("CombatLogic — resolution", () => {
  it("the cull: a lethal fight resolves to death with a dead loser", () => {
    const room = makeStuff(() => new TestRoom());
    const player = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const beast = makeFighter(room, { natural: "point" });
    const session = open(player, beast, lethal, true);

    // Step the fight to resolution (bounded).
    for (let i = 0; i < 60 && session.isActive(); i++) {
      CombatApi.advance(session);
    }
    expect(session.isActive()).toBe(false);
    expect(session.getResolution()).toBe("death");
    // One of the two is dead.
    const deadCount = [player, beast].filter(
      (c) => c.getLifecycleState() === "dead",
    ).length;
    expect(deadCount).toBe(1);
  });

  it("a non-lethal fight ends at incapacitation, no one dead", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);

    for (let i = 0; i < 60 && session.isActive(); i++) {
      CombatApi.advance(session);
    }
    expect(session.isActive()).toBe(false);
    expect(["incapacitation", "yield", "draw", "first-blood"]).toContain(
      session.getResolution(),
    );
    expect(a.getLifecycleState()).not.toBe("dead");
    expect(b.getLifecycleState()).not.toBe("dead");
  });

  it("yielding resolves the fight", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    expect(CombatApi.yieldFight(a)).toBe(true);
    expect(session.isActive()).toBe(false);
    expect(session.getResolution()).toBe("yield");
  });
});

describe("CombatLogic — the exchange writes consequence", () => {
  it("a landed strike routes through inflict; armor changes the outcome", () => {
    // Bare target, reeling (not open → a normal land to the torso).
    const room1 = makeStuff(() => new TestRoom());
    const atkr = makeFighter(room1, { weaponForm: "bladed", weaponMaterial: steel() });
    const bare = makeFighter(room1, { weaponForm: "bladed" });
    const s1 = open(atkr, bare, nonLethal);
    s1.getState(bare)!.poise.erode(0.6, 0); // → reeling (0.4)
    CombatApi.queueGambit(atkr, "strike");
    CombatApi.advance(s1);
    expect(bare.getConditions().some((c) => c.kind === "trauma")).toBe(true);

    // Armored target: plate over the torso turns the same edge blow.
    const room2 = makeStuff(() => new TestRoom());
    const atkr2 = makeFighter(room2, { weaponForm: "bladed", weaponMaterial: steel() });
    const armored = makeFighter(room2, { weaponForm: "bladed" });
    const plate = makeStuff(() => new Armor());
    plate.setMaterial(steel());
    plate.setConstruction(Construction.of("plate"));
    plate.setSlotClaim(planPathOf(armored), ["torso"]);
    (armored as unknown as { occupy(x: unknown, s: string): void }).occupy(
      plate,
      "torso",
    );
    const s2 = open(atkr2, armored, nonLethal);
    s2.getState(armored)!.poise.erode(0.6, 0);
    CombatApi.queueGambit(atkr2, "strike");
    CombatApi.advance(s2);
    // Plate turns the edge — no torso trauma lands.
    expect(armored.getConditions().some((c) => c.kind === "trauma")).toBe(
      false,
    );
  });

  it("a parry fires the target's riposte", () => {
    const room = makeStuff(() => new TestRoom());
    const atkr = makeFighter(room, { weaponForm: "bladed" });
    const guard = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const session = open(atkr, guard, nonLethal);
    // Attacker reeling (not overextended) drives a hard riposte; guard is
    // steady + armed, so the attacker's strike is parried.
    session.getState(atkr)!.poise.erode(0.55, 0); // → reeling
    CombatApi.queueGambit(atkr, "strike");
    CombatApi.advance(session);
    // The riposte landed on the attacker.
    expect(atkr.getConditions().some((c) => c.kind === "trauma")).toBe(true);
  });
});

describe("CombatLogic — melee (sides + join)", () => {
  /** Seed a two-member ad-hoc Party Idea straight into the graph. Party
   * mechanics aren't under test here — combat just needs a rostered side
   * — so the fixture writes the raw target past the participant-gated
   * mutation surface (the sanctioned RAW_TARGET test seam). */
  function seedParty(a: TestFighter, b: TestFighter): void {
    const p = makeStuff(() => new Party());
    stampTemplatePathForTest(p, `/obj/party/crew-${seq++}`);
    const raw = ProxyApi.unwrap(p) as Party;
    raw.setName(`crew-${seq++}`);
    raw.setCombatSide("faction:allies");
    raw.addMember(a.getTemplatePath()!);
    raw.addMember(b.getTemplatePath()!);
    const path = p.getTemplatePath()!;
    (a as unknown as { activePartyPath: string }).activePartyPath = path;
    (b as unknown as { activePartyPath: string }).activePartyPath = path;
  }

  it("an ally joins on your side; allies never get an attack edge, and 2v1 downs the lone foe", () => {
    const room = makeStuff(() => new TestRoom());
    const player = makeFighter(room, {
      ctor: TestPartyFighter,
      weaponForm: "bladed",
      weaponMaterial: steel(),
    });
    const ally = makeFighter(room, {
      ctor: TestPartyFighter,
      weaponForm: "bladed",
      weaponMaterial: steel(),
    });
    const foe = makeFighter(room, { weaponForm: "bladed" });
    seedParty(player, ally);

    // Player and ally are allied; the foe is a solo side.
    expect(PartyApi.areAllied(player, ally)).toBe(true);
    expect(PartyApi.areAllied(player, foe)).toBe(false);

    const session = open(player, foe, lethal, true);
    // The ally joins the fight on the foe.
    const joined = CombatApi.join(ally as never, foe as never, session.getTerms());
    expect(joined.ok).toBe(true);
    expect(session.getCombatants()).toHaveLength(3);

    for (let i = 0; i < 40 && session.isActive(); i++) {
      CombatApi.advance(session);
    }

    // Allies never opened an attack edge on each other.
    const graph = session.getGraph();
    expect(graph.edgeBetween(player, ally)).toBeUndefined();
    expect(graph.edgeBetween(ally, player)).toBeUndefined();
    // The lone foe went down under the 2v1 (dead or the fight resolved).
    expect(
      foe.getLifecycleState() === "dead" || !session.isActive(),
    ).toBe(true);
  });

  it("focus-fire: a lone defender falls faster to two attackers than to one", () => {
    const beatsToResolve = (nAttackers: number): number => {
      const room = makeStuff(() => new TestRoom());
      const attackers = Array.from({ length: nAttackers }, () =>
        makeFighter(room, {
          ctor: TestPartyFighter,
          weaponForm: "bladed",
          weaponMaterial: steel(),
        }),
      );
      const defender = makeFighter(room, {
        weaponForm: "bladed",
        weaponMaterial: steel(),
      });
      if (nAttackers === 2) seedParty(attackers[0]!, attackers[1]!);
      const session = open(attackers[0]!, defender, lethal, true);
      for (let i = 1; i < nAttackers; i++) {
        CombatApi.join(attackers[i]! as never, defender as never, session.getTerms());
      }
      let beats = 0;
      while (session.isActive() && beats < 200) {
        CombatApi.advance(session);
        beats++;
      }
      return beats;
    };
    // Deterministic engine (poker, not slots): the same setup resolves in
    // the same number of beats, and two attackers (focus-fire + double the
    // exchanges) down the lone defender strictly sooner.
    expect(beatsToResolve(2)).toBeLessThan(beatsToResolve(1));
  });

  it("defend <ally> interposes: the foe's edge redirects off the ally onto you", () => {
    const room = makeStuff(() => new TestRoom());
    const player = makeFighter(room, {
      ctor: TestPartyFighter,
      weaponForm: "bladed",
    });
    const ally = makeFighter(room, { ctor: TestPartyFighter, weaponForm: "bladed" });
    const foe = makeFighter(room, { weaponForm: "bladed" });
    seedParty(player, ally);

    // The ally is fighting the foe; the player is not yet engaged.
    const session = open(ally, foe, lethal, true);
    expect(session.getGraph().edgeBetween(foe, ally)).toBeDefined();
    expect(CombatApi.sessionFor(player)).toBeUndefined();

    const res = CombatApi.defendAlly(player, ally);
    expect(res.ok).toBe(true);
    // The player joined the fight; the foe now presses the player, not the ally.
    expect(CombatApi.sessionFor(player)).toBe(session);
    const graph = session.getGraph();
    expect(graph.edgeBetween(foe, ally)).toBeUndefined();
    expect(graph.edgeBetween(foe, player)).toBeDefined();
  });

  it("fleeing: a lone foe lets you break off; two attackers pin you", () => {
    // 1v1 → the disengage succeeds and drops you from the fight.
    const room1 = makeStuff(() => new TestRoom());
    const attacker = makeFighter(room1, { weaponForm: "bladed" });
    const fleer = makeFighter(room1, { weaponForm: "bladed" });
    const session1 = open(attacker, fleer, lethal, true);
    expect(CombatApi.sessionFor(fleer)).toBe(session1);
    const broke = CombatApi.disengage(fleer);
    expect(broke.ok).toBe(true);
    expect(CombatApi.sessionFor(fleer)).toBeUndefined();

    // 2-on-1 → the focus-fire pin vetoes the break.
    const room2 = makeStuff(() => new TestRoom());
    const a1 = makeFighter(room2, { ctor: TestPartyFighter, weaponForm: "bladed" });
    const a2 = makeFighter(room2, { ctor: TestPartyFighter, weaponForm: "bladed" });
    const pinned = makeFighter(room2, { weaponForm: "bladed" });
    seedParty(a1, a2);
    const session2 = open(a1, pinned, lethal, true);
    CombatApi.join(a2 as never, pinned as never, session2.getTerms());
    const blocked = CombatApi.disengage(pinned);
    expect(blocked.ok).toBe(false);
    expect(CombatApi.sessionFor(pinned)).toBe(session2); // still stuck in it
  });
});


describe("CombatLogic — determinism (the gym's foundation)", () => {
  function runToEnd(session: CombatSession): {
    resolution: string | null;
    beats: number;
  } {
    let beats = 0;
    while (session.isActive() && beats < 300) {
      CombatApi.advance(session);
      beats++;
    }
    return { resolution: session.getResolution(), beats };
  }

  it("a single session is deterministic — identical inputs, identical outcome", () => {
    const room1 = makeStuff(() => new TestRoom());
    const a1 = makeFighter(room1, { weaponForm: "bladed", weaponMaterial: steel() });
    const b1 = makeFighter(room1, { weaponForm: "bladed", weaponMaterial: steel() });
    const r1 = runToEnd(open(a1, b1, lethal, true));

    const room2 = makeStuff(() => new TestRoom());
    const a2 = makeFighter(room2, { weaponForm: "bladed", weaponMaterial: steel() });
    const b2 = makeFighter(room2, { weaponForm: "bladed", weaponMaterial: steel() });
    const r2 = runToEnd(open(a2, b2, lethal, true));

    // No aleatory randomness anywhere in the exchange path: same inputs →
    // the same resolution and the same beat count, bit-for-bit.
    expect(r1.resolution).toBe(r2.resolution);
    expect(r1.beats).toBe(r2.beats);
  });
});

describe("CombatLogic — the feint (poker, not slots)", () => {
  it("a committed, un-reading defender bites — their guard cracks open", () => {
    const room = makeStuff(() => new TestRoom());
    const attacker = makeFighter(room, { weaponForm: "bladed" });
    const defender = makeFighter(room, { weaponForm: "bladed" });
    const session = open(attacker, defender, nonLethal);
    // A dull defender (below the read gate) — will bite the feint.
    session.getState(defender)!.sharpness = 0.2;
    // Fresh defender is steady + armed (the turtle the feint punishes).
    expect(session.getState(defender)!.poise.band()).toBe("steady");

    CombatApi.queueGambit(attacker, "feint");
    CombatApi.advance(session);

    // The bait worked: the defender over-committed and is now wide open.
    expect(session.getState(defender)!.poise.isOpen()).toBe(true);
  });

  it("a defender who reads the feint is not fooled — no opening", () => {
    const room = makeStuff(() => new TestRoom());
    const attacker = makeFighter(room, { weaponForm: "bladed" });
    const defender = makeFighter(room, { weaponForm: "bladed" });
    const session = open(attacker, defender, nonLethal);
    // A sharp defender (at/above the read gate) reads the feint.
    session.getState(defender)!.sharpness = 0.95;

    CombatApi.queueGambit(attacker, "feint");
    CombatApi.advance(session);

    // The feint fizzled — the reader's guard never cracked from the bait.
    expect(session.getState(defender)!.poise.isOpen()).toBe(false);
  });
});

describe("CombatLogic — the fog (competence-graded read)", () => {
  it("a dull reader mistakes a feint for a real opening", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(a)!.sharpness = 0.2; // dull reader
    CombatApi.queueGambit(b, "feint"); // b presents a feint

    const read = CombatApi.assess(a, b);
    expect(read.ok).toBe(true);
    expect(read.poiseBand).toBe("open"); // bait reads as a real opening
    expect(read.read).toBeUndefined(); // no tell — didn't see through it
  });

  it("a sharp reader sees the true band and the feint's tell", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(a)!.sharpness = 0.95; // sharp reader
    CombatApi.queueGambit(b, "feint");

    const read = CombatApi.assess(a, b);
    expect(read.ok).toBe(true);
    expect(read.poiseBand).toBe("steady"); // sees b's true (fresh) band
    expect(read.read).toBe("feint"); // and the tell
  });

  it("perceive is free (no beat cost) — the fight status read", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(a)!.sharpness = 0.9;

    const read = CombatApi.perceive(a);
    expect(read.ok).toBe(true);
    expect(read.poiseBand).toBe("steady");
    // Unlike assess, a free glance does NOT spend the actor's next exchange.
    expect(session.getState(a)!.queuedGambit).toBeNull();
  });
});

/** A standalone weapon (not wielded) for reading its derived profile. */
function makeWeapon(
  form: string,
  massKg: number,
  lengthM: number,
  material?: Material,
): Weapon {
  const w = makeStuff(() => new Weapon());
  if (material) w.setMaterial(material);
  w.setConstruction(Construction.of(form));
  w.setMass(Quantity.of(massKg, "kg"));
  w.setLength(Quantity.of(lengthM, "m"));
  stampTemplatePathForTest(w, `/test/weapon-${seq++}`);
  return w;
}

describe("CombatLogic — balance → poise/tempo (guard-breaker ↔ exploiter)", () => {
  it("weaponProfileOf derives ordered factors (config-injected)", () => {
    const dagger = CombatApi.weaponProfileOf(makeWeapon("bladed", 0.3, 0.25, steel()))!;
    const hammer = CombatApi.weaponProfileOf(makeWeapon("hafted", 3.2, 1.1, steel()))!;
    // Exploiter faster, guard-breaker slower.
    expect(dagger.tempoFactor()).toBeGreaterThan(hammer.tempoFactor());
    // Guard-breaker hits harder and commits dearer.
    expect(hammer.poiseDamageFactor()).toBeGreaterThan(dagger.poiseDamageFactor());
    expect(hammer.overextendFactor()).toBeGreaterThan(dagger.overextendFactor());
  });

  it("a heavier weapon lands a more severe wound (energy scales with poise-damage)", () => {
    // Same channel (bladed) + same steel + open target: the only difference is
    // mass, so the wound severity isolates the poise-damage energy scaling.
    function severityOfExploit(weaponMass: number): number {
      const room = makeStuff(() => new TestRoom());
      const atkr = makeFighter(room, {
        weaponForm: "bladed",
        weaponMaterial: steel(),
        weaponMass,
        weaponLength: 0.9,
      });
      const target = makeFighter(room, { weaponForm: "bladed" });
      const session = open(atkr, target, nonLethal);
      // Keep the target OPEN each beat (the hardest energy band) until the
      // attacker — slow for a heavy weapon — lands its exploit.
      for (let i = 0; i < 12 && session.isActive(); i++) {
        const ts = session.getState(target);
        if (!ts) break;
        ts.poise.erode(0.9, i);
        CombatApi.queueGambit(atkr, "strike");
        CombatApi.advance(session);
        const traumas = target
          .getConditions()
          .filter((c) => c.kind === "trauma") as { severity: number }[];
        if (traumas.length) {
          return traumas.reduce((m, t) => Math.max(m, t.severity), 0);
        }
      }
      return 0;
    }
    const heavy = severityOfExploit(3.0);
    const light = severityOfExploit(0.3);
    expect(heavy).toBeGreaterThan(light);
  });
});

describe("CombatLogic — guard → parry (a flail bypasses a steady guard)", () => {
  it("a crossguard defender parries + ripostes; a guardless flail does neither", () => {
    // A steady, armed crossguard defender parries the reeling attacker's
    // strike and ripostes it → the attacker takes a wound.
    const room1 = makeStuff(() => new TestRoom());
    const atkr1 = makeFighter(room1, { weaponForm: "bladed" });
    const sword = makeFighter(room1, {
      weaponForm: "bladed",
      weaponMaterial: steel(),
      weaponMass: 1.0,
      weaponLength: 0.9,
    });
    const s1 = open(atkr1, sword, nonLethal);
    let riposted = false;
    for (let i = 0; i < 6 && s1.isActive(); i++) {
      const as = s1.getState(atkr1);
      if (!as) break;
      as.poise.erode(0.55, i); // keep the attacker reeling (hard riposte)
      CombatApi.queueGambit(atkr1, "strike");
      CombatApi.queueGambit(sword, "defend"); // stay steady, no offense
      CombatApi.advance(s1);
      if (atkr1.getConditions().some((c) => c.kind === "trauma")) {
        riposted = true;
        break;
      }
    }
    expect(riposted).toBe(true);

    // A guardless flail defender can't self-guard: the same strike is NOT
    // parried (no riposte), so the attacker takes no counter-wound — the
    // guard-breaker bypasses the steady defence.
    const room2 = makeStuff(() => new TestRoom());
    const atkr2 = makeFighter(room2, { weaponForm: "bladed" });
    const flail = makeFighter(room2, {
      weaponForm: "flail",
      weaponMaterial: steel(),
      weaponMass: 1.4,
      weaponLength: 0.9,
    });
    const s2 = open(atkr2, flail, nonLethal);
    for (let i = 0; i < 6 && s2.isActive(); i++) {
      const as = s2.getState(atkr2);
      if (!as) break;
      as.poise.erode(0.55, i);
      CombatApi.queueGambit(atkr2, "strike");
      CombatApi.queueGambit(flail, "defend");
      CombatApi.advance(s2);
    }
    // The flail can't parry → never ripostes → the attacker is never
    // counter-wounded (the guard-breaker bypasses the steady flail defence).
    expect(atkr2.getConditions().some((c) => c.kind === "trauma")).toBe(false);
  });
});

describe("CombatLogic — reach range tier (control until closed, reversed inside)", () => {
  // Reach derives from length + mass (not material), so these stay
  // material-free — avoids sharing a Material captured at collection time.
  const spearOpts = {
    weaponForm: "pointed",
    weaponMass: 1.8,
    weaponLength: 2.4,
  } as const;
  const daggerOpts = {
    weaponForm: "bladed",
    weaponMass: 0.3,
    weaponLength: 0.25,
  } as const;

  /**
   * ⚠ **Re-derived for D37.** This used to assert that reach rank decided
   * the opening band — `reach` when the pair's reaches differed, `close`
   * when equal. The ranged build moved that: a fight now opens at
   * whatever band the ARENA affords, because you notice someone across a
   * room before you are on top of them.
   *
   * Reach rank did not stop mattering; it moved to where it belongs — who
   * controls the gap once the fight is on (the contest below), not where
   * the fight starts.
   */
  it("the ARENA opens the pair's band — reach rank no longer decides it", () => {
    const room = makeStuff(() => new TestRoom());
    const spear = makeFighter(room, spearOpts);
    const dagger = makeFighter(room, daggerOpts);
    const s = open(spear, dagger, nonLethal);
    const mixedReach = s.getGraph().rangeBetween(spear, dagger);

    const room2 = makeStuff(() => new TestRoom());
    const d1 = makeFighter(room2, daggerOpts);
    const d2 = makeFighter(room2, daggerOpts);
    const s2 = open(d1, d2, nonLethal);
    const equalReach = s2.getGraph().rangeBetween(d1, d2);

    // Same room shape → same opening band, whatever the weapons are.
    expect(equalReach).toBe(mixedReach);
    // And that band is the conservative melee cap: a plain container
    // reports no linear extent, so it cannot promise ranged distance.
    expect(mixedReach).toBe("reach");
  });

  function trauma(f: TestFighter): number {
    return f.getConditions().filter((c) => c.kind === "trauma").length;
  }

  /** Run a forced attrition matchup (both always strike) with the range
   * pinned each beat; report how many wounds each side TOOK. The
   * out-of-ranged fighter can't connect, so it inflicts none — a
   * deterministic invariant, robust to the exact fight timing. */
  function pinnedWounds(
    spear: TestFighter,
    dagger: TestFighter,
    range: "reach" | "close",
  ): { spearHurt: number; daggerHurt: number } {
    const session = open(spear, dagger, nonLethal);
    for (let i = 0; i < 150 && session.isActive(); i++) {
      session.getGraph().setRange(spear, dagger, range);
      CombatApi.queueGambit(spear, "strike");
      CombatApi.queueGambit(dagger, "strike");
      CombatApi.advance(session);
    }
    session.dissolve();
    return { spearHurt: trauma(spear), daggerHurt: trauma(dagger) };
  }

  it("the spear controls at reach (the dagger can't connect), reversed once closed", () => {
    const room1 = makeStuff(() => new TestRoom());
    const reach = pinnedWounds(
      makeFighter(room1, spearOpts),
      makeFighter(room1, daggerOpts),
      "reach",
    );
    // At reach the dagger is out of range: it wounds the spear zero times,
    // while the spear reaches and wounds the dagger.
    expect(reach.spearHurt).toBe(0);
    expect(reach.daggerHurt).toBeGreaterThan(0);

    const room2 = makeStuff(() => new TestRoom());
    const close = pinnedWounds(
      makeFighter(room2, spearOpts),
      makeFighter(room2, daggerOpts),
      "close",
    );
    // Inside, it reverses: the spear is the liability and can't land; the
    // dagger owns the clinch.
    expect(close.daggerHurt).toBe(0);
    expect(close.spearHurt).toBeGreaterThan(0);
  });

  it("a composed reach-holder contests a close; a reeling one can't", () => {
    const room = makeStuff(() => new TestRoom());
    const spear = makeFighter(room, spearOpts);
    const dagger = makeFighter(room, daggerOpts);
    const s = open(spear, dagger, nonLethal);
    expect(s.getGraph().rangeBetween(spear, dagger)).toBe("reach");

    // A steady spear-holder keeps the dagger out — the close stays contested
    // for several beats (the dagger keeps trying, the spear keeps composed).
    for (let i = 0; i < 5 && s.isActive(); i++) {
      s.getState(spear)!.poise.restore(1, 1); // pin the spear composed
      CombatApi.queueGambit(dagger, "close");
      CombatApi.queueGambit(spear, "defend");
      CombatApi.advance(s);
    }
    expect(s.getGraph().rangeBetween(spear, dagger)).toBe("reach");

    // Break the spear-holder's poise → it can no longer hold distance, so a
    // persistent dagger finally closes.
    for (let i = 0; i < 6 && s.isActive(); i++) {
      s.getState(spear)!.poise.erode(0.7, i); // keep it reeling
      CombatApi.queueGambit(dagger, "close");
      CombatApi.advance(s);
      if (s.getGraph().rangeBetween(spear, dagger) === "close") break;
    }
    expect(s.getGraph().rangeBetween(spear, dagger)).toBe("close");
  });

  /**
   * ⚠ **Re-derived for D37.** The subject — per-edge independence — is
   * unchanged and matters more under four bands than it did under two.
   * What changed is the setup: both edges now OPEN at the same arena
   * band, so the independence has to be demonstrated by moving one and
   * showing the other does not follow, rather than by relying on the two
   * pairs opening differently.
   *
   * This is the model's core claim stated as prose: *you're keeping the
   * swordsman at bowshot while his partner is already on top of you.*
   */
  it("a 2v1 carries independent per-edge ranges", () => {
    const room = makeStuff(() => new TestRoom());
    const spear = makeFighter(room, spearOpts);
    const target = makeFighter(room, daggerOpts);
    const dagger2 = makeFighter(room, daggerOpts);
    const s = open(spear, target, nonLethal);
    const joined = CombatApi.join(dagger2 as never, target as never, s.getTerms());
    expect(joined.ok).toBe(true);

    // Both pairs open at the same arena band.
    expect(s.getGraph().rangeBetween(spear, target)).toBe("reach");
    expect(s.getGraph().rangeBetween(dagger2, target)).toBe("reach");

    // Move ONE pair inside. The other is untouched — no composition, no
    // propagation, no derived position.
    s.getGraph().setRange(dagger2, target, "close");
    expect(s.getGraph().rangeBetween(dagger2, target)).toBe("close");
    expect(s.getGraph().rangeBetween(spear, target)).toBe("reach");
  });
});

describe("CombatLogic — shield (wielded armor-construction)", () => {
  function shieldOf(f: TestFighter): Stuff {
    const occ = [
      ...(
        f as unknown as { getOccupants(s: string): Iterable<Stuff> }
      ).getOccupants("offgrip"),
    ];
    return occ[0]!;
  }

  it("a faced shield turns the blow through the covering stack; a flank bypasses it", () => {
    const room = makeStuff(() => new TestRoom());
    const def = makeFighter(room, { shield: true, shieldMaterial: steel() });
    // A faced edge blow is deflected by the steel (plate) shield — no wound.
    const faced = ConditionApi.inflict(def as never, {
      mechanism: "edge",
      site: "body.torso",
      energy: 3,
      shieldFacing: true,
    });
    // A flanking blow (a second attacker under focus-fire) slips past the
    // shield and wounds at full force — directional coverage.
    const flank = ConditionApi.inflict(def as never, {
      mechanism: "edge",
      site: "body.torso",
      energy: 3,
      shieldFacing: false,
    });
    expect(flank.afflicted).toBe(true);
    // The steel shield turns the faced blow into a scratch — a fraction of
    // the flank's severity (the shield is in the covering stack).
    expect(faced.trauma.severity).toBeLessThan(flank.trauma.severity * 0.5);
  });

  it("a sundered (worn-out) shield stops protecting", () => {
    const room = makeStuff(() => new TestRoom());
    const pristine = makeFighter(room, { shield: true, shieldMaterial: steel() });
    const before = ConditionApi.inflict(pristine as never, {
      mechanism: "edge",
      site: "body.torso",
      energy: 3,
      shieldFacing: true,
    });

    const broken = makeFighter(room, { shield: true, shieldMaterial: steel() });
    // Wear the shield down (a shield-bash / sunder over many blows).
    (
      shieldOf(broken) as unknown as { setCondition(n: number): void }
    ).setCondition(0.01);
    const after = ConditionApi.inflict(broken as never, {
      mechanism: "edge",
      site: "body.torso",
      energy: 3,
      shieldFacing: true,
    });
    // A worn-out shield turns far less than a pristine one — the wound is worse.
    expect(after.trauma.severity).toBeGreaterThan(before.trauma.severity);
  });

  it("a 2v1 target carries two incoming edges (the shield fronts the first)", () => {
    const room = makeStuff(() => new TestRoom());
    const first = makeFighter(room, { weaponForm: "bladed" });
    const target = makeFighter(room, { shield: true, shieldMaterial: steel() });
    const flanker = makeFighter(room, { weaponForm: "bladed" });
    const s = open(first, target, nonLethal);
    CombatApi.join(flanker as never, target as never, s.getTerms());
    expect(s.getGraph().incomingEdges(target).length).toBe(2);
  });

  it("a shield lets even a guardless flail-wielder parry (the guard bonus)", () => {
    const room = makeStuff(() => new TestRoom());
    const atkr = makeFighter(room, { weaponForm: "bladed" });
    const flailShield = makeFighter(room, {
      weaponForm: "flail",
      weaponMaterial: steel(),
      weaponMass: 1.4,
      weaponLength: 0.9,
      shield: true,
      shieldMaterial: steel(),
    });
    const s = open(atkr, flailShield, nonLethal);
    let riposted = false;
    for (let i = 0; i < 6 && s.isActive(); i++) {
      const as = s.getState(atkr);
      if (!as) break;
      as.poise.erode(0.55, i);
      CombatApi.queueGambit(atkr, "strike");
      CombatApi.queueGambit(flailShield, "defend");
      CombatApi.advance(s);
      if (atkr.getConditions().some((c) => c.kind === "trauma")) {
        riposted = true;
        break;
      }
    }
    // The shield's guard bonus restores the parry+riposte a bare flail lacks.
    expect(riposted).toBe(true);
  });
});

describe("CombatLogic — hand-slot economy (switch / sidearm / dual-wield)", () => {
  function gripOccupants(f: TestFighter): Stuff[] {
    return [
      ...(
        f as unknown as { getOccupants(s: string): Iterable<Stuff> }
      ).getOccupants("grip"),
    ];
  }
  function carriedWeapon(f: TestFighter, form: string): Weapon {
    const w = makeStuff(() => new Weapon());
    w.setConstruction(Construction.of(form));
    w.setSlotClaim(planPathOf(f), ["grip"]);
    ContainmentApi.move(w as never, f as never);
    return w;
  }

  it("switching is a vulnerable durative beat (guard down) then swaps the grip", () => {
    const room = makeStuff(() => new TestRoom());
    const f = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const opp = makeFighter(room, { weaponForm: "bladed" });
    const backup = carriedWeapon(f, "hafted"); // a carried mace
    const s = open(f, opp, nonLethal);

    expect(CombatApi.beginSwitch(f, backup as never).ok).toBe(true);
    // Mid-switch: guard down, nothing to strike with.
    expect(CombatApi.eligibilityFor(f, "strike").ok).toBe(false);

    // Advance past the switch window (opp holds off so f survives the gap).
    for (let i = 0; i < 4 && s.isActive(); i++) {
      CombatApi.queueGambit(opp, "defend");
      CombatApi.advance(s);
    }
    // The backup is now in the grip and f can strike again.
    expect(gripOccupants(f)).toContain(backup);
    expect(CombatApi.eligibilityFor(f, "strike").ok).toBe(true);
  });

  it("a sidearm draw re-arms after a disarm (a setback, not a fight-ender)", () => {
    const room = makeStuff(() => new TestRoom());
    const f = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const opp = makeFighter(room, { weaponForm: "bladed" });
    carriedWeapon(f, "hafted"); // a sheathed backup
    const s = open(f, opp, nonLethal);
    // Simulate being disarmed.
    s.getState(f)!.flags.add("disarmed");
    expect(CombatApi.eligibilityFor(f, "strike").ok).toBe(false); // no weapon

    // Draw the sidearm (fast) and let the beat complete.
    expect(CombatApi.drawSidearm(f).ok).toBe(true);
    for (let i = 0; i < 3 && s.isActive(); i++) {
      CombatApi.queueGambit(opp, "defend");
      CombatApi.advance(s);
    }
    // Re-armed: the disarmed flag is cleared and f can strike again.
    expect(s.getState(f)?.flags.has("disarmed")).toBe(false);
    expect(CombatApi.eligibilityFor(f, "strike").ok).toBe(true);
  });

  it("draw fails cleanly when there's no sidearm to draw", () => {
    const room = makeStuff(() => new TestRoom());
    const f = makeFighter(room, { weaponForm: "bladed" });
    const opp = makeFighter(room, { weaponForm: "bladed" });
    open(f, opp, nonLethal);
    expect(CombatApi.drawSidearm(f).ok).toBe(false);
  });

  it("dual-wield is band-gated: a proficient off-hand parries where a novice fumbles", () => {
    // A flail (guard: none) can't self-guard — but a second (off-hand) weapon
    // covers it *if* the wielder is skilled enough. A novice fumbles it.
    function flailPlusOffhandRipostes(band: CompetenceBandName): boolean {
      const room = makeStuff(() => new TestRoom());
      const atkr = makeFighter(room, { weaponForm: "bladed" });
      const dw = makeFighter(room, {
        weaponForm: "flail",
        weaponMaterial: steel(),
        weaponMass: 1.4,
        weaponLength: 0.9,
        offWeaponForm: "bladed", // an off-hand blade
      });
      const s = open(atkr, dw, nonLethal);
      s.getState(dw)!.competenceBand = band;
      let riposted = false;
      for (let i = 0; i < 6 && s.isActive(); i++) {
        const as = s.getState(atkr);
        if (!as) break;
        as.poise.erode(0.55, i);
        CombatApi.queueGambit(atkr, "strike");
        CombatApi.queueGambit(dw, "defend");
        CombatApi.advance(s);
        if (atkr.getConditions().some((c) => c.kind === "trauma")) {
          riposted = true;
          break;
        }
      }
      return riposted;
    }
    // Proficient: the off-hand covers the guardless flail → parry + riposte.
    expect(flailPlusOffhandRipostes("proficient")).toBe(true);
    // Novice: the off-hand is a net penalty → still can't parry.
    expect(flailPlusOffhandRipostes("untrained")).toBe(false);
  });
});

describe("CombatLogic — weapon-shaped gambits (the weapon edits the menu)", () => {
  it("a hafted weapon affords sweep; a bladed one does not", () => {
    const room = makeStuff(() => new TestRoom());
    const hafted = makeFighter(room, { weaponForm: "hafted" });
    const bladed = makeFighter(room, { weaponForm: "bladed" });
    open(hafted, bladed, nonLethal);
    expect(CombatApi.eligibilityFor(hafted, "sweep").ok).toBe(true);
    const bladedTry = CombatApi.eligibilityFor(bladed, "sweep");
    expect(bladedTry.ok).toBe(false);
    expect(bladedTry.reason).toBe("wrong-weapon");
  });

  it("a shield affords bash; without one it's ineligible", () => {
    const room = makeStuff(() => new TestRoom());
    const shielded = makeFighter(room, {
      weaponForm: "bladed",
      shield: true,
      shieldMaterial: steel(),
    });
    const bare = makeFighter(room, { weaponForm: "bladed" });
    open(shielded, bare, nonLethal);
    expect(CombatApi.eligibilityFor(shielded, "bash").ok).toBe(true);
    const bareTry = CombatApi.eligibilityFor(bare, "bash");
    expect(bareTry.ok).toBe(false);
    expect(bareTry.reason).toBe("no-shield");
  });

  it("a whip affords entangle; other weapons don't", () => {
    const room = makeStuff(() => new TestRoom());
    const whip = makeFighter(room, {
      weaponForm: "whip",
      weaponMass: 0.6,
      weaponLength: 2.5,
    });
    const bladed = makeFighter(room, { weaponForm: "bladed" });
    open(whip, bladed, nonLethal);
    expect(CombatApi.eligibilityFor(whip, "entangle").ok).toBe(true);
    const bladedTry = CombatApi.eligibilityFor(bladed, "entangle");
    expect(bladedTry.ok).toBe(false);
    expect(bladedTry.reason).toBe("wrong-weapon");
  });

  it("entangle binds a foe with the grappled flag", () => {
    const room = makeStuff(() => new TestRoom());
    const whip = makeFighter(room, {
      weaponForm: "whip",
      weaponMass: 0.6,
      weaponLength: 2.5,
    });
    // An unarmed target (can't guard, can't answer at the whip's reach) — the
    // whip lashes at its reach advantage and the entangle lands.
    const target = makeFighter(room, {});
    const s = open(whip, target, nonLethal);
    let bound = false;
    for (let i = 0; i < 40 && s.isActive(); i++) {
      CombatApi.queueGambit(whip, "entangle");
      CombatApi.advance(s);
      if (s.getState(target)?.flags.has("grappled")) {
        bound = true;
        break;
      }
    }
    expect(bound).toBe(true);
  });
});

describe("CombatLogic — ambush (surprise denies the poise contest)", () => {
  function openWith(
    a: TestFighter,
    b: TestFighter,
    proposal: TermsProposal,
    opts: { ambush?: boolean },
  ): CombatSession {
    const terms = CombatTerms.agreed(a.getTemplatePath() ?? "a", proposal, true);
    const res = CombatApi.openSession(a as never, b as never, terms, opts);
    if (!res.ok) throw new Error(`openSession failed: ${res.reason}`);
    openSessions.push(res.session);
    return res.session;
  }

  it("an ambush open starts the DEFENDER broken/open, the attacker steady", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = openWith(a, b, nonLethal, { ambush: true });
    const sb = session.getState(b)!;
    expect(sb.poise.isBroken() || sb.poise.isOpen()).toBe(true);
    // Surprise hits only the surprised — the ambusher is untouched.
    const sa = session.getState(a)!;
    expect(sa.poise.band()).toBe("steady");
  });

  it("a normal (non-ambush) open leaves both fighters steady", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = openWith(a, b, nonLethal, {});
    expect(session.getState(a)!.poise.band()).toBe("steady");
    expect(session.getState(b)!.poise.band()).toBe("steady");
  });
});

/* ───────────── formations (the party-strategy layer, this build) ───────────── */

/** The four preset shapes, mirrored from seeds/lib/combat/CombatFormation/
 * (the seeds themselves are pinned against DEFAULT_POLICY in
 * CombatFormation.test; here the Ideas are made resident directly). */
const PRESETS: Record<
  string,
  {
    roles: string[];
    allocation: "sustain" | "called" | "primary";
    primaryRole?: string;
    protects?: string[];
    interceptors?: string[];
    trigger?: "none" | "any" | "high-threat";
    coupRight?: string;
    coupCall?: "engaged" | "captain";
  }
> = {
  default: { roles: [], allocation: "sustain" },
  "focus-fire": { roles: [], allocation: "called", coupCall: "captain" },
  vanguard: {
    roles: ["front", "back"],
    allocation: "sustain",
    protects: ["back"],
    interceptors: ["front"],
    trigger: "any",
  },
  "master-apprentice": {
    roles: ["master", "apprentice"],
    allocation: "primary",
    primaryRole: "apprentice",
    protects: ["apprentice"],
    interceptors: ["master"],
    trigger: "high-threat",
    coupRight: "apprentice",
    coupCall: "captain",
  },
};

/** Make a preset's formation Idea resident (sync findByTemplatePath is the
 * beat's consult path — no template DB needed). */
function residentFormation(name: string): CombatFormation {
  const spec = PRESETS[name]!;
  const f = makeStuff(() => new CombatFormation());
  f.setName(name);
  if (spec.roles.length) f.setRoles([...spec.roles]);
  f.setAllocation(spec.allocation);
  if (spec.primaryRole) f.setPrimaryRole(spec.primaryRole);
  if (spec.protects?.length) f.setProtectsRoles([...spec.protects]);
  if (spec.interceptors?.length) f.setInterceptorRoles([...spec.interceptors]);
  if (spec.trigger) f.setInterceptTrigger(spec.trigger);
  if (spec.coupRight) f.setCoupRight(spec.coupRight);
  if (spec.coupCall) f.setCoupCall(spec.coupCall);
  stampTemplatePathForTest(f, `/obj/CombatFormation/${name}`);
  return f;
}

/** Seed a rostered party with a formation + role assignments straight
 * into the graph (party mechanics aren't under test — the sanctioned
 * RAW_TARGET/unwrap seam, the melee seedParty precedent). `roles` maps
 * member index → role. Roster order = the members array order. */
function seedFormationParty(
  members: TestPartyFighter[],
  formation: string,
  roles: Record<number, string> = {},
  captainIdx = 0,
): Party {
  residentFormation(formation);
  const p = makeStuff(() => new Party());
  stampTemplatePathForTest(p, `/obj/party/formed-${seq++}`);
  const raw = ProxyApi.unwrap(p) as Party;
  raw.setName(`formed-${seq++}`);
  raw.setCombatSide("faction:formed");
  for (const m of members) raw.addMember(m.getTemplatePath()!);
  raw.setCaptainId(members[captainIdx]!.getTemplatePath()!);
  raw.setFormationPath(`/obj/CombatFormation/${formation}`);
  for (const [idx, role] of Object.entries(roles)) {
    raw.assignRole(members[Number(idx)]!.getTemplatePath()!, role);
  }
  const path = p.getTemplatePath()!;
  for (const m of members) {
    (m as unknown as { activePartyPath: string }).activePartyPath = path;
  }
  return p;
}

/**
 * A knife-armed fighter (the gym's dagger loadout): light blades erode
 * poise slowly, so a multi-fighter melee survives the beats these tests
 * inspect the live graph across (a heavier loadout can down a focused
 * target on beat 1, resolving the session and wiping its graph —
 * which is the mechanic working, but not what a graph assertion wants).
 */
function knifeFighter(room: TestRoom, party = true): TestFighter {
  const f = makeFighter(room, {
    ctor: party ? TestPartyFighter : TestFighter,
    weaponForm: "bladed",
    weaponMaterial: steel(),
    weaponMass: 0.3,
    weaponLength: 0.25,
  });
  // An AUTHORED weapon mass makes encumbrance real — and a massless test
  // body has zero carry capacity, so the 0.3kg knife would floor the
  // fighter's tempo at minRate (no exchanges at all). Give the bearer a
  // real body mass so capacity derives and the knives actually swing.
  f.setMass(Quantity.of(80, "kg"));
  return f;
}

describe("CombatLogic — formations: totality + byte-parity", () => {
  it("a party of 1 runs every preset clean (vacant roles inert)", () => {
    for (const name of Object.keys(PRESETS)) {
      StuffApi.clearAll();
      SchedulerApi._clearAllForTesting();
      const room = makeStuff(() => new TestRoom());
      const cap = knifeFighter(room) as TestPartyFighter;
      const foe = knifeFighter(room, false);
      seedFormationParty([cap], name);
      const session = open(cap, foe, nonLethal);
      let beats = 0;
      while (session.isActive() && beats < 300) {
        CombatApi.advance(session);
        beats++;
      }
      expect(session.getResolution()).not.toBeNull();
    }
  });

  it("a resident default formation leaves a canonical duel byte-identical", async () => {
    // Run A: the fallback path (no Idea resident — DEFAULT_POLICY).
    const room1 = makeStuff(() => new TestRoom());
    const a1 = makeFighter(room1, { weaponForm: "bladed", weaponMaterial: steel() });
    const b1 = makeFighter(room1, { weaponForm: "bladed", weaponMaterial: steel() });
    const s1 = open(a1, b1, nonLethal);
    let beats1 = 0;
    while (s1.isActive() && beats1 < 300) {
      CombatApi.advance(s1);
      beats1++;
    }
    const r1 = { resolution: s1.getResolution(), beats: beats1 };

    // Run B: identical fighters, but the default formation Idea is
    // RESIDENT and the initiator sits in a party that never chose (the
    // chain resolves default either way; the trace must not move).
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    await bootRegistry();
    residentFormation("default");
    const room2 = makeStuff(() => new TestRoom());
    const a2 = makeFighter(room2, {
      ctor: TestPartyFighter,
      weaponForm: "bladed",
      weaponMaterial: steel(),
    }) as TestPartyFighter;
    const b2 = makeFighter(room2, { weaponForm: "bladed", weaponMaterial: steel() });
    const p = makeStuff(() => new Party());
    stampTemplatePathForTest(p, `/obj/party/parity-${seq++}`);
    const rawP = ProxyApi.unwrap(p) as Party;
    rawP.setName("parity");
    rawP.addMember(a2.getTemplatePath()!);
    rawP.setCaptainId(a2.getTemplatePath()!);
    (a2 as unknown as { activePartyPath: string }).activePartyPath =
      p.getTemplatePath()!;
    const s2 = open(a2, b2, nonLethal);
    let beats2 = 0;
    while (s2.isActive() && beats2 < 300) {
      CombatApi.advance(s2);
      beats2++;
    }
    expect(s2.getResolution()).toBe(r1.resolution);
    expect(beats2).toBe(r1.beats);
  });
});

describe("CombatLogic — Focus Fire (the called target)", () => {
  it("a member converges on the captain's deliberate target", () => {
    const room = makeStuff(() => new TestRoom());
    const cap = knifeFighter(room) as TestPartyFighter;
    const ally = knifeFighter(room) as TestPartyFighter;
    const foe1 = knifeFighter(room, false);
    const foe2 = knifeFighter(room, false);
    seedFormationParty([cap, ally], "focus-fire");

    // The captain deliberately opens on foe1 (the call); foe2 piles onto
    // the captain; the ally enters against foe2 — under `called` the
    // ally's exchanges must still converge on the captain's target.
    const session = open(cap, foe1, nonLethal);
    expect(CombatApi.join(foe2 as never, cap as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(ally as never, foe2 as never, session.getTerms()).ok).toBe(true);

    // Exchanges are tempo-gated (a combatant may act 0 times on a given
    // beat) — advance a few knife beats; nobody downs this early.
    const graph = session.getGraph();
    for (let i = 0; i < 4 && !graph.edgeBetween(ally, foe1); i++) {
      CombatApi.advance(session);
    }
    expect(session.isActive()).toBe(true);
    // The ally's exchange edge landed on the CALLED target (foe1), not
    // only their own deliberate entry (foe2).
    expect(graph.edgeBetween(ally, foe1)).toBeTruthy();
    expect(graph.edgeCount(foe1)).toBeGreaterThanOrEqual(2);
  });

  it("no captain in the fight → allocation degrades to sustained", () => {
    const room = makeStuff(() => new TestRoom());
    const cap = knifeFighter(room) as TestPartyFighter;
    const ally = knifeFighter(room) as TestPartyFighter;
    const foe = knifeFighter(room, false);
    seedFormationParty([cap, ally], "focus-fire");

    // The captain never enters the session — there is no standing
    // captain to read a call from; the ally degrades to its own
    // sustained edge (no null branch, no error).
    const session = open(ally, foe, nonLethal);
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    expect(session.getGraph().edgeBetween(ally, foe)).toBeTruthy();
  });
});

describe("CombatLogic — Vanguard (interception)", () => {
  it("an edge onto a back-role member redirects to the front next beat", () => {
    const room = makeStuff(() => new TestRoom());
    const front = knifeFighter(room) as TestPartyFighter;
    const back = knifeFighter(room) as TestPartyFighter;
    const foe = knifeFighter(room, false);
    seedFormationParty([front, back], "vanguard", { 0: "front", 1: "back" });

    // The foe opens on the BACK member; the front joins the fight.
    const session = open(foe, back, nonLethal);
    expect(CombatApi.join(front as never, foe as never, session.getTerms()).ok).toBe(true);
    const graph = session.getGraph();
    expect(graph.edgeBetween(foe, back)).toBeTruthy();

    // Top of the next beat: the interception pass moves the foe's edge
    // off the protected back onto the standing front.
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    expect(graph.edgeBetween(foe, back)).toBeUndefined();
    expect(graph.edgeBetween(foe, front)).toBeTruthy();
  });

  it("two fronts, both free → the roster-first front takes the redirect", () => {
    const room = makeStuff(() => new TestRoom());
    const frontA = knifeFighter(room) as TestPartyFighter;
    const frontB = knifeFighter(room) as TestPartyFighter;
    const back = knifeFighter(room) as TestPartyFighter;
    const foe = knifeFighter(room, false);
    seedFormationParty(
      [frontA, frontB, back],
      "vanguard",
      { 0: "front", 1: "front", 2: "back" },
    );

    const session = open(foe, back, nonLethal);
    expect(CombatApi.join(frontB as never, foe as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(frontA as never, foe as never, session.getTerms()).ok).toBe(true);

    const graph = session.getGraph();
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    // Roles are sets — two front-holders resolve in party-ROSTER order
    // (frontA), not session join order (frontB joined first).
    expect(graph.edgeBetween(foe, back)).toBeUndefined();
    expect(graph.edgeBetween(foe, frontA)).toBeTruthy();
  });

  it("an over-pressed front is ineligible — the redirect walks past it", () => {
    const room = makeStuff(() => new TestRoom());
    const frontA = knifeFighter(room) as TestPartyFighter;
    const frontB = knifeFighter(room) as TestPartyFighter;
    const back = knifeFighter(room) as TestPartyFighter;
    const foe1 = knifeFighter(room, false);
    const foe2 = knifeFighter(room, false);
    const foe3 = knifeFighter(room, false);
    seedFormationParty(
      [frontA, frontB, back],
      "vanguard",
      { 0: "front", 1: "front", 2: "back" },
    );

    // Two foes pin frontA (edgeCount 2 = the maxIncoming ceiling), then a
    // third foe opens on the back member.
    const session = open(foe1, frontA, nonLethal);
    expect(CombatApi.join(foe2 as never, frontA as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(frontB as never, foe1 as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(back as never, foe1 as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(foe3 as never, back as never, session.getTerms()).ok).toBe(true);

    const graph = session.getGraph();
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    // frontA (roster-first) is pinned past the pressure ceiling — the
    // redirect walks to frontB (the next eligible holder).
    expect(graph.edgeBetween(foe3, back)).toBeUndefined();
    expect(graph.edgeBetween(foe3, frontB)).toBeTruthy();
  });

  it("no front standing → the clause is inert (no redirect, no error)", () => {
    const room = makeStuff(() => new TestRoom());
    const back = knifeFighter(room) as TestPartyFighter;
    const foe = knifeFighter(room, false);
    seedFormationParty([back], "vanguard", { 0: "back" });

    const session = open(foe, back, nonLethal);
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    // Nobody to intercept — the edge stays where it landed.
    expect(session.getGraph().edgeBetween(foe, back)).toBeTruthy();
  });
});

describe("CombatLogic — Master-Apprentice (primary + high-threat + ally-exploit)", () => {
  it("the master presses the apprentice's target (primary allocation)", () => {
    const room = makeStuff(() => new TestRoom());
    const master = knifeFighter(room) as TestPartyFighter;
    const apprentice = knifeFighter(room) as TestPartyFighter;
    const foe1 = knifeFighter(room, false);
    const foe2 = knifeFighter(room, false);
    seedFormationParty(
      [master, apprentice],
      "master-apprentice",
      { 0: "master", 1: "apprentice" },
      0,
    );

    // The apprentice opens on foe1; foe2 piles onto the apprentice; the
    // master enters against foe2 (their own sustained edge is foe2).
    const session = open(apprentice, foe1, nonLethal);
    expect(CombatApi.join(foe2 as never, apprentice as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(master as never, foe2 as never, session.getTerms()).ok).toBe(true);

    const graph = session.getGraph();
    for (let i = 0; i < 4 && !graph.edgeBetween(master, foe1); i++) {
      CombatApi.advance(session);
    }
    expect(session.isActive()).toBe(true);
    // Under `primary`, the master's exchange lands on the APPRENTICE's
    // target (foe1) — not the master's own sustained edge (foe2). The
    // apprentice keeps the primary engagement (and the credit).
    expect(graph.edgeBetween(master, foe1)).toBeTruthy();
  });

  it("two apprentices → the roster-first standing holder anchors the side", () => {
    const room = makeStuff(() => new TestRoom());
    const master = knifeFighter(room) as TestPartyFighter;
    const appA = knifeFighter(room) as TestPartyFighter;
    const appB = knifeFighter(room) as TestPartyFighter;
    const foe1 = knifeFighter(room, false);
    const foe2 = knifeFighter(room, false);
    seedFormationParty(
      [master, appA, appB],
      "master-apprentice",
      { 0: "master", 1: "apprentice", 2: "apprentice" },
    );

    // appA — the roster-FIRST apprentice — opens on foe1 (their sustained
    // target); appB enters via foe2; the master enters via foe2 too, so
    // the master's own sustained edge is foe2.
    const session = open(appA, foe1, nonLethal);
    expect(CombatApi.join(foe2 as never, appA as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(appB as never, foe2 as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(master as never, foe2 as never, session.getTerms()).ok).toBe(true);

    const graph = session.getGraph();
    for (let i = 0; i < 4 && !graph.edgeBetween(master, foe1); i++) {
      CombatApi.advance(session);
    }
    expect(session.isActive()).toBe(true);
    // The primary anchor is appA (roster order among the two standing
    // apprentice-holders) — the master presses appA's foe (foe1), not
    // appB's (foe2, which is also the master's own sustained edge).
    expect(graph.edgeBetween(master, foe1)).toBeTruthy();
  });

  it("high-threat trigger: below the threshold the master stays out", () => {
    const room = makeStuff(() => new TestRoom());
    const master = knifeFighter(room) as TestPartyFighter;
    const apprentice = knifeFighter(room) as TestPartyFighter;
    const foe1 = knifeFighter(room, false);
    seedFormationParty(
      [master, apprentice],
      "master-apprentice",
      { 0: "master", 1: "apprentice" },
    );

    // One foe on the apprentice — below the high-threat threshold (2):
    // the apprentice fights their own fight; no redirect fires.
    const session = open(foe1, apprentice, nonLethal);
    expect(CombatApi.join(master as never, foe1 as never, session.getTerms()).ok).toBe(true);
    const graph = session.getGraph();
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    expect(graph.edgeBetween(foe1, apprentice)).toBeTruthy();
  });

  it("high-threat trigger: at focus-fire pressure the master intercepts", () => {
    const room = makeStuff(() => new TestRoom());
    const master = knifeFighter(room) as TestPartyFighter;
    const apprentice = knifeFighter(room) as TestPartyFighter;
    const foe1 = knifeFighter(room, false);
    const foe2 = knifeFighter(room, false);
    seedFormationParty(
      [master, apprentice],
      "master-apprentice",
      { 0: "master", 1: "apprentice" },
    );

    // Two foes pile onto the apprentice before the first beat — the
    // threshold (2 incoming edges) is met at beat-top; the master
    // intercepts the first offending edge.
    const session = open(foe1, apprentice, nonLethal);
    expect(CombatApi.join(master as never, foe1 as never, session.getTerms()).ok).toBe(true);
    expect(CombatApi.join(foe2 as never, apprentice as never, session.getTerms()).ok).toBe(true);
    const graph = session.getGraph();
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    expect(graph.edgeCount(apprentice)).toBeLessThan(2);
    expect(
      graph.edgeBetween(foe1, master) ?? graph.edgeBetween(foe2, master),
    ).toBeTruthy();
  });

  it("an opening one ally arms is cashed by the other (ally-exploitable pin)", () => {
    const room = makeStuff(() => new TestRoom());
    const master = knifeFighter(room) as TestPartyFighter;
    const apprentice = knifeFighter(room) as TestPartyFighter;
    const foe = knifeFighter(room, false);
    seedFormationParty(
      [master, apprentice],
      "master-apprentice",
      { 0: "master", 1: "apprentice" },
    );

    const session = open(master, foe, nonLethal);
    expect(
      CombatApi.join(apprentice as never, foe as never, session.getTerms()).ok,
    ).toBe(true);
    // Hold the state ref — the exploit downs the foe and resolves the
    // session, clearing its map (the gym's held-state trick).
    const foeState = session.getState(foe)!;
    // An opening is armed on the foe (the broken-crossing arms the live
    // window — the established `erode(0.85, 0)` pattern). WHO armed it is
    // deliberately irrelevant: the window lives on the DEFENDER's poise,
    // carrying no arming-attacker identity — that ownerlessness IS the
    // ally-exploitability the MA economy stands on.
    foeState.poise.erode(0.85, 0);
    expect(foeState.poise.isOpen()).toBe(true);

    // The APPRENTICE — not the arming side's other member — cashes it:
    // the master holds (defend), the apprentice strikes into the window.
    CombatApi.queueGambit(master, "defend");
    CombatApi.queueGambit(apprentice, "strike");
    for (let i = 0; i < 4 && !foeState.down; i++) {
      CombatApi.advance(session);
      if (!foeState.down) {
        CombatApi.queueGambit(master, "defend");
        CombatApi.queueGambit(apprentice, "strike");
      }
    }
    // The strike resolved as an exploit: window consumed, the foe downed
    // by the cashed opening, and a real wound landed.
    expect(foeState.poise.isOpen()).toBe(false);
    expect(foeState.down).toBe(true);
    expect(foe.getConditions().some((c) => c.kind === "trauma")).toBe(true);
  });
});

describe("CombatLogic — formations: mid-fight adopt + determinism", () => {
  it("a formation adopted mid-fight acts on the very next beat", () => {
    const room = makeStuff(() => new TestRoom());
    const front = knifeFighter(room) as TestPartyFighter;
    const back = knifeFighter(room) as TestPartyFighter;
    const foe = knifeFighter(room, false);
    // The party opens on the DEFAULT formation (no interception).
    const party = seedFormationParty([front, back], "default");
    const session = open(foe, back, nonLethal);
    expect(CombatApi.join(front as never, foe as never, session.getTerms()).ok).toBe(true);
    const graph = session.getGraph();
    // Both members turtle so the lone foe isn't focus-fired down before
    // the beat under inspection (the redirect is pass-driven, not
    // exchange-driven — defending doesn't delay it).
    CombatApi.queueGambit(front, "defend");
    CombatApi.queueGambit(back, "defend");
    CombatApi.advance(session);
    expect(graph.edgeBetween(foe, back)).toBeTruthy(); // default: no redirect

    // Mid-fight switch to vanguard + roles (raw writes stand in for the
    // captain's `party adopt` / `party assign` — the store is the same).
    residentFormation("vanguard");
    const raw = ProxyApi.unwrap(party) as Party;
    raw.setFormationPath("/obj/CombatFormation/vanguard");
    raw.assignRole(front.getTemplatePath()!, "front");
    raw.assignRole(back.getTemplatePath()!, "back");

    // The very next beat's interception pass reads the new policy.
    CombatApi.queueGambit(front, "defend");
    CombatApi.queueGambit(back, "defend");
    CombatApi.advance(session);
    expect(session.isActive()).toBe(true);
    expect(graph.edgeBetween(foe, back)).toBeUndefined();
    expect(graph.edgeBetween(foe, front)).toBeTruthy();
  });

  it("a multi-party formation session is deterministic (identical traces)", async () => {
    const runOnce = (): { resolution: string | null; beats: number } => {
      const room = makeStuff(() => new TestRoom());
      const front = knifeFighter(room) as TestPartyFighter;
      const back = knifeFighter(room) as TestPartyFighter;
      const foe = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
      seedFormationParty([front, back], "vanguard", { 0: "front", 1: "back" });
      const session = open(foe, back, nonLethal);
      CombatApi.join(front as never, foe as never, session.getTerms());
      let beats = 0;
      while (session.isActive() && beats < 300) {
        CombatApi.advance(session);
        beats++;
      }
      return { resolution: session.getResolution(), beats };
    };
    const r1 = runOnce();
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    await bootRegistry();
    const r2 = runOnce();
    expect(r2.resolution).toBe(r1.resolution);
    expect(r2.beats).toBe(r1.beats);
  });
});

describe("CombatLogic — coup governance (right / call / facts)", () => {
  /** A sentient foe — the two-stage death (down → coup) only applies to
   * sentient victims under lethal terms. */
  function sentientFoe(room: TestRoom): TestFighter {
    const foe = knifeFighter(room, false);
    foe.getSpecies()!.setSentient(true);
    return foe;
  }

  /** Down `foe` with `striker`'s exploited opening (deterministic). */
  function downByExploit(
    session: CombatSession,
    striker: TestFighter,
    foe: TestFighter,
  ): void {
    session.getState(foe)!.poise.erode(0.85, 0);
    CombatApi.queueGambit(striker, "strike");
    CombatApi.advance(session);
    expect(session.getState(foe)?.down ?? true).toBe(true);
  }

  it("default formation: the coup auto-begins with the downing attacker", async () => {
    const room = makeStuff(() => new TestRoom());
    const a = knifeFighter(room, false);
    const foe = sentientFoe(room);
    const session = open(a, foe, lethal, true);
    downByExploit(session, a, foe);

    // beginCoup defers one tick (schedule(0)) past session teardown.
    await new Promise((r) => setTimeout(r, 25));
    const coup = (a as unknown as { getEngagementByType(t: string): unknown })
      .getEngagementByType(COMBAT_COUP_TYPE);
    expect(coup).toBeTruthy(); // the downer delivers — byte-parity
  });

  it("MA: held for the captain; the apprentice delivers on the word; the row carries the facts", async () => {
    const room = makeStuff(() => new TestRoom());
    const master = knifeFighter(room) as TestPartyFighter;
    const apprentice = knifeFighter(room) as TestPartyFighter;
    const foe = sentientFoe(room);
    seedFormationParty(
      [master, apprentice],
      "master-apprentice",
      { 0: "master", 1: "apprentice" },
      0, // the master captains
    );

    const session = open(master, foe, lethal, true);
    expect(
      CombatApi.join(apprentice as never, foe as never, session.getTerms()).ok,
    ).toBe(true);
    // The apprentice holds while the MASTER downs the foe — the coup
    // right must still route the stroke to the apprentice.
    CombatApi.queueGambit(apprentice, "defend");
    downByExploit(session, master as TestFighter, foe);
    await new Promise((r) => setTimeout(r, 25));

    const engagementOf = (s: Stuff) =>
      (s as unknown as { getEngagementByType(t: string): unknown })
        .getEngagementByType(COMBAT_COUP_TYPE);
    // Held for the word: nobody is delivering yet…
    expect(engagementOf(master)).toBeFalsy();
    expect(engagementOf(apprentice)).toBeFalsy();
    // …the apprentice cannot give it (not the captain)…
    expect(CombatApi.orderCoup(apprentice)).toEqual({
      ok: false,
      reason: "not-the-captain",
    });
    // …the captain can — and the APPRENTICE (coupRight role) delivers.
    const recorded: Array<Record<string, unknown>> = [];
    const spy = vi
      .spyOn(AccountabilityApi, "record")
      .mockImplementation((fields) => {
        recorded.push(fields as unknown as Record<string, unknown>);
      });
    try {
      expect(CombatApi.orderCoup(master)).toEqual({ ok: true });
      const coup = engagementOf(apprentice);
      expect(coup).toBeTruthy();
      expect(engagementOf(master)).toBeFalsy();

      // Complete the stroke (the Coup.test direct-completion seam) — the
      // death row carries the formation FACTS: the striker (apprentice)
      // is the killer, the directing captain (master) rides `directedBy`.
      (coup as { onComplete(): void }).onComplete();
      const death = recorded.find((r) => r.kind === "death");
      expect(death).toBeTruthy();
      expect(death!.killer).toBe(apprentice.getTemplatePath());
      expect(death!.killerRole).toBe("apprentice");
      expect(death!.directedBy).toBe(master.getTemplatePath());
      expect(death!.formationPath).toBe(
        "/obj/CombatFormation/master-apprentice",
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("orderCoup with nothing held is refused", () => {
    const room = makeStuff(() => new TestRoom());
    const a = knifeFighter(room, false);
    expect(CombatApi.orderCoup(a).ok).toBe(false);
  });
});

describe("CombatLogic — command mints (the teaching payoff)", () => {
  /** Mark a combatant player-driven for mint purposes (mints skip
   * brain-driven actors; test fighters have no live Interactive, so the
   * state is re-marked through the raw seam). */
  function markPlayerDriven(session: CombatSession, s: Stuff): void {
    const st = session.getState(s);
    (st as unknown as { brainPath: string | null }).brainPath = null;
  }

  it("an interception mints `command` for a player-driven interceptor only", () => {
    const deeds: Array<Record<string, unknown>> = [];
    const spy = vi
      .spyOn(AdvancementApi, "recordDeed")
      .mockImplementation(async (_owner, sub) => {
        deeds.push(sub as unknown as Record<string, unknown>);
      });
    try {
      // Brain-driven front: no mint.
      {
        const room = makeStuff(() => new TestRoom());
        const front = knifeFighter(room) as TestPartyFighter;
        const back = knifeFighter(room) as TestPartyFighter;
        const foe = knifeFighter(room, false);
        seedFormationParty([front, back], "vanguard", { 0: "front", 1: "back" });
        const session = open(foe, back, nonLethal);
        CombatApi.join(front as never, foe as never, session.getTerms());
        CombatApi.advance(session);
        expect(deeds.filter((d) => d.discipline === "command")).toHaveLength(0);
      }
      // Player-driven front: the interception mints.
      {
        StuffApi.clearAll();
        SchedulerApi._clearAllForTesting();
        const room = makeStuff(() => new TestRoom());
        const front = knifeFighter(room) as TestPartyFighter;
        const back = knifeFighter(room) as TestPartyFighter;
        const foe = knifeFighter(room, false);
        seedFormationParty([front, back], "vanguard", { 0: "front", 1: "back" });
        const session = open(foe, back, nonLethal);
        CombatApi.join(front as never, foe as never, session.getTerms());
        markPlayerDriven(session, front);
        CombatApi.advance(session);
        expect(
          deeds.filter((d) => d.discipline === "command").length,
        ).toBeGreaterThan(0);
      }
    } finally {
      spy.mockRestore();
    }
  });

  it("an armed opening cashed by an ALLY mints the armer's command deed", () => {
    const deeds: Array<Record<string, unknown>> = [];
    const spy = vi
      .spyOn(AdvancementApi, "recordDeed")
      .mockImplementation(async (_owner, sub) => {
        deeds.push(sub as unknown as Record<string, unknown>);
      });
    const sigSpy = vi
      .spyOn(AdvancementApi, "recordSignature")
      .mockImplementation(async () => {});
    try {
      const room = makeStuff(() => new TestRoom());
      const master = knifeFighter(room) as TestPartyFighter;
      const apprentice = knifeFighter(room) as TestPartyFighter;
      const foe = knifeFighter(room, false);
      seedFormationParty(
        [master, apprentice],
        "master-apprentice",
        { 0: "master", 1: "apprentice" },
      );
      const session = open(master, foe, nonLethal);
      CombatApi.join(apprentice as never, foe as never, session.getTerms());
      markPlayerDriven(session, master);
      const foeState = session.getState(foe)!;
      foeState.sharpness = 0.2;

      // The master feints; the foe bites — the master ARMED the window.
      CombatApi.queueGambit(master, "feint");
      CombatApi.queueGambit(apprentice, "defend");
      for (let i = 0; i < 6 && !foeState.poise.isOpen(); i++) {
        CombatApi.advance(session);
        if (!foeState.poise.isOpen()) {
          CombatApi.queueGambit(master, "feint");
          CombatApi.queueGambit(apprentice, "defend");
        }
      }
      expect(foeState.poise.isOpen()).toBe(true);
      const before = deeds.filter((d) => d.discipline === "command").length;

      // The APPRENTICE cashes it — the exploit mints the ARMER (master).
      CombatApi.queueGambit(master, "defend");
      CombatApi.queueGambit(apprentice, "strike");
      for (let i = 0; i < 4 && !foeState.down; i++) {
        CombatApi.advance(session);
        if (!foeState.down) {
          CombatApi.queueGambit(master, "defend");
          CombatApi.queueGambit(apprentice, "strike");
        }
      }
      expect(foeState.down).toBe(true);
      expect(
        deeds.filter((d) => d.discipline === "command").length,
      ).toBeGreaterThan(before);
    } finally {
      spy.mockRestore();
      sigSpy.mockRestore();
    }
  });

  it("the default preset mints no command deeds (parity)", () => {
    const deeds: Array<Record<string, unknown>> = [];
    const spy = vi
      .spyOn(AdvancementApi, "recordDeed")
      .mockImplementation(async (_owner, sub) => {
        deeds.push(sub as unknown as Record<string, unknown>);
      });
    try {
      const room = makeStuff(() => new TestRoom());
      const a = knifeFighter(room, false);
      const b = knifeFighter(room, false);
      const session = open(a, b, nonLethal);
      markPlayerDriven(session, a);
      for (let i = 0; i < 5; i++) CombatApi.advance(session);
      expect(deeds.filter((d) => d.discipline === "command")).toHaveLength(0);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("CombatLogic — the species combat vocabulary (DECISION L)", () => {
  /** The defenceless target: no weapon, no natural attack — it can't
   * parry (no instrument → no guard) and never inflicts, so every
   * `ConditionApi.inflict` call in the fight is the actor's strike. */
  function punchingBag(room: TestRoom): TestFighter {
    return makeFighter(room);
  }

  /** Advance one beat and return the inflict mechanisms it produced. */
  function beatMechanisms(
    session: CombatSession,
    spy: { mock: { calls: unknown[][] } },
  ): string[] {
    const before = spy.mock.calls.length;
    CombatApi.advance(session);
    return spy.mock.calls
      .slice(before)
      .map((c) => (c[1] as { mechanism: string }).mechanism);
  }

  it("a two-attack species rotates channels by session beat (bite, tail, bite…)", () => {
    const run = (): string[][] => {
      const room = makeStuff(() => new TestRoom());
      const biter = makeFighter(room);
      biter.getSpecies()!.setNaturalAttacks([
        { key: "bite", channel: "point" },
        { key: "tail", channel: "blunt" },
      ]);
      const bag = punchingBag(room);
      const spy = vi.spyOn(ConditionApi, "inflict");
      try {
        const session = open(biter, bag, nonLethal);
        const bagState = session.getState(bag)!;
        const perBeat: string[][] = [];
        for (let i = 0; i < 6 && session.isActive() && !bagState.down; i++) {
          perBeat.push(beatMechanisms(session, spy));
        }
        return perBeat;
      } finally {
        spy.mockRestore();
      }
    };

    const r1 = run();
    // The rotation index reads the SESSION BEAT: every strike within a
    // beat carries that beat's attack, beat 1 = entry 0 (the bite),
    // beat 2 = entry 1 (the tail), alternating.
    const expectedFor = (beat: number): string =>
      beat % 2 === 1 ? "point" : "blunt";
    let landedBeats = 0;
    r1.forEach((mechs, i) => {
      if (mechs.length === 0) return;
      landedBeats++;
      for (const m of mechs) expect(m).toBe(expectedFor(i + 1));
    });
    // Both entries of the rotation actually landed (bite AND tail beats).
    expect(landedBeats).toBeGreaterThanOrEqual(2);

    // Two identical runs — the identical per-beat channel transcript.
    const r2 = run();
    expect(r2).toEqual(r1);
  });

  it("a single-entry species and the legacy channel fallback are byte-identical", () => {
    const run = (wire: (f: TestFighter) => void): string[][] => {
      const room = makeStuff(() => new TestRoom());
      const striker = makeFighter(room);
      wire(striker);
      const bag = punchingBag(room);
      const spy = vi.spyOn(ConditionApi, "inflict");
      try {
        const session = open(striker, bag, nonLethal);
        const bagState = session.getState(bag)!;
        const perBeat: string[][] = [];
        for (let i = 0; i < 6 && session.isActive() && !bagState.down; i++) {
          perBeat.push(beatMechanisms(session, spy));
        }
        return perBeat;
      } finally {
        spy.mockRestore();
      }
    };

    const viaSpecies = run((f) =>
      f.getSpecies()!.setNaturalAttacks([{ key: "fist", channel: "blunt" }]),
    );
    const viaLegacy = run((f) => {
      f.naturalAttackChannel = "blunt";
    });
    expect(viaSpecies.length).toBeGreaterThan(0);
    expect(viaSpecies.flat().length).toBeGreaterThan(0);
    expect(viaSpecies).toEqual(viaLegacy);
  });

  /**
   * ⚠ **Re-derived for D37.** The subject is the species vocabulary — a
   * 400 kg hint-less body derives one reach rank, *"an ogre punches at
   * ogre reach"*, while a neutral body stays at rank 0. That is unchanged
   * and still worth pinning.
   *
   * What changed is where it is OBSERVABLE. It used to show up in the
   * opening band, because differing ranks opened a pair at `reach`; now
   * the arena opens every pair, so the opening band says nothing about
   * anatomy. The rank itself is read through `rangeStanding().reachDelta`
   * — the same number the exchange loop sorts on.
   */
  it("a large hint-less body carries one reach rank over a neutral body", () => {
    const room = makeStuff(() => new TestRoom());
    const ogre = makeFighter(room, { natural: "blunt" });
    ogre.getSpecies()!.getBodyPlan()!.setBaseMass(400);
    const human = makeFighter(room, { natural: "blunt" });
    open(ogre, human, nonLethal);

    expect(CombatApi.rangeStanding(ogre as never)!.reachDelta).toBe(1);
    expect(CombatApi.rangeStanding(human as never)!.reachDelta).toBe(-1);

    // A neutral pair is level — the byte-parity control.
    const room2 = makeStuff(() => new TestRoom());
    const h1 = makeFighter(room2, { natural: "blunt" });
    const h2 = makeFighter(room2, { natural: "blunt" });
    open(h1, h2, nonLethal);
    expect(CombatApi.rangeStanding(h1 as never)!.reachDelta).toBe(0);
  });

  it("species-afforded gambits: a tailed species sweeps bodily, unarmed", () => {
    const room = makeStuff(() => new TestRoom());
    const tailed = makeFighter(room);
    tailed.getSpecies()!.setNaturalAttacks([{ key: "tail", channel: "blunt" }]);
    tailed.getSpecies()!.setAffordedGambits(["sweep"]);
    const foe = makeFighter(room, { weaponForm: "bladed" });
    open(tailed, foe, nonLethal);
    // The species affordance short-circuits the equipment gate; the
    // instrument gate is satisfied by the natural attack.
    expect(CombatApi.eligibilityFor(tailed, "sweep").ok).toBe(true);
  });

  it("without the species entry an unarmed natural attacker still rejects `wrong-weapon`", () => {
    const room = makeStuff(() => new TestRoom());
    const beast = makeFighter(room, { natural: "blunt" });
    const foe = makeFighter(room, { weaponForm: "bladed" });
    open(beast, foe, nonLethal);
    const elig = CombatApi.eligibilityFor(beast, "sweep");
    expect(elig.ok).toBe(false);
    expect(elig.reason).toBe("wrong-weapon");
  });

  it("`needsInstrument` still stands: species affordance without a natural attack rejects", () => {
    const room = makeStuff(() => new TestRoom());
    const limbless = makeFighter(room);
    limbless.getSpecies()!.setAffordedGambits(["sweep"]);
    const foe = makeFighter(room, { weaponForm: "bladed" });
    open(limbless, foe, nonLethal);
    const elig = CombatApi.eligibilityFor(limbless, "sweep");
    expect(elig.ok).toBe(false);
    expect(elig.reason).toBe("no-instrument");
  });

  it("a bogus affordedGambits key is inert", () => {
    const room = makeStuff(() => new TestRoom());
    const beast = makeFighter(room, { natural: "blunt" });
    beast.getSpecies()!.setAffordedGambits(["flying-dropkick"]);
    const foe = makeFighter(room, { weaponForm: "bladed" });
    open(beast, foe, nonLethal);
    const elig = CombatApi.eligibilityFor(beast, "sweep");
    expect(elig.ok).toBe(false);
    expect(elig.reason).toBe("wrong-weapon");
  });
});
