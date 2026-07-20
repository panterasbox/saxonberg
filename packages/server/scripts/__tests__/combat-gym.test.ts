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
import Shield from "../../src/mud/lib/equipment/Shield";
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

/** A weapon/shield loadout — the matrix axis the weapon-playstyle build adds. */
export interface GymLoadout {
  form: string;
  mass: number;
  length: number;
  /** Add a wielded shield in the off-hand. */
  shield?: boolean;
}

/** The canonical loadouts the weapon matrix is built from. */
export const Loadouts: Record<string, GymLoadout> = {
  dagger: { form: "bladed", mass: 0.3, length: 0.25 },
  sword: { form: "bladed", mass: 1.0, length: 0.9 },
  spear: { form: "pointed", mass: 1.8, length: 2.4 },
  mace: { form: "hafted", mass: 1.6, length: 0.7 },
  warhammer: { form: "hafted", mass: 3.2, length: 1.1 },
  swordShield: { form: "bladed", mass: 1.0, length: 0.9, shield: true },
};

/** A headless fighter in a shared room, armed per `loadout` (default sword). */
function makeFighter(
  room: TestRoom,
  loadout: GymLoadout = Loadouts.sword!,
): Stuff & Engaged {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("gym-biped");
  plan.setSlots([
    { name: "grip", accepts: "WieldableMixin", covers: ["body.arm.right"] },
    { name: "offgrip", accepts: "WieldableMixin" },
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

  const occupy = (x: unknown, s: string) =>
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(x, s);

  const w = makeStuff(() => new Weapon());
  w.setMaterial(steel());
  w.setConstruction(Construction.of(loadout.form));
  w.setMass(Quantity.of(loadout.mass, "kg"));
  w.setLength(Quantity.of(loadout.length, "m"));
  w.setSlotClaim(plan.getTemplatePath()!, ["grip"]);
  occupy(w, "grip");

  if (loadout.shield) {
    const sh = makeStuff(() => new Shield());
    sh.setMaterial(steel());
    sh.setConstruction(Construction.of("plate"));
    sh.setSlotClaim(plan.getTemplatePath()!, ["offgrip"]);
    occupy(sh, "offgrip");
  }
  return f as unknown as Stuff & Engaged;
}

function side(
  label: string,
  policy: GymSide["policy"],
  band?: CompetenceBandName,
  loadout?: GymLoadout,
): GymSide {
  // The room is built lazily inside make() (after any per-matchup reset), so
  // a matrix cell always fights in a freshly-cleaned world.
  return {
    label,
    policy,
    band,
    make: () => makeFighter(makeStuff(() => new TestRoom()), loadout),
  };
}

/** Synchronous per-matchup state reset — a clean world for each fight so a
 * matrix of matchups doesn't accumulate the previous fight's objects. */
function resetState(): void {
  StuffApi.clearAll();
  SchedulerApi._clearAllForTesting();
  const reg = makeStuff(() => new EventRegistry());
  stampTemplatePathForTest(reg, "/obj/EventRegistry");
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
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
      resetState,
    );
    // The feint does NOT sweep every competence tier — a high-competence
    // reader is not cracked (never a degenerate always-win). That the feint
    // *does* crack a low-competence turtle (the seam is dead) is the stable
    // single-matchup parry-seam test above; asserting only the no-sweep
    // direction here keeps this robust to whether a near-parity fight
    // resolves or drags to a draw (both are non-A-wins).
    expect(aWins).toBeLessThan(results.length);
  });
});

describe("combat-gym — determinism + NPC≈PC parity", () => {
  it("a single matchup is bit-for-bit reproducible", () => {
    // Each run is reset to a clean world first — a single session is
    // deterministic; two runs differ only if the world (registry) differs.
    // A decisive (below-the-cap) matchup so the compared beat count is the
    // resolution beat, not the max-beats backstop.
    const spec = (): [GymSide, GymSide] => [
      side("feinter", Policies.feinter, "untrained"),
      side("turtle", Policies.turtle, "untrained"),
    ];
    const r1 = runMatchup(...spec(), 400, resetState);
    const r2 = runMatchup(...spec(), 400, resetState);
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

describe("combat-gym — weapon × allocation matrix", () => {
  const brain = (label: string, l: GymLoadout): GymSide =>
    side(label, Policies.brain, "competent", l);

  it("a single weapon matchup is bit-for-bit reproducible", () => {
    const spec = (): [GymSide, GymSide] => [
      brain("spear", Loadouts.spear!),
      brain("dagger", Loadouts.dagger!),
    ];
    const r1 = runMatchup(...spec(), 400, resetState);
    const r2 = runMatchup(...spec(), 400, resetState);
    expect(r1.winner).toBe(r2.winner);
    expect(r1.beats).toBe(r2.beats);
  });

  it("same weapon both sides resolves decisively (NPC ≈ PC with weapons)", () => {
    const r = runMatchup(brain("sword-a", Loadouts.sword!), brain("sword-b", Loadouts.sword!));
    expect(r.winner).not.toBe("draw");
  });

  it("no single loadout sweeps the matrix (varied outcomes)", () => {
    // A weapon matrix. Loadout genuinely changes the fight: a reach mismatch
    // (spear vs dagger) plays out utterly differently from an even trade
    // (mace vs sword). We assert the distribution is VARIED (more than one
    // kind of outcome), which is the real non-dominance signal — a single
    // dominant loadout would sweep every cell to the same result.
    const matchups = [
      { label: "spear-v-dagger", a: brain("spear", Loadouts.spear!), b: brain("dagger", Loadouts.dagger!) },
      { label: "mace-v-sword", a: brain("mace", Loadouts.mace!), b: brain("sword", Loadouts.sword!) },
      { label: "warhammer-v-swordshield", a: brain("warhammer", Loadouts.warhammer!), b: brain("swordShield", Loadouts.swordShield!) },
      { label: "sword-v-sword", a: brain("sword-a", Loadouts.sword!), b: brain("sword-b", Loadouts.sword!) },
    ];
    const { results } = runMatrix(matchups, resetState);
    // Outcomes vary across loadouts (not one loadout sweeping to a single
    // result) — no strictly-dominant weapon.
    const distinctOutcomes = new Set(results.map((r) => r.winner));
    expect(distinctOutcomes.size).toBeGreaterThanOrEqual(2);
  });
});
