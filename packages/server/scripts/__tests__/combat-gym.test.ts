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

import "../../src/test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../src/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../src/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { Idea } from "../../src/mud/lib/stuff/Idea";
import { Character } from "../../src/mud/lib/character/Character";
import Species from "../../src/mud/platform/idea/species/Species";
import BodyPlan from "../../src/mud/platform/idea/species/BodyPlan";
import Weapon from "../../src/mud/platform/thing/equipment/Weapon";
import Shield from "../../src/mud/platform/thing/equipment/Shield";
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
import EventRegistry from "../../src/mud/platform/idea/EventRegistry";
import { EventApi } from "../../src/mud/api/event";
import {
  runMatchup,
  runMatrix,
  runPartyMatchup,
  Policies,
  type GymPolicy,
  type GymSide,
  type GymPartyFighter,
} from "../combat-gym";
import { CombatApi } from "../../src/mud/api/combat";
import { PartyMemberMixin } from "../../src/mud/lib/party/PartyMember";
import { Party } from "../../src/mud/platform/idea/Party";
import { CombatFormation } from "../../src/mud/platform/idea/CombatFormation";
import { ProxyApi } from "../../src/mud/api/proxy";
import StunBaton from "../../src/mud/platform/thing/equipment/StunBaton";
import { CombatReactiveMixin } from "../../src/mud/lib/combat/CombatReactive";
import type { CombatHookContext } from "../../src/mud/lib/combat/CombatHookContext";
import type { InflictSpec } from "../../src/mud/api/condition";

class TestRoom extends ContainerMixin(Idea) {}
class GymFighter extends Character {}

/** Hook-fire tally for the hooked determinism cell — reset per run, and
 * part of the compared transcript (two runs must count identically). */
const hookFires = { augment: 0, strikeResolved: 0, parry: 0, bypassed: 0 };
function resetHookFires(): void {
  hookFires.augment = 0;
  hookFires.strikeResolved = 0;
  hookFires.parry = 0;
  hookFires.bypassed = 0;
}

/**
 * The hooked determinism cell's instrument (combat-hooks Phase 8): a
 * test-scoped reactive blade whose `augmentInflict` attaches a small
 * fixed-energy `tearing` rider (magnitude-only, no new vocab) and whose
 * witnesses count fires. Deterministic by construction — no RNG, no
 * clock; the counters are module state the cell snapshots per run.
 */
class GymReactiveBlade extends CombatReactiveMixin(Weapon) {
  override augmentInflict(
    spec: InflictSpec,
    ctx: CombatHookContext,
  ): InflictSpec {
    hookFires.augment++;
    ctx.attachRider({ mechanism: "tearing", site: spec.site, energy: 25 });
    return super.augmentInflict(spec, ctx);
  }

  override onStrikeResolved(ctx: CombatHookContext): void {
    hookFires.strikeResolved++;
    super.onStrikeResolved(ctx);
  }

  override onParry(ctx: CombatHookContext): void {
    hookFires.parry++;
    super.onParry(ctx);
  }

  override onBypassed(ctx: CombatHookContext): void {
    hookFires.bypassed++;
    super.onBypassed(ctx);
  }
}

let seq = 0;

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(600, "MPa"));
  m.setToughness(Quantity.of(200, "MJ/m³"));
  m.setName("steel");
  stampTemplatePathForTest(m, `/stuff/idea/material/test/gym-m-${seq++}`);
  return m;
}

/** A weapon/shield loadout — the matrix axis the weapon-playstyle build adds. */
export interface GymLoadout {
  form: string;
  mass: number;
  length: number;
  /** Add a wielded shield in the off-hand. */
  shield?: boolean;
  /** Build the weapon as an armed (switched-on) `StunBaton` — an
   * Energized contact weapon that ALSO shocks on every blow (the
   * combat-hooks Phase-3 migration pin). */
  energized?: boolean;
  /** An UNARMED innate fighter: no weapon is built at all; this channel
   * is authored as `CombatantMixin.naturalAttackChannel` (the legacy
   * single-attack surface) — the combat-hooks Phase-7a species-vocabulary
   * pin (`form`/`mass`/`length` are ignored). */
  natural?: string;
  /** Build the weapon as a `GymReactiveBlade` — a test-scoped
   * `CombatReactiveMixin(Weapon)` whose `augmentInflict` attaches a
   * fixed-energy `tearing` rider (the combat-hooks Phase-8 hooked
   * determinism cell). */
  reactive?: boolean;
}

/** The canonical loadouts the weapon matrix is built from. */
export const Loadouts: Record<string, GymLoadout> = {
  dagger: { form: "bladed", mass: 0.3, length: 0.25 },
  sword: { form: "bladed", mass: 1.0, length: 0.9 },
  spear: { form: "pointed", mass: 1.8, length: 2.4 },
  mace: { form: "hafted", mass: 1.6, length: 0.7 },
  warhammer: { form: "hafted", mass: 3.2, length: 1.1 },
  swordShield: { form: "bladed", mass: 1.0, length: 0.9, shield: true },
  // An armed StunBaton at the authored ~5 kV contact-stun potential
  // (seeds/world/substation/stun-baton.yaml), on mace-class geometry so
  // the pinned cell lands blows (the authored 0.6 kg club can't crack a
  // sword guard — the fight draws and the contact burn heals away
  // before the roster is read).
  stunBaton: { form: "hafted", mass: 1.6, length: 0.7, energized: true },
  // A bare-handed innate fighter (the legacy `naturalAttackChannel`
  // surface, a blunt fist) — the combat-hooks Phase-7a pin fixture for
  // both the `naturalAttacks[]` fallback and the neutral-band derivation.
  unarmed: { form: "", mass: 0, length: 0, natural: "blunt" },
  // The hooked determinism cell's blade — sword geometry, so the ONLY
  // variable against the plain sword is the reactive dynamic itself.
  reactiveBlade: { form: "bladed", mass: 1.0, length: 0.9, reactive: true },
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
        { tissuePath: "/stuff/idea/material/tissue/bone", mass: 8 },
        { tissuePath: "/stuff/idea/material/tissue/flesh", mass: 20 },
      ],
    },
    {
      key: "body.head",
      parent: "body.torso",
      tissues: [{ tissuePath: "/stuff/idea/material/tissue/flesh", mass: 4 }],
    },
    {
      key: "body.arm.right",
      parent: "body.torso",
      tissues: [{ tissuePath: "/stuff/idea/material/tissue/flesh", mass: 3 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/gym-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/gym-${id}`);

  const f = makeStuff(() => new ctor());
  stampTemplatePathForTest(f, `/test/gym-fighter-${id}`);
  f.setSpecies(species);
  ContainmentApi.move(f as never, room as never);

  const occupy = (x: unknown, s: string) =>
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(x, s);

  if (loadout.natural) {
    // Bare-handed: the innate attack is the instrument — no weapon built.
    (f as unknown as { naturalAttackChannel: string }).naturalAttackChannel =
      loadout.natural;
    return f as unknown as Stuff & Engaged;
  }

  const w = makeStuff(() =>
    loadout.reactive
      ? new GymReactiveBlade()
      : loadout.energized
        ? new StunBaton()
        : new Weapon(),
  );
  w.setMaterial(steel());
  w.setConstruction(Construction.of(loadout.form));
  w.setMass(Quantity.of(loadout.mass, "kg"));
  w.setLength(Quantity.of(loadout.length, "m"));
  w.setSlotClaim(plan.getTemplatePath()!, ["grip"]);
  if (loadout.energized) {
    const baton = w as StunBaton;
    baton.setVoltage(Quantity.of(5000, "V"));
    baton.switchOn();
  }
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
  stampTemplatePathForTest(reg, "/platform/idea/EventRegistry");
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    stampTemplatePathForTest(r, "/platform/idea/EventRegistry");
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
    {
      // The combat-hooks Phase-3 migration pin: captured against the
      // PRE-migration engine (the `isEnergized` branch in
      // `commitInflict`); the Energized→instrument-seam flip must
      // byte-preserve it. The "same shock" half of the pin is the
      // sibling condition-roster test below.
      label: "stunbaton-vs-sword@competent",
      a: () =>
        side("stunbaton", Policies.brain, "competent", Loadouts.stunBaton!),
      b: () => side("sword", Policies.brain, "competent", Loadouts.sword!),
      winner: "A",
      beats: 21,
    },
    {
      // The combat-hooks Phase-7a species-vocabulary pin: the unarmed
      // innate matchup — two bare-handed fighters whose legacy
      // `CombatantMixin.naturalAttackChannel` is `blunt` — captured
      // against the PRE-vocabulary engine. Phase 7b's `naturalAttacks[]`
      // legacy fallback and the hint-less neutral-band natural profile
      // `(1, 1, 1, 0)` must byte-preserve it.
      label: "unarmed-vs-unarmed@competent",
      a: () => side("fists-a", Policies.brain, "competent", Loadouts.unarmed!),
      b: () => side("fists-b", Policies.brain, "competent", Loadouts.unarmed!),
      winner: "A",
      beats: 2,
    },
  ];

  for (const pin of PINS) {
    it(`pinned: ${pin.label} → ${pin.winner} in ${pin.beats} beats`, () => {
      const r = runMatchup(pin.a(), pin.b(), 400, resetState);
      expect(r.winner).toBe(pin.winner);
      expect(r.beats).toBe(pin.beats);
    });
  }

  it("pinned: the stun-baton bout's sword side carries the shock contact burn", () => {
    // Winner/beats alone wouldn't notice a dropped shock (the mechanical
    // exchange decides the poise contest) — so the pin's other half is
    // the sword side's post-fight condition roster: every landed baton
    // blow ALSO routed `ElectricityApi.shockContact` → a `burn` trauma
    // with `mechanism: 'shock'` (never the mechanical fold).
    const pin = PINS.find((p) => p.label === "stunbaton-vs-sword@competent")!;
    let sword: Character | null = null;
    const a = side(
      "stunbaton",
      Policies.brain,
      "competent",
      Loadouts.stunBaton!,
    );
    const b: GymSide = {
      label: "sword",
      policy: Policies.brain,
      band: "competent",
      make: () => {
        const f = makeFighter(makeStuff(() => new TestRoom()), Loadouts.sword!);
        sword = f as unknown as Character;
        return f;
      },
    };
    const r = runMatchup(a, b, 400, resetState);
    expect(r.winner).toBe(pin.winner);
    expect(r.beats).toBe(pin.beats);
    expect(
      sword!
        .getConditions()
        .some(
          (c) =>
            c.kind === "trauma" &&
            c.type === "burn" &&
            c.mechanism === "shock",
        ),
    ).toBe(true);
  });
});

describe("combat-gym — the species vocabulary (combat-hooks Phase 7)", () => {
  /** An unarmed fighter whose SPECIES carries the natural attack (the
   * `naturalAttacks[]` surface) instead of the legacy channel. */
  function speciesSide(label: string, bodyMassKg?: number): GymSide {
    return {
      label,
      policy: Policies.brain,
      band: "competent",
      make: () => {
        const f = makeFighter(
          makeStuff(() => new TestRoom()),
          Loadouts.unarmed!,
        );
        const species = (f as unknown as Character).getSpecies()!;
        species.setNaturalAttacks([{ key: "fist", channel: "blunt" }]);
        if (bodyMassKg !== undefined) {
          species.getBodyPlan()!.setBaseMass(bodyMassKg);
        }
        return f;
      },
    };
  }

  it("a single-entry species is byte-identical to the legacy fallback (the 7a pin)", () => {
    // The species list takes precedence over the legacy channel, and a
    // single hint-less entry must reduce to the exact pre-vocabulary
    // behavior — the same winner + beats as the pinned
    // unarmed-vs-unarmed@competent cell (A in 2 beats).
    const r = runMatchup(
      speciesSide("fists-a"),
      speciesSide("fists-b"),
      400,
      resetState,
    );
    expect(r.winner).toBe("A");
    expect(r.beats).toBe(2);
  });

  it("the ogre-reach cell: a large hint-less body is reproducible and departs from the neutral cell", () => {
    // A 400 kg body derives one reach rank + heavy balance from the SAME
    // hint-less spec — the fight opens at `reach` (the unit suite pins
    // that read) and plays out differently from the all-neutral pin.
    const cell = () =>
      runMatchup(
        speciesSide("ogre", 400),
        speciesSide("human"),
        400,
        resetState,
      );
    const r1 = cell();
    const r2 = cell();
    expect(r1.winner).toBe(r2.winner);
    expect(r1.beats).toBe(r2.beats);
    // The body-scale term is real: the cell departs from the neutral
    // unarmed pin (A in 2 beats).
    expect([r1.winner, r1.beats]).not.toEqual(["A", 2]);
  });
});

describe("combat-gym — the influence bridge (fixed-beat injection)", () => {
  it("a fixed-beat CombatApi.influence stagger is reproducible and differs from the uninfluenced pin", () => {
    // The pinned brain-vs-brain@competent cell (A in 21 beats), with one
    // deterministic variation: at beat 5 the A side ALSO issues a heavy
    // stagger at its foe through the external bridge. Zero randomness —
    // two runs are identical — and the instruction is real: the cell's
    // outcome departs from the uninfluenced pin.
    const influencedBrain: GymPolicy = (session, self) => {
      if (session.getBeat() === 5) {
        for (const s of session.getStates()) {
          if ((s.combatant as unknown) !== (self as unknown) && !s.down) {
            CombatApi.influence(s.combatant, {
              kind: "stagger",
              intensity: "heavy",
            });
            break;
          }
        }
      }
      return null; // defer to the engine's brain — the pin's own policy
    };
    const cell = () =>
      runMatchup(
        side("influencer", influencedBrain, "competent"),
        side("brain", Policies.brain, "competent"),
        400,
        resetState,
      );
    const r1 = cell();
    const r2 = cell();
    expect(r1.winner).toBe(r2.winner);
    expect(r1.beats).toBe(r2.beats);
    expect([r1.winner, r1.beats]).not.toEqual(["A", 21]);
  });
});

describe("combat-gym — the hooked determinism cell (combat-hooks Phase 8)", () => {
  /** One run of the hooked cell: a reactive blade (sword geometry + the
   * `tearing` rider) against a plain sword, both on the engine brain at
   * competent — the pinned brain-vs-brain cell with exactly one variable
   * added: the hook. The transcript compared across runs includes the
   * hook-fire tally. */
  function hookedCell(): {
    winner: "A" | "B" | "draw";
    beats: number;
    fires: typeof hookFires;
    swordConditions: ReturnType<Character["getConditions"]>;
  } {
    resetHookFires();
    let sword: Character | null = null;
    const a = side(
      "reactive",
      Policies.brain,
      "competent",
      Loadouts.reactiveBlade!,
    );
    const b: GymSide = {
      label: "sword",
      policy: Policies.brain,
      band: "competent",
      make: () => {
        const f = makeFighter(makeStuff(() => new TestRoom()), Loadouts.sword!);
        sword = f as unknown as Character;
        return f;
      },
    };
    const r = runMatchup(a, b, 400, resetState);
    return {
      winner: r.winner,
      beats: r.beats,
      fires: { ...hookFires },
      swordConditions: sword!.getConditions(),
    };
  }

  it("a hooked session is bit-for-bit reproducible — winner, beats, AND hook-fire counts", () => {
    const r1 = hookedCell();
    const r2 = hookedCell();
    expect(r1.winner).toBe(r2.winner);
    expect(r1.beats).toBe(r2.beats);
    expect(r1.fires).toEqual(r2.fires);
    // The hook is live, not vacuously equal: the blade's augment fired.
    expect(r1.fires.augment).toBeGreaterThan(0);
    expect(r1.fires.strikeResolved).toBeGreaterThan(0);
  });

  it("the rider is real: the hooked cell differs from the bare cell on the roster while the mechanical trace stays pinned", () => {
    // The pinned brain-vs-brain@competent cell is A in 21 beats; the ONLY
    // change here is the A side's blade composing CombatReactiveMixin with
    // a `tearing` rider. The rider is damage-side, not contest-side — like
    // the stun-baton's shock, it does NOT perturb the poise contest, so
    // the mechanical trace stays byte-identical to the bare pin (the
    // byte-parity default holding alongside a live hooked cell, with the
    // full no-hook PINS table re-asserted in this same suite run)...
    const r = hookedCell();
    expect(r.winner).toBe("A");
    expect(r.beats).toBe(21);
    // ...while the cells genuinely DIFFER where the rider lives: the
    // sword side wears its mark — an avulsion trauma with the raw
    // `tearing` mechanism (never the mechanical fold) — which the bare
    // pinned cell's sword never carries. The stun-baton condition-roster
    // sibling, on the hook path.
    const riderLanded = r.swordConditions.some(
      (c) =>
        c.kind === "trauma" &&
        c.type === "avulsion" &&
        c.mechanism === "tearing",
    );
    expect(riderLanded).toBe(true);
  });
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
  const path = `/platform/idea/CombatFormation/${formation}`;
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
