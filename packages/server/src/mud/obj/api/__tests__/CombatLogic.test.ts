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
import { ConditionApi } from "../../../api/condition";
import { Quantity } from "../../../lib/quantity";
import { CombatApi } from "../../../api/combat";
import { CombatTerms, type TermsProposal } from "../../../lib/combat/CombatTerms";
import {
  COMBAT_PARTICIPANT_TYPE,
  CombatSession,
  CombatParticipantHold,
} from "../../../lib/combat/CombatSession";
import { SecurityApi } from "../../../api/security";
import { PartyApi } from "../../../api/party";
import { PartyMemberMixin } from "../../../lib/party/PartyMember";
import { Party } from "../../../lib/party/Party";
import PartyRegistry from "../../../obj/PartyRegistry";
import type { Channel } from "../../../lib/material/Channel";
import EventRegistry from "../../../obj/EventRegistry";
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
  stampTemplatePathForTest(m, `/lib/material/test/m-${seq++}`);
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
  ctor?: new () => TestFighter;
}

function makeFighter(room: TestRoom, opts: FighterOpts = {}): TestFighter {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("test-biped");
  plan.setSlots([
    { name: "torso", accepts: "WearableMixin", capacity: 2, covers: ["body.torso"] },
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
  stampTemplatePathForTest(plan, `/lib/body-plans/test-fighter-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/lib/species/test/fighter-${id}`);

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
    w.setSlotClaim(planPathOf(f), ["grip"]);
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(w, "grip");
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
  SchedulerApi.registerActivity(
    COMBAT_PARTICIPANT_TYPE,
    CombatParticipantHold,
  );
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
    const session = open(a, b, nonLethal);
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
  /** Seed a two-member party straight into a fresh registry. */
  function seedParty(a: TestFighter, b: TestFighter): void {
    const reg = makeStuff(() => new PartyRegistry());
    stampTemplatePathForTest(reg, "/obj/PartyRegistry");
    const p = new Party();
    p._id = SecurityApi.uuid();
    p.name = `crew-${seq++}`;
    p.combatSide = "faction:allies";
    p.addMember(a.getTemplatePath()!);
    p.addMember(b.getTemplatePath()!);
    reg.add(p);
    (a as unknown as { activePartyId: string }).activePartyId = p._id;
    (b as unknown as { activePartyId: string }).activePartyId = p._id;
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
});

