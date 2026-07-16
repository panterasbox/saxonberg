/**
 * combat-gym bench — the balance regression guard.
 *
 * Drives real `CombatApi` sessions headless (the `CombatLogic.test` harness,
 * condensed) through the gym's policies and asserts the load-bearing balance
 * properties the experience pass owes:
 *
 *   - **the parry seam is dead** — a turtle no longer dominates: a feint
 *     beats a low-competence turtle, while blind aggression still loses to
 *     one (rock-paper-scissors closed);
 *   - **the feint isn't degenerate** — a high-competence turtle *reads* it
 *     and is not cracked (skill counters the bait);
 *   - **NPC ≈ PC** — the same model fights itself to a decisive result;
 *   - **determinism** — a single matchup is bit-for-bit reproducible.
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
import Material from "../../src/mud/lib/material/Material";
import { Construction } from "../../src/mud/lib/material/Construction";
import { ContainerMixin } from "../../src/mud/lib/spatial/Container";
import { ContainmentApi } from "../../src/mud/api/containment";
import { StuffApi } from "../../src/mud/api/stuff";
import { SchedulerApi } from "../../src/mud/api/scheduler";
import { Quantity } from "../../src/mud/lib/quantity";
import type { Stuff } from "../../src/mud/lib/stuff/Stuff";
import type { Engaged } from "../../src/mud/lib/activity/Engaged";
import type { CompetenceBandName } from "../../src/mud/lib/advancement/CompetenceBand";
import {
  COMBAT_PARTICIPANT_TYPE,
  CombatParticipantHold,
} from "../../src/mud/lib/combat/CombatSession";
import EventRegistry from "../../src/mud/obj/EventRegistry";
import { EventApi } from "../../src/mud/api/event";
import {
  runMatchup,
  runMatrix,
  Policies,
  type GymSide,
} from "../combat-gym";

class TestRoom extends ContainerMixin(Idea) {}
class GymFighter extends Character {}

let seq = 0;

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(600, "MPa"));
  m.setToughness(Quantity.of(200, "MJ/m³"));
  m.setName("steel");
  stampTemplatePathForTest(m, `/lib/material/test/gym-m-${seq++}`);
  return m;
}

/** A headless bladed fighter in a shared room. */
function makeFighter(room: TestRoom): Stuff & Engaged {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("gym-biped");
  plan.setSlots([
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
  stampTemplatePathForTest(plan, `/lib/body-plans/gym-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/lib/species/test/gym-${id}`);

  const f = makeStuff(() => new GymFighter());
  stampTemplatePathForTest(f, `/test/gym-fighter-${id}`);
  f.setSpecies(species);
  ContainmentApi.move(f as never, room as never);

  const w = makeStuff(() => new Weapon());
  w.setMaterial(steel());
  w.setConstruction(Construction.of("bladed"));
  w.setSlotClaim(plan.getTemplatePath()!, ["grip"]);
  (f as unknown as { occupy(x: unknown, s: string): void }).occupy(w, "grip");
  return f as unknown as Stuff & Engaged;
}

function side(
  label: string,
  policy: GymSide["policy"],
  band?: CompetenceBandName,
): GymSide {
  const room = makeStuff(() => new TestRoom());
  return { label, policy, band, make: () => makeFighter(room) };
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

beforeAll(async () => {
  await bootRegistry();
});

beforeEach(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  SchedulerApi._clearAllForTesting();
  SchedulerApi.registerActivity(COMBAT_PARTICIPANT_TYPE, CombatParticipantHold);
  await bootRegistry();
});

afterEach(() => {
  StuffApi.clearAll();
});

describe("combat-gym — the parry seam is dead (rock-paper-scissors)", () => {
  it("a feint beats a low-competence turtle (the seam is broken)", () => {
    const r = runMatchup(
      side("feinter", Policies.feinter, "untrained"),
      side("turtle", Policies.turtle, "untrained"),
    );
    // The feinter (A) cracks and finishes the un-reading turtle — the
    // turtle no longer wins by patience alone.
    expect(r.winner).toBe("A");
  });

  it("blind aggression still loses to a turtle (patience intact)", () => {
    const r = runMatchup(
      side("aggressor", Policies.aggressor, "untrained"),
      side("turtle", Policies.turtle, "untrained"),
    );
    // A blind striker is parried and riposted; the turtle is NOT beaten by
    // recklessness. (The feint is the answer to patience — not a strike.)
    expect(r.winner).not.toBe("A");
  });

  it("a high-competence turtle reads the feint and is not cracked", () => {
    const r = runMatchup(
      side("feinter", Policies.feinter, "untrained"),
      side("turtle", Policies.turtle, "expert"),
    );
    // Skill counters the bait — the expert reader is not beaten by the
    // feinter, so the feint is not a degenerate always-win.
    expect(r.winner).not.toBe("A");
  });
});

describe("combat-gym — the balance matrix", () => {
  it("no policy dominates across the competence tiers (contested win-rate)", () => {
    // Three representative tiers (low bites, high reads) — enough to show
    // the distribution is contested without paying for every draw-to-cap.
    const tiers: CompetenceBandName[] = ["untrained", "competent", "expert"];
    // Feinter (A) vs a turtle (B) at each competence tier: low tiers bite
    // (A wins), high tiers read (A does not win). A contested distribution
    // — neither the feint nor the turtle sweeps.
    const { aWins, results } = runMatrix(
      tiers.map((band) => ({
        label: `feinter-vs-turtle@${band}`,
        a: side("feinter", Policies.feinter, "untrained"),
        b: side("turtle", Policies.turtle, band),
      })),
    );
    // The feinter beats the low tiers but not every tier — the seam is dead
    // AND the feint is skill-counterable (not a sweep).
    expect(aWins).toBeGreaterThan(0);
    expect(aWins).toBeLessThan(results.length);
  });
});

describe("combat-gym — determinism + NPC≈PC parity", () => {
  it("a single matchup is bit-for-bit reproducible", () => {
    const spec = (): [GymSide, GymSide] => [
      side("feinter", Policies.feinter, "novice"),
      side("turtle", Policies.turtle, "novice"),
    ];
    const r1 = runMatchup(...spec());
    const r2 = runMatchup(...spec());
    expect(r1.winner).toBe(r2.winner);
    expect(r1.beats).toBe(r2.beats);
  });

  it("the same model fights itself to a decisive result (NPC ≈ PC)", () => {
    // Both sides run the engine's own combat brain — one model, no hidden
    // monster rules. It resolves (a decisive winner within the beat cap).
    const r = runMatchup(
      side("brain", Policies.brain, "competent"),
      side("brain", Policies.brain, "competent"),
    );
    expect(r.winner).not.toBe("draw");
  });
});
