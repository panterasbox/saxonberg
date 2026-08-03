/**
 * Enchantment via shadows over the CombatReactive hooks (combat-hooks
 * DECISION I — verification, no engine feature): a shadow attached over
 * a hook method **replaces** the engine's dispatch (the chain runs
 * instead of the base body; `Shadow.callDown` reaches it), and detach
 * restores baseline byte-identically — the temporary-enchantment
 * substrate.
 *
 * One boundary pinned here from CODE REALITY (diverging from the
 * plan's optimistic reading): `MixinApi.isCombatReactive` walks
 * attached shadows (the Witness pattern), so a
 * CombatReactiveMixin-composing shadow LIGHTS the narrowing on a
 * mundane weapon — but the proxy dispatches only methods the host
 * itself defines, so a shadow cannot ADD a hook to a host that lacks
 * it. The engine skips the absent method silently (`hookFn`), keeping
 * the fight byte-baseline. A working enchantment therefore rides a
 * host that composes the mixin (its no-op terminals are the base the
 * shadow reshapes).
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { Idea } from "../../stuff/Idea";
import { Character } from "../../character/Character";
import Species from "../../../obj/species/Species";
import BodyPlan from "../../../obj/species/BodyPlan";
import Weapon from "../../../obj/equipment/Weapon";
import type { Stuff } from "../../stuff/Stuff";
import Material from "../../material/Material";
import { Construction } from "../../material/Construction";
import { ContainerMixin } from "../../spatial/Container";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { SchedulerApi } from "../../../api/scheduler";
import { ConditionApi } from "../../../api/condition";
import type { EnergyInflictSpec, InflictSpec } from "../../../api/condition";
import { ElectricityApi } from "../../../api/electricity";
import { ShadowApi } from "../../../api/shadow";
import { Shadow } from "../../stuff/Shadow";
import { Shadowing } from "../../security/decorators";
import { Quantity } from "../../quantity";
import { CombatApi } from "../../../api/combat";
import { CombatTerms, type TermsProposal } from "../CombatTerms";
import { CombatSession } from "../CombatSession";
import { CombatReactiveMixin } from "../CombatReactive";
import type { CombatHookContext } from "../CombatHookContext";
import { EnergizedMixin } from "../../electricity/Energized";
import { MixinApi } from "../../../api/mixin";
import EventRegistry from "../../../obj/EventRegistry";
import { EventApi } from "../../../api/event";

class TestRoom extends ContainerMixin(Idea) {}
class TestFighter extends Character {}

/** A CombatReactive blade whose default hooks are the no-op terminals —
 * the base a temporary enchantment reshapes. */
class PlainReactiveBlade extends CombatReactiveMixin(Weapon) {
  public augmentFires = 0;
  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
    this.augmentFires++;
    return super.augmentInflict(spec, ctx);
  }
}

/** The blessing — continues via callDown, then reshapes the spec. */
class BlessingShadow extends Shadow {
  @Shadowing
  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
    const base = this.callDown<EnergyInflictSpec>(spec, ctx);
    return { ...base, energy: base.energy * 3 };
  }
}

/** A shadow that queues a consequence through the ctx (the drain path
 * is identical from a shadow frame — the engine drains it). */
class ShockingShadow extends Shadow {
  public source: (Stuff & { getVoltage(): unknown }) | null = null;
  @Shadowing
  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
    if (this.source) ctx.deliverShock(this.source as never);
    return this.callDown<InflictSpec>(spec, ctx);
  }
}

/** A mixin-COMPOSING shadow — lights `isCombatReactive` on a mundane
 * host (the Witness pattern); the dispatch boundary is pinned below. */
class EnchantShadow extends CombatReactiveMixin(Shadow) {
  public fires = 0;
  @Shadowing
  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
    this.fires++;
    void ctx;
    return { ...(spec as EnergyInflictSpec), energy: (spec as EnergyInflictSpec).energy * 2 };
  }
}

class TestShocker extends EnergizedMixin(Weapon) {}

let seq = 0;

function steel(): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(600, "MPa"));
  m.setToughness(Quantity.of(200, "MJ/m³"));
  m.setName("steel");
  stampTemplatePathForTest(m, `/obj/material/test/m-${seq++}`);
  return m;
}

function planPathOf(c: Character): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

function makeFighter(room: Stuff, weapon?: Weapon | null): Character {
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
  stampTemplatePathForTest(plan, `/obj/species/BodyPlan/test-fighter-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/obj/species/test/fighter-${id}`);
  const f = makeStuff(() => new TestFighter());
  stampTemplatePathForTest(f, `/test/fighter-${id}`);
  f.setSpecies(species);
  ContainmentApi.move(f as never, room as never);
  if (weapon) {
    weapon.setSlotClaim(planPathOf(f), ["grip"]);
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(
      weapon,
      "grip",
    );
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

const openSessions: CombatSession[] = [];

function open(a: Character, b: Character): CombatSession {
  const terms = CombatTerms.agreed(a.getTemplatePath() ?? "a", nonLethal, true);
  const res = CombatApi.openSession(a as never, b as never, terms);
  if (!res.ok) throw new Error(`openSession failed: ${res.reason}`);
  openSessions.push(res.session);
  return res.session;
}

/** One landed strike (defender pre-eroded to reeling) — returns the
 * primary spec `ConditionApi.inflict` received. */
function landOneStrike(
  a: Character,
  b: Character,
): EnergyInflictSpec {
  const session = open(a, b);
  session.getState(b)!.poise.erode(0.6, 0);
  const spy = vi.spyOn(ConditionApi, "inflict");
  CombatApi.queueGambit(a, "strike");
  CombatApi.queueGambit(b, "defend");
  CombatApi.advance(session);
  const spec = spy.mock.calls[0]![1] as EnergyInflictSpec;
  spy.mockRestore();
  session.dissolve();
  return spec;
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
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe("CombatReactive × shadows — enchantment (DECISION I)", () => {
  it("a blessing shadow reshapes the engine's own dispatch; detach restores byte-baseline", async () => {
    // Baseline fight — the unshadowed fixture's primary energy.
    const room1 = makeStuff(() => new TestRoom());
    const blade1 = makeStuff(() => new PlainReactiveBlade());
    blade1.setConstruction(Construction.of("bladed"));
    blade1.setMaterial(steel());
    const baseline = landOneStrike(
      makeFighter(room1, blade1),
      makeFighter(room1, null),
    );

    // Shadowed fight — the SAME setup with the blessing attached: the
    // engine's next exchange lands the reshaped spec (observed through
    // the engine's dispatch, never a direct call).
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    const room2 = makeStuff(() => new TestRoom());
    const blade2 = makeStuff(() => new PlainReactiveBlade());
    blade2.setConstruction(Construction.of("bladed"));
    blade2.setMaterial(steel());
    const blessing = await StuffApi.create(() => new BlessingShadow());
    ShadowApi.attach(blade2, blessing);
    const blessed = landOneStrike(
      makeFighter(room2, blade2),
      makeFighter(room2, null),
    );
    expect(blessed.energy).toBeCloseTo(baseline.energy * 3, 8);
    // callDown reached the base hook — the fixture's own body ran.
    expect(blade2.augmentFires).toBe(1);

    // Detached fight — byte-baseline again (same trauma spec).
    ShadowApi.detach(blessing);
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    const room3 = makeStuff(() => new TestRoom());
    const blade3 = makeStuff(() => new PlainReactiveBlade());
    blade3.setConstruction(Construction.of("bladed"));
    blade3.setMaterial(steel());
    // Reattach + detach on THIS blade proves the round-trip on one host.
    const blessing2 = await StuffApi.create(() => new BlessingShadow());
    ShadowApi.attach(blade3, blessing2);
    ShadowApi.detach(blessing2);
    const restored = landOneStrike(
      makeFighter(room3, blade3),
      makeFighter(room3, null),
    );
    expect(restored).toEqual(baseline);
  });

  it("a shadow-queued consequence drains from the engine frame (deliverShock, ordered after inflict)", async () => {
    const room = makeStuff(() => new TestRoom());
    const blade = makeStuff(() => new PlainReactiveBlade());
    blade.setConstruction(Construction.of("bladed"));
    blade.setMaterial(steel());
    const shocker = makeStuff(() => new TestShocker());
    shocker.setVoltage(Quantity.of(50, "V"));
    const shadow = await StuffApi.create(() => new ShockingShadow());
    shadow.source = shocker as never;
    ShadowApi.attach(blade, shadow);

    const a = makeFighter(room, blade);
    const b = makeFighter(room, null);
    const session = open(a, b);
    session.getState(b)!.poise.erode(0.6, 0);
    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    const shockSpy = vi
      .spyOn(ElectricityApi, "shockContact")
      .mockImplementation(() => undefined as never);
    CombatApi.queueGambit(a, "strike");
    CombatApi.queueGambit(b, "defend");
    CombatApi.advance(session);

    expect(shockSpy).toHaveBeenCalledTimes(1);
    expect(shockSpy.mock.calls[0]![0]).toBe(shocker);
    expect(shockSpy.mock.invocationCallOrder[0]!).toBeGreaterThan(
      inflictSpy.mock.invocationCallOrder[0]!,
    );
  });

  it("a mixin-composing shadow lights isCombatReactive on a mundane weapon; dispatch needs a host method (the pinned boundary)", async () => {
    const room = makeStuff(() => new TestRoom());
    const mundane = makeStuff(() => new Weapon());
    mundane.setConstruction(Construction.of("bladed"));
    mundane.setMaterial(steel());
    expect(MixinApi.isCombatReactive(mundane)).toBe(false);

    const enchant = await StuffApi.create(() => new EnchantShadow());
    ShadowApi.attach(mundane, enchant);
    // The Witness pattern: the narrowing lights while attached…
    expect(MixinApi.isCombatReactive(mundane)).toBe(true);

    // …but the proxy dispatches only host-defined methods: the engine
    // skips the absent hook silently (hookFn) — the fight is
    // byte-baseline, nothing throws, the shadow body never runs.
    const shadowed = landOneStrike(
      makeFighter(room, mundane),
      makeFighter(room, null),
    );
    expect(enchant.fires).toBe(0);

    // Detach → the seam goes dark; the fight stays byte-baseline.
    ShadowApi.detach(enchant);
    expect(MixinApi.isCombatReactive(mundane)).toBe(false);
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    const room2 = makeStuff(() => new TestRoom());
    const mundane2 = makeStuff(() => new Weapon());
    mundane2.setConstruction(Construction.of("bladed"));
    mundane2.setMaterial(steel());
    const bare = landOneStrike(
      makeFighter(room2, mundane2),
      makeFighter(room2, null),
    );
    expect(shadowed).toEqual(bare);

    // The WORKING conferral shape: the same shadow over a host that
    // composes the mixin (no-op terminals = the base to reshape) — the
    // scan point fires while attached.
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    const room3 = makeStuff(() => new TestRoom());
    const reactive = makeStuff(() => new PlainReactiveBlade());
    reactive.setConstruction(Construction.of("bladed"));
    reactive.setMaterial(steel());
    const enchant2 = await StuffApi.create(() => new EnchantShadow());
    ShadowApi.attach(reactive, enchant2);
    const enchanted = landOneStrike(
      makeFighter(room3, reactive),
      makeFighter(room3, null),
    );
    expect(enchant2.fires).toBe(1);
    expect(enchanted.energy).toBeCloseTo(bare.energy * 2, 8);
    ShadowApi.detach(enchant2);
  });

  it("a shadowed matchup is deterministic — two identical runs, identical outcomes and fire counts", async () => {
    const runOnce = async (): Promise<{
      resolution: string | null;
      beats: number;
      fires: number;
    }> => {
      const room = makeStuff(() => new TestRoom());
      const blade = makeStuff(() => new PlainReactiveBlade());
      blade.setConstruction(Construction.of("bladed"));
      blade.setMaterial(steel());
      const blessing = await StuffApi.create(() => new BlessingShadow());
      ShadowApi.attach(blade, blessing);
      const a = makeFighter(room, blade);
      const b = makeFighter(room, null);
      const session = open(a, b);
      let beats = 0;
      while (session.isActive() && beats < 200) {
        CombatApi.advance(session);
        beats++;
      }
      return {
        resolution: session.getResolution(),
        beats,
        fires: blade.augmentFires,
      };
    };

    const r1 = await runOnce();
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    await bootRegistry();
    const r2 = await runOnce();
    expect(r2).toEqual(r1);
  });
});
