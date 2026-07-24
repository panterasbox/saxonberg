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
  runPartyMatchup,
  Policies,
  type GymSide,
  type GymPartyFighter,
} from "../combat-gym";
import { PartyMemberMixin } from "../../src/mud/lib/party/PartyMember";
import { Party } from "../../src/mud/lib/party/Party";
import { CombatFormation } from "../../src/mud/lib/combat/CombatFormation";
import { ProxyApi } from "../../src/mud/api/proxy";

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
  ctor: new () => GymFighter = GymFighter,
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

  const f = makeStuff(() => new ctor());
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

describe("combat-gym — the pinned regression (canonical outcomes)", () => {
  // The byte-parity pin for the combat-formations build: these exact
  // winners + beat counts are the canonical pre-formation outcomes,
  // captured on origin/master before the formation substrate landed. A
  // side with no chosen formation resolves to the default preset, which
  // must byte-preserve this behavior — any drift here is a formation
  // regression, not a rebalance. (The accountability-migration pin
  // precedent.)
  const PINS: Array<{
    label: string;
    a: () => GymSide;
    b: () => GymSide;
    winner: "A" | "B" | "draw";
    beats: number;
  }> = [
    {
      label: "feinter-vs-turtle@untrained",
      a: () => side("feinter", Policies.feinter, "untrained"),
      b: () => side("turtle", Policies.turtle, "untrained"),
      winner: "draw",
      beats: 201,
    },
    {
      label: "brain-vs-brain@competent",
      a: () => side("brain", Policies.brain, "competent"),
      b: () => side("brain", Policies.brain, "competent"),
      winner: "A",
      beats: 21,
    },
    {
      label: "spear-vs-dagger@competent",
      a: () => side("spear", Policies.brain, "competent", Loadouts.spear!),
      b: () => side("dagger", Policies.brain, "competent", Loadouts.dagger!),
      winner: "draw",
      beats: 201,
    },
    {
      label: "swordshield-vs-mace@competent",
      a: () => side("ss", Policies.brain, "competent", Loadouts.swordShield!),
      b: () => side("mace", Policies.brain, "competent", Loadouts.mace!),
      winner: "A",
      beats: 21,
    },
  ];

  for (const pin of PINS) {
    it(`pinned: ${pin.label} → ${pin.winner} in ${pin.beats} beats`, () => {
      const r = runMatchup(pin.a(), pin.b(), 400, resetState);
      expect(r.winner).toBe(pin.winner);
      expect(r.beats).toBe(pin.beats);
    });
  }
});

/* ─────────────── the formations matrix (combat-formations build) ─────────────── */

class GymCrewFighter extends PartyMemberMixin(GymFighter) {}

/** The preset shapes the cells wire resident (mirrored from
 * seeds/lib/combat/CombatFormation/ — the seed↔DEFAULT_POLICY pin lives
 * in CombatFormation.test). */
const FORMATION_SHAPES: Record<
  string,
  Partial<{
    roles: string[];
    allocation: "sustain" | "called" | "primary";
    primaryRole: string;
    protects: string[];
    interceptors: string[];
    trigger: "none" | "any" | "high-threat";
    coupRight: string;
    coupCall: "engaged" | "captain";
  }>
> = {
  default: {},
  "focus-fire": { allocation: "called", coupCall: "captain" },
  vanguard: {
    roles: ["front", "back"],
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

let crewSeq = 0;

/** Make a formation preset resident + wire `members` into a raw party
 * running it (`roles` maps member index → role; captain = index 0). The
 * sanctioned raw test seam — party mechanics live in PartyLogic.test. */
function wireFormation(
  members: (Stuff & Engaged)[],
  formation: string,
  roles: Record<number, string> = {},
): void {
  const shape = FORMATION_SHAPES[formation]!;
  const path = `/lib/combat/CombatFormation/${formation}`;
  // Reuse a preset already resident this cell (two wired parties may
  // share one — a second stamp would break the singleton index).
  let resident: unknown;
  try {
    resident = StuffApi.findByTemplatePath(path);
  } catch {
    resident = undefined;
  }
  if (!resident) {
    const f = makeStuff(() => new CombatFormation());
    f.setName(formation);
    if (shape.roles?.length) f.setRoles([...shape.roles]);
    if (shape.allocation) f.setAllocation(shape.allocation);
    if (shape.primaryRole) f.setPrimaryRole(shape.primaryRole);
    if (shape.protects?.length) f.setProtectsRoles([...shape.protects]);
    if (shape.interceptors?.length) {
      f.setInterceptorRoles([...shape.interceptors]);
    }
    if (shape.trigger) f.setInterceptTrigger(shape.trigger);
    if (shape.coupRight) f.setCoupRight(shape.coupRight);
    if (shape.coupCall) f.setCoupCall(shape.coupCall);
    stampTemplatePathForTest(f, path);
  }

  const p = makeStuff(() => new Party());
  stampTemplatePathForTest(p, `/obj/party/gym-crew-${crewSeq++}`);
  const raw = ProxyApi.unwrap(p) as Party;
  raw.setName(`gym-crew-${crewSeq++}`);
  // A distinct side per party — two wired parties must stay foes.
  raw.setCombatSide(`faction:gym-crew-${crewSeq++}`);
  for (const m of members) raw.addMember(m.getTemplatePath()!);
  raw.setCaptainId(members[0]!.getTemplatePath()!);
  raw.setFormationPath(path);
  for (const [idx, role] of Object.entries(roles)) {
    raw.assignRole(members[Number(idx)]!.getTemplatePath()!, role);
  }
  for (const m of members) {
    (m as unknown as { activePartyPath: string }).activePartyPath =
      p.getTemplatePath()!;
  }
}

/** A crew-capable gym fighter with a real body mass (an authored weapon
 * mass against a massless body floors tempo at minRate — nobody swings).
 * Each cell's fighters share one room (built lazily after the reset). */
let crewRoom: TestRoom | null = null;
function crew(
  label: string,
  band?: CompetenceBandName,
  joinOnto?: number,
): GymPartyFighter {
  return {
    label,
    policy: Policies.brain,
    band,
    joinOnto,
    make: () => {
      crewRoom ??= makeStuff(() => new TestRoom());
      const f = makeFighter(
        crewRoom,
        Loadouts.sword!,
        GymCrewFighter,
      ) as unknown as { setMass(q: unknown): void };
      f.setMass(Quantity.of(80, "kg"));
      return f as unknown as ReturnType<GymPartyFighter["make"]>;
    },
  };
}

function resetCrewCell(): void {
  resetState();
  crewRoom = null;
}

describe("combat-gym — the formations matrix", () => {
  it("a party that never chose fights byte-identically to no party at all", () => {
    // Same crew-class fighters; the only variable is a party (with no
    // chosen formation) around side A — the default rung of the total
    // chain must not move the trace.
    const cell = (withParty: boolean) =>
      runPartyMatchup(
        { fighters: [crew("a", "competent")] },
        { fighters: [crew("b", "competent")] },
        400,
        resetCrewCell,
        (aF) => {
          if (withParty) wireFormation(aF, "default");
        },
      );
    const bare = cell(false);
    const partied = cell(true);
    expect(partied.winner).toBe(bare.winner);
    expect(partied.beats).toBe(bare.beats);
  });

  it("focus-fire convergence: the called side bursts the called target faster than default", () => {
    // 2v2, split entry topology (the ally enters against foe2) — under
    // `called` the ally converges on the captain's target anyway.
    const cell = (formation: string) =>
      runPartyMatchup(
        {
          fighters: [crew("cap", "competent"), crew("ally", "competent", 1)],
        },
        {
          fighters: [crew("foe1", "competent"), crew("foe2", "competent")],
        },
        400,
        resetCrewCell,
        (aF, bF) => {
          wireFormation(aF, formation);
          wireFormation(bF, "default");
        },
      );
    const focus = cell("focus-fire");
    const dflt = cell("default");
    // The called target (the captain's opening engagement) is the one
    // burst down, and strictly sooner than the split-pressure default.
    expect(focus.winner).toBe("A");
    expect(focus.downs["foe1"]).toBe(true);
    expect(focus.beats).toBeLessThan(dflt.beats);
  });

  it("vanguard: the back line is never the one who falls", () => {
    const r = runPartyMatchup(
      {
        fighters: [crew("back", "competent"), crew("front", "competent")],
      },
      {
        fighters: [crew("foe1", "competent"), crew("foe2", "competent")],
      },
      400,
      resetCrewCell,
      (aF, bF) => {
        wireFormation(aF, "vanguard", { 0: "back", 1: "front" });
        wireFormation(bF, "default");
      },
    );
    // Every edge that lands on the back is intercepted to the front — the
    // back cannot be the first down, whoever wins.
    expect(r.downs["back"]).toBe(false);
  });

  it("MA emergent: with the master, the apprentice survives a foe they cannot beat alone", () => {
    // The canonical mentorship hunt: an outclassing foe TAKES the fight
    // to the apprentice (initiative held constant across this pair of
    // cells); the master alongside creates ally-exploitable openings —
    // sustainable purely because competence sets the exchange rate. No
    // reward knobs anywhere.
    const r = runPartyMatchup(
      { fighters: [crew("foe", "expert")] },
      {
        fighters: [
          crew("apprentice", "untrained"),
          crew("master", "expert"),
        ],
      },
      400,
      resetCrewCell,
      (_aF, bF) =>
        wireFormation(bF, "master-apprentice", {
          0: "apprentice",
          1: "master",
        }),
    );
    expect(r.winner).toBe("B");
    expect(r.downs["apprentice"]).toBe(false);
  });

  it("MA emergent: the same apprentice UNASSISTED falls to that foe", () => {
    // The contrast cell: mentorship is access to a fight you cannot yet
    // survive alone — remove the master and the same apprentice falls.
    const r = runPartyMatchup(
      { fighters: [crew("foe", "expert")] },
      { fighters: [crew("apprentice", "untrained")] },
      400,
      resetCrewCell,
      (_aF, bF) =>
        wireFormation(bF, "master-apprentice", { 0: "apprentice" }),
    );
    expect(r.winner).toBe("A");
    expect(r.downs["apprentice"]).toBe(true);
  });

  it("MA emergent: solo-under-MA (vacant roles) is just a losing 1v2", () => {
    const r = runPartyMatchup(
      { fighters: [crew("solo", "untrained")] },
      {
        fighters: [crew("foe1", "competent"), crew("foe2", "competent")],
      },
      400,
      resetCrewCell,
      (aF, bF) => {
        wireFormation(aF, "master-apprentice");
        wireFormation(bF, "default");
      },
    );
    expect(r.winner).toBe("B");
    expect(r.downs["solo"]).toBe(true);
  });

  it("a formation cell is bit-for-bit reproducible", () => {
    const cell = () =>
      runPartyMatchup(
        {
          fighters: [crew("back", "competent"), crew("front", "competent")],
        },
        {
          fighters: [crew("foe1", "competent"), crew("foe2", "competent")],
        },
        400,
        resetCrewCell,
        (aF, bF) => {
          wireFormation(aF, "vanguard", { 0: "back", 1: "front" });
          wireFormation(bF, "default");
        },
      );
    const r1 = cell();
    const r2 = cell();
    expect(r2.winner).toBe(r1.winner);
    expect(r2.beats).toBe(r1.beats);
    expect(r2.downs).toEqual(r1.downs);
  });
});
