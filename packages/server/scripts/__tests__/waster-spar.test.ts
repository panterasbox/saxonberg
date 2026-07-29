/**
 * waster-spar bench — the sparring sword, end-to-end.
 *
 * Proves the `blunted` delivery form's whole claim through the real
 * engine: a practice sword with an arming sword's mass and length fights
 * the same tactical game (poise/tempo/parry/feint via the gym policies)
 * while its blows resolve through the tissue fold as **blunt-only**
 * trauma — a bruise (or, on a hard blow to a rattled partner, a cracked
 * rib — wasters are honest), never a laceration, never a bleed. A padded
 * gambeson (the historical sparring jacket) absorbs the blunt residual,
 * so the geared spar lands no fracture. Harness condensed from
 * `CombatLogic.test.ts`; the full bout rides the gym's `runMatchup`.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../src/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../src/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { Idea } from "../../src/mud/lib/stuff/Idea";
import { Character } from "../../src/mud/lib/character/Character";
import Species from "../../src/mud/lib/species/Species";
import BodyPlan from "../../src/mud/lib/species/BodyPlan";
import Weapon from "../../src/mud/lib/equipment/Weapon";
import Armor from "../../src/mud/lib/equipment/Armor";
import Material from "../../src/mud/lib/material/Material";
import { Construction } from "../../src/mud/lib/material/Construction";
import { ContainerMixin } from "../../src/mud/lib/spatial/Container";
import { ContainmentApi } from "../../src/mud/api/containment";
import { StuffApi } from "../../src/mud/api/stuff";
import { SchedulerApi } from "../../src/mud/api/scheduler";
import { Quantity } from "../../src/mud/lib/quantity";
import { CombatApi } from "../../src/mud/api/combat";
import {
  CombatTerms,
  type TermsProposal,
} from "../../src/mud/lib/combat/CombatTerms";
import type { CombatSession } from "../../src/mud/lib/combat/CombatSession";
import type { Stuff } from "../../src/mud/lib/stuff/Stuff";
import type { Engaged } from "../../src/mud/lib/activity/Engaged";
import EventRegistry from "../../src/mud/obj/EventRegistry";
import { EventApi } from "../../src/mud/api/event";
import { runMatchup, Policies, type GymSide } from "../combat-gym";

class TestRoom extends ContainerMixin(Idea) {}
class SparFighter extends Character {}

let seq = 0;

function mat(hardness: number, toughness: number, name: string): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, "MPa"));
  m.setToughness(Quantity.of(toughness, "MJ/m³"));
  m.setName(name);
  stampTemplatePathForTest(m, `/lib/material/test/spar-m-${seq++}`);
  return m;
}
const steel = () => mat(600, 200, "steel");
/** Oak, per the base-library discipline — soft next to any metal. */
const oak = () => mat(40, 30, "oak");
/** Quilted linen — the gambeson's stuff; blunt rides the structural floor. */
const linen = () => mat(20, 40, "quilted linen");

/** The oak waster: the seeded `/obj/arms/oak-waster` shape, verbatim. */
interface SparLoadout {
  form: string;
  material: () => Material;
  mass: number;
  length: number;
}
const WASTER: SparLoadout = {
  form: "blunted",
  material: oak,
  mass: 1.0,
  length: 0.9,
};
const SWORD: SparLoadout = {
  form: "bladed",
  material: steel,
  mass: 1.0,
  length: 0.9,
};

function makeFighter(
  room: TestRoom,
  loadout: SparLoadout,
  gambeson = false,
): SparFighter {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("spar-biped");
  plan.setSlots([
    {
      name: "torso",
      accepts: "WearableMixin",
      capacity: 2,
      covers: ["body.torso"],
    },
    { name: "head", accepts: "WearableMixin", covers: ["body.head"] },
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
  stampTemplatePathForTest(plan, `/lib/body-plans/spar-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/lib/species/test/spar-${id}`);

  const f = makeStuff(() => new SparFighter());
  stampTemplatePathForTest(f, `/test/spar-fighter-${id}`);
  f.setSpecies(species);
  ContainmentApi.move(f as never, room as never);

  const occupy = (x: unknown, s: string) =>
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(x, s);

  const w = makeStuff(() => new Weapon());
  w.setMaterial(loadout.material());
  w.setConstruction(Construction.of(loadout.form));
  w.setMass(Quantity.of(loadout.mass, "kg"));
  w.setLength(Quantity.of(loadout.length, "m"));
  w.setSlotClaim(plan.getTemplatePath()!, ["grip"]);
  occupy(w, "grip");

  if (gambeson) {
    // The sparring kit: a padded jacket AND coif (exploits call head shots).
    for (const slot of ["torso", "head"] as const) {
      const pad = makeStuff(() => new Armor());
      pad.setMaterial(linen());
      pad.setConstruction(Construction.of("padded"));
      pad.setSlotClaim(plan.getTemplatePath()!, [slot]);
      occupy(pad, slot);
    }
  }
  return f;
}

type TraumaRow = { type: string; severity: number; site: string };
function traumasOf(f: SparFighter): TraumaRow[] {
  return f
    .getConditions()
    .filter((c) => c.kind === "trauma") as unknown as TraumaRow[];
}

/** The bleeding wound types — what a spar must never produce. */
const BLEEDERS = ["laceration", "puncture", "avulsion"];

const nonLethal: TermsProposal = {
  lethality: "non-lethal",
  stopCondition: "yield",
  stakes: "",
};

const openSessions: CombatSession[] = [];

function open(a: SparFighter, b: SparFighter): CombatSession {
  const terms = CombatTerms.agreed(a.getTemplatePath() ?? "a", nonLethal, true);
  const res = CombatApi.openSession(a as never, b as never, terms);
  if (!res.ok) throw new Error(`openSession failed: ${res.reason}`);
  openSessions.push(res.session);
  return res.session;
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

function resetState(): void {
  StuffApi.clearAll();
  SchedulerApi._clearAllForTesting();
  const reg = makeStuff(() => new EventRegistry());
  stampTemplatePathForTest(reg, "/obj/EventRegistry");
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
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

/**
 * Land at least one blow from `attacker` on `defender` (the defender is
 * softened to reeling first). Real 1.0 kg weapons carry real encumbrance,
 * so the emergent tempo grants an act only every few beats — the loop
 * rides that out (the debug trace lands the first blow around beat 20).
 */
function landBlow(
  s: CombatSession,
  attacker: SparFighter,
  defender: SparFighter,
  maxBeats = 40,
): void {
  s.getState(defender as never)!.poise.erode(0.6, 0); // → reeling
  for (let i = 0; i < maxBeats && s.isActive(); i++) {
    CombatApi.queueGambit(attacker as never, "strike");
    CombatApi.advance(s);
    if (traumasOf(defender).length > 0) return;
  }
}

describe("waster-spar — the blunted form draws no blood", () => {
  it("the same blow: a sword cuts, a waster bruises (or cracks — never bleeds)", () => {
    // A landed strike on a reeling bare partner, both instruments.
    const room1 = makeStuff(() => new TestRoom());
    const swordsman = makeFighter(room1, SWORD);
    const bare1 = makeFighter(room1, WASTER);
    landBlow(open(swordsman, bare1), swordsman, bare1);
    const cut = traumasOf(bare1);
    expect(cut.length).toBeGreaterThan(0);
    expect(cut.every((t) => t.type === "laceration")).toBe(true);

    // The identical exchange with the oak waster: blunt-only consequence.
    const room2 = makeStuff(() => new TestRoom());
    const sparrer = makeFighter(room2, WASTER);
    const bare2 = makeFighter(room2, WASTER);
    landBlow(open(sparrer, bare2), sparrer, bare2);
    const bruised = traumasOf(bare2);
    expect(bruised.length).toBeGreaterThan(0);
    for (const t of bruised) {
      expect(["contusion", "fracture"]).toContain(t.type);
    }
  });

  it("the gambeson absorbs what the waster delivers — nothing worse than a bruise", () => {
    const room = makeStuff(() => new TestRoom());
    const sparrer = makeFighter(room, WASTER);
    const geared = makeFighter(room, WASTER, true);
    landBlow(open(sparrer, geared), sparrer, geared);
    // The padded jacket eats the blunt residual: at most a mild contusion
    // (possibly nothing at all — turned), never the bare-skin rib crack,
    // and of course nothing that bleeds.
    for (const t of traumasOf(geared)) {
      expect(t.type).toBe("contusion");
    }
  });

  it("a full sparring bout wounds blunt-only, and traces identically to steel", () => {
    // The bout runner: feinter vs turtle at a fixed competence, capturing
    // the built fighters so their wounds are inspectable afterwards.
    const runBout = (
      loadout: SparLoadout,
      gambeson: boolean,
    ): { winner: string; beats: number; wounds: TraumaRow[] } => {
      let fa: SparFighter | null = null;
      let fb: SparFighter | null = null;
      const side = (
        label: string,
        policy: GymSide["policy"],
        capture: (f: SparFighter) => void,
      ): GymSide => ({
        label,
        policy,
        band: "untrained",
        make: () => {
          const f = makeFighter(makeStuff(() => new TestRoom()), loadout, gambeson);
          capture(f);
          return f as unknown as Stuff & Engaged;
        },
      });
      const r = runMatchup(
        side("feinter", Policies.feinter!, (f) => (fa = f)),
        side("turtle", Policies.turtle!, (f) => (fb = f)),
        120,
        resetState,
      );
      return {
        winner: r.winner,
        beats: r.beats,
        wounds: [...traumasOf(fa!), ...traumasOf(fb!)],
      };
    };

    // The spar: bare-skin wasters (wounds land; the gambeson bout would
    // mostly turn them — asserted above; bare shows the wound *types*).
    const spar = runBout(WASTER, false);
    expect(spar.wounds.length).toBeGreaterThan(0);
    for (const t of spar.wounds) {
      expect(BLEEDERS).not.toContain(t.type);
    }
    // eslint-disable-next-line no-console -- bench report, deliberate
    console.log(
      `[waster-spar] winner=${spar.winner} beats=${spar.beats} wounds=` +
        spar.wounds
          .map((t) => `${t.type}@${t.site}(${t.severity.toFixed(2)})`)
          .join(", "),
    );

    // Playstyle parity, end-to-end: the identical bout under steel arming
    // swords follows the same tactical trajectory — same result, same beat
    // count, same wound count and sites — differing ONLY in what the blows
    // are (cuts vs bruises). The construction form changes the consequence,
    // never the game. (Who wins is the gym's concern, not this bench's —
    // the parity of the two traces is the assertion.)
    const duel = runBout(SWORD, false);
    expect(duel.winner).toBe(spar.winner);
    expect(duel.beats).toBe(spar.beats);
    expect(duel.wounds.map((t) => t.site)).toEqual(
      spar.wounds.map((t) => t.site),
    );
    expect(duel.wounds.some((t) => BLEEDERS.includes(t.type))).toBe(true);
  });
});
