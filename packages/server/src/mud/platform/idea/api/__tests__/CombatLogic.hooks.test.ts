/**
 * CombatLogic — the hook seams (combat-hooks Phase 2): instrument /
 * participant / venue dispatch + the consequence drain, proven seam by
 * seam with recording fixtures. The engine harness mirrors
 * `CombatLogic.test.ts` (bodied fighters, manual `CombatApi.advance`).
 *
 * The byte-parity gate for this build is the gym pinned-regression
 * suite; this file proves the seams FIRE (and drain) — never that they
 * change an unhooked fight.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import { Idea } from "../../../../lib/stuff/Idea";
import { Character } from "../../../../lib/character/Character";
import Species from "../../species/Species";
import BodyPlan from "../../species/BodyPlan";
import Weapon from "../../../thing/equipment/Weapon";
import Armor from "../../../thing/equipment/Armor";
import Shield from "../../../thing/equipment/Shield";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import Material from "../../../../lib/material/Material";
import { Construction } from "../../../../lib/material/Construction";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainmentApi } from "../../../../api/containment";
import { StuffApi } from "../../../../api/stuff";
import { SchedulerApi } from "../../../../api/scheduler";
import { ConditionApi } from "../../../../api/condition";
import type { EnergyInflictSpec, InflictSpec } from "../../../../api/condition";
import type { ConductionOutcome } from "../../../../api/electricity";
import { MaterialApi } from "../../../../api/material";
import { Quantity } from "../../../../lib/quantity";
import { CombatApi } from "../../../../api/combat";
import {
  CombatTerms,
  type TermsProposal,
} from "../../../../lib/combat/CombatTerms";
import { CombatSession } from "../../../../lib/combat/CombatSession";
import { CombatNarration } from "../../../../lib/combat/CombatNarration";
import { CombatHookContext } from "../../../../lib/combat/CombatHookContext";
import { CombatReactiveMixin } from "../../../../lib/combat/CombatReactive";
import type { Slotted } from "../../../../lib/slot/Slotted";
import { EnergizedMixin } from "../../../../lib/electricity/Energized";
import StunBaton from "../../../thing/equipment/StunBaton";
import type { Channel } from "../../../../lib/material/Channel";
import EventRegistry from "../../EventRegistry";
import { EventApi } from "../../../../api/event";

/* ───────────────────────── fixtures ───────────────────────── */

class TestRoom extends ContainerMixin(Idea) {}

/** A hook-bearing venue (DECISION G) — presence-dispatched. */
class ReactiveRoom extends ContainerMixin(Idea) {
  public venueLog: string[] = [];
  onCombatOpened(ctx: CombatHookContext): void {
    this.venueLog.push(`opened:${ctx.beat}`);
  }
  onBloodDrawn(ctx: CombatHookContext): void {
    this.venueLog.push(`blood:${ctx.beat}`);
  }
  onCombatResolved(ctx: CombatHookContext): void {
    this.venueLog.push(`resolved:${ctx.resolution}`);
  }
}

/** Cross-combatant dispatch-order sequence (cleared per test). */
const HookSeq: string[] = [];

/** A participant fixture recording every terminal fire. */
class HookedFighter extends Character {
  public label = "";
  public enterEffect: ((ctx: CombatHookContext) => void) | null = null;
  public exchangeEffect: ((ctx: CombatHookContext) => void) | null = null;
  public hookLog: string[] = [];

  private note(event: string): void {
    this.hookLog.push(event);
    HookSeq.push(`${this.label}:${event}`);
  }
  onSessionEntered(ctx: CombatHookContext): void {
    this.note("session-entered");
    this.enterEffect?.(ctx);
    super.onSessionEntered(ctx);
  }
  onExchangeResolved(ctx: CombatHookContext): void {
    const role = ctx.actor === (this as unknown as Stuff) ? "actor" : "target";
    this.note(`exchange:${ctx.outcome}:${role}`);
    this.exchangeEffect?.(ctx);
    super.onExchangeResolved(ctx);
  }
  onPoiseBandChanged(ctx: CombatHookContext): void {
    this.note(`band:${ctx.actorState?.poise.band() ?? "?"}`);
    super.onPoiseBandChanged(ctx);
  }
  onDowned(ctx: CombatHookContext): void {
    this.note("downed");
    super.onDowned(ctx);
  }
  onDefeated(ctx: CombatHookContext): void {
    this.note(`defeated:${ctx.targetState ? "live-states" : "no-states"}`);
    super.onDefeated(ctx);
  }
  onDefeatedFoe(ctx: CombatHookContext): void {
    this.note(`defeated-foe:${ctx.targetState ? "live-states" : "no-states"}`);
    super.onDefeatedFoe(ctx);
  }
  onCoupBegun(ctx: CombatHookContext): void {
    this.note("coup-begun");
    super.onCoupBegun(ctx);
  }
}

/** The instrument fixture — a CombatReactive blade recording every hook
 * fire, with a pluggable augment body. */
class ReactiveTestBlade extends CombatReactiveMixin(Weapon) {
  public fires: string[] = [];
  public onAugment:
    | ((spec: EnergyInflictSpec, ctx: CombatHookContext) => InflictSpec)
    | null = null;
  public stashed: CombatHookContext | null = null;

  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
    this.fires.push(`augment:${spec.mechanism}`);
    this.stashed = ctx;
    const out = this.onAugment
      ? this.onAugment(spec as EnergyInflictSpec, ctx)
      : spec;
    return super.augmentInflict(out, ctx);
  }
  onStrikeResolved(ctx: CombatHookContext): void {
    this.fires.push(`strike-resolved:${ctx.outcome}`);
    super.onStrikeResolved(ctx);
  }
  onParry(ctx: CombatHookContext): void {
    this.fires.push(`parry:${ctx.outcome}`);
    super.onParry(ctx);
  }
  onBypassed(ctx: CombatHookContext): void {
    this.fires.push(`bypassed:${ctx.outcome}`);
    super.onBypassed(ctx);
  }
  onWielded(host: Stuff & Slotted, slot: string): void {
    this.fires.push(`wielded:${slot}`);
    super.onWielded(host, slot);
  }
  onUnwielded(host: Stuff & Slotted, slot: string): void {
    this.fires.push(`unwielded:${slot}`);
    super.onUnwielded(host, slot);
  }
}

/** Reactive worn armor — records `onStruck` (thorn mail plugs a body). */
class ReactivePlate extends CombatReactiveMixin(Armor) {
  public fires: string[] = [];
  public onStruckEffect: ((ctx: CombatHookContext) => void) | null = null;
  onStruck(ctx: CombatHookContext): void {
    this.fires.push(`struck:${ctx.deflected ? "deflected" : "landed"}`);
    this.onStruckEffect?.(ctx);
    super.onStruck(ctx);
  }
}

/** Reactive wielded shield — joins the covering stack when facing. */
class ReactiveShieldItem extends CombatReactiveMixin(Shield) {
  public fires: string[] = [];
  onStruck(ctx: CombatHookContext): void {
    this.fires.push(`struck:${ctx.deflected ? "deflected" : "landed"}`);
    super.onStruck(ctx);
  }
}

/** A dynamic-innate creature — the bare augment carrier (DECISION D-1).
 * The recorder sits ABOVE the mixin layer so it is the dispatched body. */
class ReactiveBeastBase extends CombatReactiveMixin(HookedFighter) {
  public beastFires: string[] = [];
  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
    this.beastFires.push(`augment:${spec.mechanism}`);
    return super.augmentInflict(spec, ctx);
  }
}

/** An energized source for the deliverShock drain arm. */
class TestShocker extends EnergizedMixin(Weapon) {}

/** The electric eel (DECISION K's acceptance shape) — an Energized
 * creature with a `shock` natural attack. Composes `EnergizedMixin`
 * DIRECTLY: `Species.innateMixins` conferral is activation-gated, not
 * composition, and is the documented trap for this narrowing. */
class ElectricEel extends EnergizedMixin(HookedFighter) {}

let seq = 0;

function mat(hardness: number, toughness: number, name: string): Material {
  const m = makeStuff(() => new Material());
  m.setHardness(Quantity.of(hardness, "MPa"));
  m.setToughness(Quantity.of(toughness, "MJ/m³"));
  m.setName(name);
  stampTemplatePathForTest(m, `/stuff/idea/material/test/m-${seq++}`);
  return m;
}
const steel = () => mat(600, 200, "steel");
const cloth = () => mat(5, 1, "cloth");

function planPathOf(c: Character): string {
  return c.getSpecies()!.getBodyPlan()!.getTemplatePath()!;
}

interface FighterOpts {
  natural?: Channel;
  weaponForm?: string;
  weaponMaterial?: Material;
  weaponMass?: number;
  weaponLength?: number;
  /** A pre-built weapon instance (a ReactiveTestBlade) to wield. */
  weapon?: Weapon;
  ctor?: new () => Character;
  label?: string;
}

function makeFighter(
  room: Stuff,
  opts: FighterOpts = {},
): Character {
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
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/test-fighter-${id}`);

  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/fighter-${id}`);

  const f = makeStuff(() => new (opts.ctor ?? HookedFighter)());
  stampTemplatePathForTest(f, `/test/fighter-${id}`);
  f.setSpecies(species);
  if (f instanceof HookedFighter) f.label = opts.label ?? `f${id}`;
  if (opts.natural) f.naturalAttackChannel = opts.natural;
  ContainmentApi.move(f as never, room as never);
  let weapon = opts.weapon ?? null;
  if (!weapon && opts.weaponForm) {
    weapon = makeStuff(() => new Weapon());
    weapon.setConstruction(Construction.of(opts.weaponForm));
  }
  if (weapon) {
    if (opts.weaponMaterial) weapon.setMaterial(opts.weaponMaterial);
    if (opts.weaponMass !== undefined) {
      weapon.setMass(Quantity.of(opts.weaponMass, "kg"));
    }
    if (opts.weaponLength !== undefined) {
      weapon.setLength(Quantity.of(opts.weaponLength, "m"));
    }
    weapon.setSlotClaim(planPathOf(f), ["grip"]);
    (f as unknown as { occupy(x: unknown, s: string): void }).occupy(
      weapon,
      "grip",
    );
  }
  return f;
}

/** A pre-built reactive blade wielded via `makeFighter({weapon})`. */
function reactiveBlade(form = "bladed", material?: Material): ReactiveTestBlade {
  const w = makeStuff(() => new ReactiveTestBlade());
  w.setConstruction(Construction.of(form));
  if (material) w.setMaterial(material);
  return w;
}

/** Worn armor helper. */
function wearArmor(
  fighter: Character,
  armor: Armor,
  form: string,
  material: Material,
): void {
  armor.setMaterial(material);
  armor.setConstruction(Construction.of(form));
  armor.setSlotClaim(planPathOf(fighter), ["torso"]);
  (fighter as unknown as { occupy(x: unknown, s: string): void }).occupy(
    armor,
    "torso",
  );
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

const openSessions: CombatSession[] = [];

function open(
  a: Character,
  b: Character,
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

/** Queue a strike for `a`, keep `b` on defend, advance one beat. */
function strikeBeat(session: CombatSession, a: Character, b: Character): void {
  CombatApi.queueGambit(a, "strike");
  CombatApi.queueGambit(b, "defend");
  CombatApi.advance(session);
}

beforeAll(async () => {
  await bootRegistry();
});

beforeEach(async () => {
  installV1QuantityMarshallers();
  StuffApi.clearAll();
  SchedulerApi._clearAllForTesting();
  HookSeq.length = 0;
  await bootRegistry();
});

afterEach(() => {
  for (const s of openSessions.splice(0)) s.dissolve();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/* ───────────────── instrument seam — augmentInflict ───────────────── */

describe("CombatLogic hooks — augmentInflict (the compute seam)", () => {
  it("fires on the striking weapon with the pre-inflict spec; identity passes through", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0); // reeling → a normal land

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    strikeBeat(session, a, b);

    expect(blade.fires).toContain("augment:edge");
    // The identity default → inflict received the untouched engine spec.
    const primary = inflictSpy.mock.calls[0]![1] as EnergyInflictSpec;
    expect(primary.mechanism).toBe("edge");
    expect(primary.site).toBe("body.torso");
    expect(Number.isFinite(primary.energy)).toBe(true);
  });

  it("a reshaped return is what inflict receives — the heat re-channel wounds as a burn", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    blade.onAugment = (spec) => ({ ...spec, mechanism: "heat", energy: 8 });
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);

    // The non-mechanical relax: the flaming blade re-channelled its
    // primary — the defender carries a burn, not a laceration.
    expect(
      b.getConditions().some((c) => c.kind === "trauma" && c.type === "burn"),
    ).toBe(true);
  });

  it("a malformed return warns and falls back to the pre-augment spec", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    blade.onAugment = () =>
      ({ mechanism: "shock", site: 42, energy: Number.NaN }) as never;
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    strikeBeat(session, a, b);

    expect(warn.mock.calls.some((c) => String(c[0]).includes("malformed"))).toBe(
      true,
    );
    const primary = inflictSpy.mock.calls[0]![1] as EnergyInflictSpec;
    expect(primary.mechanism).toBe("edge"); // the pre-augment spec
  });

  it("innate path: an unarmed CombatReactive creature is its own carrier", () => {
    const room = makeStuff(() => new TestRoom());
    const beast = makeFighter(room, {
      ctor: ReactiveBeastBase,
      natural: "point",
      label: "beast",
    }) as ReactiveBeastBase;
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(beast, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, beast, b);
    expect(beast.beastFires).toContain("augment:point");
  });

  it("double-fire guard: an armed CombatReactive creature fires the weapon only", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    const beast = makeFighter(room, {
      ctor: ReactiveBeastBase,
      natural: "point",
      weapon: blade,
      label: "beast",
    }) as ReactiveBeastBase;
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(beast, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, beast, b);
    expect(blade.fires.some((f) => f.startsWith("augment:"))).toBe(true);
    expect(beast.beastFires).toHaveLength(0); // exactly one carrier
  });
});

/* ─────────────── instrument seam — outcome witnesses ─────────────── */

describe("CombatLogic hooks — outcome witnesses (strike-resolved / parry / bypassed / struck)", () => {
  it("onStrikeResolved fires on the actor's carrier with the exchange outcome (land)", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);
    expect(blade.fires).toContain("strike-resolved:land");
  });

  it("onStrikeResolved hears its own parried outcome (the combo-weapon case)", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, {
      weaponForm: "bladed",
      weaponMaterial: steel(),
    });
    const session = open(a, b, nonLethal);
    // A reeling (not overextended) attacker vs a steady armed guard →
    // parried (and the defender's riposte runs before the witness).
    session.getState(a)!.poise.erode(0.55, 0);

    strikeBeat(session, a, b);
    expect(blade.fires).toContain("strike-resolved:parried");
  });

  it("onParry fires on the parried outcome's guarding instrument", () => {
    const room = makeStuff(() => new TestRoom());
    const guardBlade = reactiveBlade("bladed", steel());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weapon: guardBlade });
    const session = open(a, b, nonLethal);
    session.getState(a)!.poise.erode(0.55, 0); // reeling attacker

    strikeBeat(session, a, b);
    expect(guardBlade.fires).toContain("parry:parried");
  });

  it("onBypassed fires on a steady-but-guardless (flail) defender's instrument", () => {
    const room = makeStuff(() => new TestRoom());
    const flail = reactiveBlade("flail", steel());
    const a = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const b = makeFighter(room, { weapon: flail });
    const session = open(a, b, nonLethal);

    strikeBeat(session, a, b);
    expect(flail.fires).toContain("bypassed:land");
    expect(flail.fires.some((f) => f.startsWith("parry:"))).toBe(false);
  });

  it("onStruck fires on reactive worn armor + facing shield with ctx.deflected on a turned blow", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const plate = makeStuff(() => new ReactivePlate());
    wearArmor(b, plate, "plate", steel());
    const shield = makeStuff(() => new ReactiveShieldItem());
    shield.setMaterial(steel());
    shield.setConstruction(Construction.of("plate"));
    shield.setSlotClaim(planPathOf(b), ["offgrip"]);
    (b as unknown as { occupy(x: unknown, s: string): void }).occupy(
      shield,
      "offgrip",
    );
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);
    // Steel plate + shield turn the edge — both covering items still hear
    // the blow, flagged deflected ("the shield took the blow").
    expect(plate.fires).toContain("struck:deflected");
    expect(shield.fires).toContain("struck:deflected");
  });

  it("onStruck fires with landed=false ctx.deflected when the blow bites through weak armor", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const padded = makeStuff(() => new ReactivePlate());
    wearArmor(b, padded, "padded", cloth());
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);
    expect(padded.fires).toContain("struck:landed");
  });
});

/* ───────────────────── the consequence drain ───────────────────── */

describe("CombatLogic hooks — the consequence drain", () => {
  it("attachRider lands a second trauma after the primary and stamps lastStruckBy", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    blade.onAugment = (spec, ctx) => {
      // The venom-blade rider — a second, separate wound to the head
      // (uncovered) while steel plate turns the primary at the torso.
      ctx.attachRider({ mechanism: "point", site: "body.head", energy: 3 });
      return spec;
    };
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const plate = makeStuff(() => new Armor());
    wearArmor(b, plate, "plate", steel());
    const session = open(a, b, nonLethal);
    const bState = session.getState(b)!;
    bState.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    strikeBeat(session, a, b);

    // Primary (deflected by plate) then the rider, in that order.
    const mechanisms = inflictSpy.mock.calls.map(
      (c) => (c[1] as EnergyInflictSpec).mechanism,
    );
    expect(mechanisms.indexOf("edge")).toBeLessThan(
      mechanisms.indexOf("point"),
    );
    // The rider landed on the target's bare head…
    expect(
      b.getConditions().some((c) => c.kind === "trauma" && c.site === "body.head"),
    ).toBe(true);
    // …and stamped the killing edge exactly as the engine's own inflict
    // would (the primary was turned, so the rider is the only stamp).
    expect(bState.lastStruckBy).toBe(a);
  });

  it("thorn mail: an on:'attacker' rider from onStruck wounds the ATTACKER and never stamps lastStruckBy", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const thorn = makeStuff(() => new ReactivePlate());
    thorn.onStruckEffect = (ctx) => {
      ctx.attachRider(
        { mechanism: "point", site: "body.torso", energy: 3 },
        "attacker",
      );
    };
    wearArmor(b, thorn, "plate", steel());
    const session = open(a, b, nonLethal);
    const aState = session.getState(a)!;
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);

    expect(thorn.fires.length).toBeGreaterThan(0);
    // The rider bit the striker back…
    expect(a.getConditions().some((c) => c.kind === "trauma")).toBe(true);
    // …but a recipient who is NOT the exchange target takes no
    // killing-edge stamp (the defender never landed a blow).
    expect(aState.lastStruckBy).toBeNull();
  });

  it("introduceToxin raises the recipient's toxin burden (the hazard-dart parity)", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    blade.onAugment = (spec, ctx) => {
      ctx.introduceToxin("venom", 5);
      return spec;
    };
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);
    const burdens = (b as unknown as { toxinBurdens: Record<string, number> })
      .toxinBurdens;
    expect(burdens["venom"] ?? 0).toBeGreaterThanOrEqual(5);
  });

  it("attachFlavor emits exactly one witness-loop line AFTER the exchange narration", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    blade.onAugment = (spec, ctx) => {
      ctx.attachFlavor("The blade sings a thin, hungry note.");
      return spec;
    };
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const seq2: string[] = [];
    vi.spyOn(CombatNarration, "narrate").mockImplementation(() => {
      seq2.push("narrate");
      return "id";
    });
    const flavorSpy = vi
      .spyOn(CombatNarration, "narrateFlavor")
      .mockImplementation((_anchor, line) => {
        seq2.push(`flavor:${line}`);
        return "id";
      });
    strikeBeat(session, a, b);

    const flavorIdx = seq2.findIndex((s) => s.startsWith("flavor:"));
    expect(flavorIdx).toBeGreaterThan(seq2.indexOf("narrate"));
    expect(flavorSpy).toHaveBeenCalledTimes(1);
    expect(flavorSpy.mock.calls[0]![1]).toBe(
      "The blade sings a thin, hungry note.",
    );
  });

  it("adjustReserve (lifesteal) drains the defender's endurance and adjusts the attacker's, in queue order", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    blade.onAugment = (spec, ctx) => {
      // Three queued adjustments; the order is observable through the
      // clamp — +50 on a full gauge clamps at the cap, so the final 70
      // is only reachable if the restore ran BEFORE the drain.
      ctx.adjustReserve("endurance", Quantity.of(-10, "%"), "defender");
      ctx.adjustReserve("endurance", Quantity.of(50, "%"), "attacker");
      ctx.adjustReserve("endurance", Quantity.of(-30, "%"), "attacker");
      return spec;
    };
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);
    expect(blade.fires.some((f) => f.startsWith("augment:"))).toBe(true);
    expect(b.getEndurance().current.rawValue()).toBeCloseTo(90, 5);
    expect(a.getEndurance().current.rawValue()).toBeCloseTo(70, 5);
  });

  it("wearInstrument degrades the striking weapon; inert against a bare-handed attacker", () => {
    // Armed attacker vs the rust-monster-shaped defender.
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const rust = makeFighter(room, { label: "rust" }) as HookedFighter;
    rust.naturalAttackChannel = "blunt";
    rust.exchangeEffect = (ctx) => {
      if (ctx.target === (rust as unknown as Stuff)) {
        ctx.wearInstrument(0.25, "attacker");
      }
    };
    const weapon = (a as unknown as { getOccupant(s: string): Stuff }).getOccupant(
      "grip",
    ) as Weapon;
    expect(weapon.getCondition()).toBe(1);
    const session = open(a, rust, nonLethal);
    session.getState(rust)!.poise.erode(0.6, 0);
    strikeBeat(session, a, rust);
    expect(weapon.getCondition()).toBeLessThan(1);

    // Bare-handed attacker: the same consequence is inert (nothing to eat).
    const room2 = makeStuff(() => new TestRoom());
    const bare = makeFighter(room2, { natural: "blunt" });
    const rust2 = makeFighter(room2, { label: "rust2" }) as HookedFighter;
    rust2.naturalAttackChannel = "blunt";
    rust2.exchangeEffect = (ctx) => {
      if (ctx.target === (rust2 as unknown as Stuff)) {
        ctx.wearInstrument(0.25, "attacker");
      }
    };
    const session2 = open(bare, rust2, nonLethal);
    session2.getState(rust2)!.poise.erode(0.6, 0);
    expect(() => strikeBeat(session2, bare, rust2)).not.toThrow();
    expect(rust2.hookLog.some((e) => e.startsWith("exchange:"))).toBe(true);
  });

  it("deliverShock routes through the source's shockContact AFTER the primary inflict", () => {
    const room = makeStuff(() => new TestRoom());
    const shocker = makeStuff(() => new TestShocker());
    shocker.setVoltage(Quantity.of(50, "V"));
    const blade = reactiveBlade("bladed", steel());
    blade.onAugment = (spec, ctx) => {
      ctx.deliverShock(shocker);
      return spec;
    };
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    const shockSpy = vi
      .spyOn(
        shocker as unknown as { shockContact(v: unknown): unknown },
        "shockContact",
      )
      .mockImplementation(() => undefined as never);
    strikeBeat(session, a, b);

    expect(shockSpy).toHaveBeenCalledTimes(1);
    expect(shockSpy.mock.calls[0]![0]).toBe(b);
    expect(shockSpy.mock.invocationCallOrder[0]!).toBeGreaterThan(
      inflictSpy.mock.invocationCallOrder[0]!,
    );
  });

  it("a landed energized hit: the mechanical inflict precedes shockContact, once each (the stun-baton ordering)", () => {
    // The Phase-3 migration's ordering fixture: a real armed StunBaton
    // lands a blow — the mechanical `ConditionApi.inflict` fires first,
    // then `baton.shockContact(target)`, exactly once
    // each. Green against the pre-migration `isEnergized` branch AND
    // the instrument-seam drain that replaces it (same sequence
    // position — DECISION D-4).
    const room = makeStuff(() => new TestRoom());
    const baton = makeStuff(() => new StunBaton());
    baton.setMaterial(steel());
    baton.setConstruction(Construction.of("hafted"));
    baton.setVoltage(Quantity.of(5000, "V"));
    baton.switchOn();
    const a = makeFighter(room, { weapon: baton });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    const shockSpy = vi
      .spyOn(
        baton as unknown as { shockContact(v: unknown): unknown },
        "shockContact",
      )
      .mockImplementation(() => []);
    strikeBeat(session, a, b);

    // Once each: the mechanical blow through the covering fold…
    expect(inflictSpy).toHaveBeenCalledTimes(1);
    const primary = inflictSpy.mock.calls[0]![1] as EnergyInflictSpec;
    expect(primary.mechanism).toBe("blunt");
    // …then the two-terminal shock, after it.
    expect(shockSpy).toHaveBeenCalledTimes(1);
    expect(shockSpy.mock.calls[0]![0]).toBe(b);
    expect(shockSpy.mock.invocationCallOrder[0]!).toBeGreaterThan(
      inflictSpy.mock.invocationCallOrder[0]!,
    );
  });

  it("a switched-OFF baton lands only the mechanical blow (the effectiveVoltage guard, unmoved)", () => {
    const room = makeStuff(() => new TestRoom());
    const baton = makeStuff(() => new StunBaton());
    baton.setMaterial(steel());
    baton.setConstruction(Construction.of("hafted"));
    baton.setVoltage(Quantity.of(5000, "V"));
    // NOT switched on — safed. The queued delivery still reaches the
    // conduction walk, which no-ops on a dead source.
    const a = makeFighter(room, { weapon: baton });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    strikeBeat(session, a, b);

    const mechanisms = inflictSpy.mock.calls.map(
      (c) => (c[1] as InflictSpec).mechanism,
    );
    expect(mechanisms).toEqual(["blunt"]); // the mechanical blow only
    expect(
      b.getConditions().some(
        (c) => c.kind === "trauma" && c.mechanism === "shock",
      ),
    ).toBe(false);
  });

  it("a drained context is sealed — late attach* throws", () => {
    const room = makeStuff(() => new TestRoom());
    const blade = reactiveBlade("bladed", steel());
    const a = makeFighter(room, { weapon: blade });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    strikeBeat(session, a, b);
    expect(blade.stashed).not.toBeNull();
    expect(() => blade.stashed!.attachFlavor("too late")).toThrow(/sealed/);
  });

  it("the uniform drain rule: a consequence queued from a witness ctx (onSessionEntered afflict) lands", () => {
    const room = makeStuff(() => new TestRoom());
    const aura = makeFighter(room, {
      weaponForm: "bladed",
      label: "aura",
    }) as HookedFighter;
    aura.enterEffect = (ctx) => {
      // The fear aura: an authored condition on the foe at entry.
      ctx.afflict(
        { kind: "trauma", type: "contusion", site: "body.torso", severity: 0.2 },
        "defender",
      );
    };
    const b = makeFighter(room, { weaponForm: "bladed" });
    open(aura, b, nonLethal);

    expect(
      b.getConditions().some(
        (c) => c.kind === "trauma" && c.type === "contusion",
      ),
    ).toBe(true);
  });
});

/* ─────────────── participant terminals + venue hooks ─────────────── */

describe("CombatLogic hooks — participant terminals", () => {
  it("onSessionEntered fires at open (initiator then defender) and on a mid-fight joiner", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", label: "a" }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed", label: "b" }) as HookedFighter;
    const c = makeFighter(room, { weaponForm: "bladed", label: "c" }) as HookedFighter;
    const session = open(a, b, nonLethal);
    expect(HookSeq.filter((e) => e.endsWith("session-entered"))).toEqual([
      "a:session-entered",
      "b:session-entered",
    ]);
    expect(
      CombatApi.join(c as never, a as never, session.getTerms()).ok,
    ).toBe(true);
    expect(c.hookLog).toContain("session-entered");
  });

  it("onExchangeResolved fires once per exchange, actor-first then target", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", label: "a" }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed", label: "b" }) as HookedFighter;
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);
    HookSeq.length = 0;

    strikeBeat(session, a, b);
    const exchange = HookSeq.filter((e) => e.includes(":exchange:"));
    expect(exchange[0]).toBe("a:exchange:land:actor");
    expect(exchange[1]).toBe("b:exchange:land:target");
  });

  it("a throwing witness is guarded: warn-and-skip, the beat completes, the other participant still fires", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", label: "a" }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed", label: "b" }) as HookedFighter;
    // The broken author hook: the ACTOR's onExchangeResolved throws
    // mid-body (after the note, so its fire is still observable).
    a.exchangeEffect = () => {
      throw new Error("author bug");
    };
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);
    HookSeq.length = 0;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // The beat completes — the throw never escapes the dispatch loop…
    expect(() => strikeBeat(session, a, b)).not.toThrow();
    // …the target's witness (dispatched AFTER the throwing actor's)
    // still fires…
    const exchange = HookSeq.filter((e) => e.includes(":exchange:"));
    expect(exchange[0]).toBe("a:exchange:land:actor");
    expect(exchange[1]).toBe("b:exchange:land:target");
    expect(session.isActive()).toBe(true);
    // …and the guard warned with the seam's label.
    expect(
      warnSpy.mock.calls.some(
        (c) => typeof c[0] === "string" && c[0].includes("onExchangeResolved threw"),
      ),
    ).toBe(true);
  });

  it("onPoiseBandChanged is the per-beat NET transition (roster order, no repeats)", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", label: "a" }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed", label: "b" }) as HookedFighter;
    const session = open(a, b, nonLethal);

    // A beat where nothing moves the gauges (mutual defend at full
    // poise — the restore clamps at the ceiling) → no band events.
    CombatApi.queueGambit(a, "defend");
    CombatApi.queueGambit(b, "defend");
    CombatApi.advance(session);
    expect(a.hookLog.filter((e) => e.startsWith("band:"))).toHaveLength(0);
    expect(b.hookLog.filter((e) => e.startsWith("band:"))).toHaveLength(0);

    // Real exchanges move them; the net comparison fires — and never
    // repeats a band for the same fighter back-to-back (net, not spam).
    for (let i = 0; i < 8 && session.isActive(); i++) {
      strikeBeat(session, a, b);
    }
    const bBands = b.hookLog
      .filter((e) => e.startsWith("band:"))
      .map((e) => e.slice(5));
    expect(bBands.length).toBeGreaterThan(0);
    for (let i = 1; i < bBands.length; i++) {
      expect(bBands[i]).not.toBe(bBands[i - 1]);
    }
  });

  it("onDowned then onDefeated on the victim (states still live), onDefeatedFoe on the named winner", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, {
      weaponForm: "bladed",
      weaponMaterial: steel(),
      label: "winner",
    }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed", label: "victim" }) as HookedFighter;
    const session = open(a, b, nonLethal);
    session.getState(b)!.poise.erode(0.85, 0); // → open; the exploit downs
    HookSeq.length = 0;

    strikeBeat(session, a, b);
    expect(session.getState(b)?.down ?? true).toBe(true);
    const downedIdx = HookSeq.indexOf("victim:downed");
    const defeatedIdx = HookSeq.indexOf("victim:defeated:live-states");
    const foeIdx = HookSeq.indexOf("winner:defeated-foe:live-states");
    expect(downedIdx).toBeGreaterThanOrEqual(0);
    expect(defeatedIdx).toBeGreaterThan(downedIdx);
    expect(foeIdx).toBeGreaterThan(defeatedIdx); // victim first, then victor
    expect(a.hookLog).not.toContain("defeated:live-states"); // victim only
  });

  it("onDefeatedFoe fires on the CONTEST killer (the cull path)", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, {
      weaponForm: "bladed",
      weaponMaterial: steel(),
      label: "killer",
    }) as HookedFighter;
    const beast = makeFighter(room, { natural: "point", label: "beast" }) as HookedFighter;
    const session = open(a, beast, lethal, true);
    session.getState(beast)!.poise.erode(0.85, 0);

    strikeBeat(session, a, beast);
    expect(session.getResolution()).toBe("death");
    expect(a.hookLog).toContain("defeated-foe:live-states");
  });

  it("onDefeatedFoe names the ATTRITION killer via lastStruckBy", () => {
    const room = makeStuff(() => new TestRoom());
    const striker = makeFighter(room, {
      weaponForm: "bladed",
      weaponMaterial: steel(),
      label: "striker",
    }) as HookedFighter;
    const bystander = makeFighter(room, {
      weaponForm: "bladed",
      label: "bystander",
    }) as HookedFighter;
    const victim = makeFighter(room, { weaponForm: "bladed", label: "victim" }) as HookedFighter;
    const session = open(striker, victim, lethal, true);
    expect(
      CombatApi.join(bystander as never, victim as never, session.getTerms()).ok,
    ).toBe(true);
    const vState = session.getState(victim)!;
    vState.poise.erode(0.6, 0);
    // The striker lands (stamps lastStruckBy); the bystander defends.
    CombatApi.queueGambit(striker, "strike");
    CombatApi.queueGambit(bystander, "defend");
    CombatApi.queueGambit(victim, "defend");
    CombatApi.advance(session);
    expect(vState.lastStruckBy).toBe(striker);

    // The victim then dies of their wounds between beats (attrition).
    victim.setLifecycleState("dead");
    CombatApi.queueGambit(striker, "defend");
    CombatApi.queueGambit(bystander, "defend");
    CombatApi.queueGambit(victim, "defend");
    CombatApi.advance(session);

    expect(session.getResolution()).toBe("death");
    expect(striker.hookLog).toContain("defeated-foe:live-states");
    expect(bystander.hookLog).not.toContain("defeated-foe:live-states");
  });

  it("onCoupBegun fires on executioner and victim at the telegraph (lethal sentient path)", async () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, {
      weaponForm: "bladed",
      weaponMaterial: steel(),
      label: "executioner",
    }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed", label: "victim" }) as HookedFighter;
    b.getSpecies()!.setSentient(true);
    const session = open(a, b, lethal, true);
    session.getState(b)!.poise.erode(0.85, 0);

    strikeBeat(session, a, b);
    expect(session.getState(b)?.down ?? true).toBe(true);
    // beginCoup defers one tick (schedule(0)) past session teardown.
    await new Promise((r) => setTimeout(r, 30));
    expect(a.hookLog).toContain("coup-begun");
    expect(b.hookLog).toContain("coup-begun");
  });
});

describe("CombatLogic hooks — venue dispatch", () => {
  it("a hook-bearing room hears opened (once) / blood (once, at the crossing) / resolved", () => {
    const room = makeStuff(() => new ReactiveRoom());
    const a = makeFighter(room, {
      weaponForm: "bladed",
      weaponMaterial: steel(),
      label: "a",
    }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed", label: "b" }) as HookedFighter;
    const c = makeFighter(room, { weaponForm: "bladed", label: "c" }) as HookedFighter;
    const session = open(a, b, lethal, true);
    // A join must NOT re-fire the venue open.
    expect(
      CombatApi.join(c as never, b as never, session.getTerms()).ok,
    ).toBe(true);
    for (let i = 0; i < 60 && session.isActive(); i++) {
      CombatApi.advance(session);
    }
    expect(session.isActive()).toBe(false);
    const log = room.venueLog;
    expect(log.filter((e) => e.startsWith("opened:"))).toHaveLength(1);
    expect(log.filter((e) => e.startsWith("blood:"))).toHaveLength(1);
    expect(log.filter((e) => e.startsWith("resolved:"))).toHaveLength(1);
    // Open precedes blood precedes resolved.
    expect(log.findIndex((e) => e.startsWith("opened:"))).toBeLessThan(
      log.findIndex((e) => e.startsWith("blood:")),
    );
    expect(log.findIndex((e) => e.startsWith("blood:"))).toBeLessThan(
      log.findIndex((e) => e.startsWith("resolved:")),
    );
  });

  it("a hook-less room is skipped silently (the gym default)", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", weaponMaterial: steel() });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    for (let i = 0; i < 60 && session.isActive(); i++) {
      CombatApi.advance(session);
    }
    expect(session.isActive()).toBe(false); // no throw, fight resolves
  });
});

/* ───────────────── the influence bridge (Phase 5) ───────────────── */

describe("CombatLogic — CombatApi.influence (the external-instruction bridge)", () => {
  it("stagger erodes with the focus-fire multiplier — two attackers stagger harder than one", () => {
    // 1v1: two heavy staggers erode 0.6 → reeling.
    const room1 = makeStuff(() => new TestRoom());
    const a1 = makeFighter(room1, { weaponForm: "bladed" });
    const b1 = makeFighter(room1, { weaponForm: "bladed" });
    const s1 = open(a1, b1, nonLethal);
    expect(
      CombatApi.influence(b1, { kind: "stagger", intensity: "heavy" }).ok,
    ).toBe(true);
    CombatApi.influence(b1, { kind: "stagger", intensity: "heavy" });
    expect(s1.getState(b1)!.poise.band()).toBe("reeling");

    // 2v1 (two incoming edges): the SAME two staggers, focus-fire-scaled,
    // cross the floor and arm the window — strictly more erosion.
    const room2 = makeStuff(() => new TestRoom());
    const a2 = makeFighter(room2, { weaponForm: "bladed" });
    const b2 = makeFighter(room2, { weaponForm: "bladed" });
    const c2 = makeFighter(room2, { weaponForm: "bladed" });
    const s2 = open(a2, b2, nonLethal);
    expect(CombatApi.join(c2 as never, b2 as never, s2.getTerms()).ok).toBe(
      true,
    );
    CombatApi.influence(b2, { kind: "stagger", intensity: "heavy" });
    CombatApi.influence(b2, { kind: "stagger", intensity: "heavy" });
    expect(s2.getState(b2)!.poise.band()).toBe("open");
  });

  it("a heavy stagger crossing arms a normal ownerless opening; the next exploit downs — influence alone never does", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    const bState = session.getState(b)!;
    bState.poise.erode(0.6, 0); // 0.4 — reeling, above the floor

    CombatApi.influence(b, { kind: "stagger", intensity: "heavy" });
    // The crossing armed the normal opening via lower() — ownerless.
    expect(bState.poise.band()).toBe("open");
    expect(bState.openingArmedBy).toBeNull();
    expect(bState.down).toBe(false);
    // More influence while broken: still never sets down.
    expect(
      CombatApi.influence(b, { kind: "stagger", intensity: "heavy" }).ok,
    ).toBe(true);
    expect(bState.down).toBe(false);

    // Only an exchange exploiting the contest downs.
    strikeBeat(session, a, b);
    expect(bState.down).toBe(true);
  });

  it("expose: the next exchange exploits, consumeOpening fires, openingArmedBy stays null (no command deed)", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", label: "a" });
    const b = makeFighter(room, {
      weaponForm: "bladed",
      label: "b",
    }) as HookedFighter;
    const session = open(a, b, nonLethal);
    const bState = session.getState(b)!;

    expect(CombatApi.influence(b, { kind: "expose" }).ok).toBe(true);
    // Armed without moving the gauge — open, not broken, ownerless.
    expect(bState.poise.band()).toBe("open");
    expect(bState.poise.isBroken()).toBe(false);
    expect(bState.openingArmedBy).toBeNull();

    strikeBeat(session, a, b);
    // The very next eligible exchange cashed the window.
    expect(b.hookLog).toContain("exchange:exploit:target");
    expect(bState.poise.isOpen()).toBe(false); // consumed, single-spend
    expect(bState.openingArmedBy).toBeNull(); // still no armer → no deed
    expect(bState.down).toBe(true); // the exploit downs, as ever
  });

  it("steady restores endurance-capped — a gassed fighter buys nothing back", () => {
    // Gassed: zero endurance → the restore ceiling is 0.
    const room1 = makeStuff(() => new TestRoom());
    const a1 = makeFighter(room1, { weaponForm: "bladed" });
    const b1 = makeFighter(room1, { weaponForm: "bladed" });
    const s1 = open(a1, b1, nonLethal);
    (b1 as unknown as { adjustReserve(k: string, d: unknown): void })
      .adjustReserve("endurance", Quantity.of(-100, "%"));
    s1.getState(b1)!.poise.erode(0.6, 0); // reeling
    expect(CombatApi.influence(b1, { kind: "steady" }).ok).toBe(true);
    expect(s1.getState(b1)!.poise.band()).toBe("reeling"); // nothing back

    // Fresh: the same instruction climbs a band.
    const room2 = makeStuff(() => new TestRoom());
    const a2 = makeFighter(room2, { weaponForm: "bladed" });
    const b2 = makeFighter(room2, { weaponForm: "bladed" });
    const s2 = open(a2, b2, nonLethal);
    s2.getState(b2)!.poise.erode(0.6, 0);
    expect(CombatApi.influence(b2, { kind: "steady" }).ok).toBe(true);
    expect(s2.getState(b2)!.poise.band()).toBe("pressed");
  });

  it("steady is suppressed under the focus-fire pin, exactly like the defend beat", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed" });
    const victim = makeFighter(room, { weaponForm: "bladed" });
    const c = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, victim, nonLethal);
    expect(
      CombatApi.join(c as never, victim as never, session.getTerms()).ok,
    ).toBe(true);
    const vState = session.getState(victim)!;
    vState.poise.erode(0.6, 0);

    const res = CombatApi.influence(victim, { kind: "steady" });
    expect(res).toEqual({ ok: false, reason: "suppressed" });
    expect(vState.poise.band()).toBe("reeling"); // nothing restored
  });

  it("refuses out-of-combat and downed targets with the named reasons", () => {
    const room = makeStuff(() => new TestRoom());
    const loner = makeFighter(room, { weaponForm: "bladed" });
    expect(CombatApi.influence(loner, { kind: "expose" })).toEqual({
      ok: false,
      reason: "not-in-combat",
    });

    const a = makeFighter(room, { weaponForm: "bladed" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(a, b, nonLethal);
    session.getState(b)!.down = true;
    expect(CombatApi.influence(b, { kind: "steady" })).toEqual({
      ok: false,
      reason: "downed",
    });
  });

  it("a band change from a between-beat influence surfaces through onPoiseBandChanged on the following beat", () => {
    const room = makeStuff(() => new TestRoom());
    const a = makeFighter(room, { weaponForm: "bladed", label: "a" });
    const b = makeFighter(room, {
      weaponForm: "bladed",
      label: "b",
    }) as HookedFighter;
    const session = open(a, b, nonLethal);
    // Gas b so its defend beat can't restore the staggered poise away.
    (b as unknown as { adjustReserve(k: string, d: unknown): void })
      .adjustReserve("endurance", Quantity.of(-100, "%"));

    // A quiet first beat — no band events, the baseline stamped.
    CombatApi.queueGambit(a, "defend");
    CombatApi.queueGambit(b, "defend");
    CombatApi.advance(session);
    expect(b.hookLog.filter((e) => e.startsWith("band:"))).toHaveLength(0);

    // The between-beat external stagger: steady → pressed.
    CombatApi.influence(b, { kind: "stagger", intensity: "heavy" });
    expect(session.getState(b)!.poise.band()).toBe("pressed");

    // The following (otherwise quiet) beat witnesses it — no new hook.
    CombatApi.queueGambit(a, "defend");
    CombatApi.queueGambit(b, "defend");
    CombatApi.advance(session);
    expect(b.hookLog).toContain("band:pressed");
  });

  it("concussive maul: a hook-queued influence drains through influenceImpl — same result as the external call", () => {
    const runCell = (mode: "maul" | "external" | "plain"): string => {
      const room = makeStuff(() => new TestRoom());
      const blade = reactiveBlade("bladed", steel());
      if (mode === "maul") {
        blade.onAugment = (spec, ctx) => {
          ctx.influence({ kind: "stagger", intensity: "heavy" });
          return spec;
        };
      }
      const a = makeFighter(room, { weapon: blade });
      const b = makeFighter(room, { weaponForm: "bladed" });
      const session = open(a, b, nonLethal);
      const bState = session.getState(b)!;
      bState.poise.erode(0.6, 0); // reeling → the strike lands
      strikeBeat(session, a, b);
      if (mode === "external") {
        expect(
          CombatApi.influence(b, { kind: "stagger", intensity: "heavy" }).ok,
        ).toBe(true);
      }
      expect(bState.down).toBe(false); // influence never downs
      return bState.poise.band();
    };

    const maul = runCell("maul");
    const external = runCell("external");
    const plain = runCell("plain");
    // One economy: the hook-side drain and the external bridge land the
    // identical banded result — and both differ from the uninfluenced hit.
    expect(maul).toBe(external);
    expect(maul).not.toBe(plain);
  });
});

/* ───────────────────────── NPC ≈ PC parity ───────────────────────── */

describe("CombatLogic hooks — NPC ≈ PC parity", () => {
  it("the same fixture fight fires identical hook logs brain-driven vs player-driven", () => {
    // Neutralize brain resolution so both runs take the identical
    // autocombat path (the parity claim is about the DISPATCH, which has
    // no player/NPC branch — not about a brain's choices).
    vi.spyOn(StuffApi, "resolveExportSync").mockReturnValue(null);

    const runOnce = (playerDriven: boolean): string[][] => {
      const room = makeStuff(() => new TestRoom());
      const a = makeFighter(room, {
        weaponForm: "bladed",
        weaponMaterial: steel(),
        label: "a",
      }) as HookedFighter;
      const b = makeFighter(room, {
        weaponForm: "bladed",
        weaponMaterial: steel(),
        label: "b",
      }) as HookedFighter;
      const session = open(a, b, nonLethal);
      if (playerDriven) {
        for (const s of [a, b]) {
          const st = session.getState(s)!;
          (st as unknown as { brainPath: string | null }).brainPath = null;
        }
      }
      for (let i = 0; i < 60 && session.isActive(); i++) {
        CombatApi.advance(session);
      }
      return [[...a.hookLog], [...b.hookLog]];
    };

    const npcLogs = runOnce(false);
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    const pcLogs = runOnce(true);
    expect(pcLogs).toEqual(npcLogs);
  });
});

/* ─────────── non-mechanical innates — the delivery split (Phase 6) ─────────── */

describe("CombatLogic — non-mechanical innates (DECISION K)", () => {
  it("the electric eel: exactly ONE shockContact, no mechanical primary, a landed shock-derived report", () => {
    const room = makeStuff(() => new TestRoom());
    const eel = makeFighter(room, {
      ctor: ElectricEel as unknown as new () => Character,
      natural: "shock",
      label: "eel",
    }) as unknown as ElectricEel;
    eel.setVoltage(Quantity.of(5000, "V"));
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(eel as unknown as Character, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    const shockSpy = vi.spyOn(
      eel as unknown as { shockContact(v: unknown): unknown },
      "shockContact",
    );
    const narrateSpy = vi.spyOn(CombatNarration, "narrate");
    strikeBeat(session, eel as unknown as Character, b);

    // The single-fire proof: the drain is the ONE deliverer — the split
    // never also calls shockContact directly (the forbidden double-fire).
    expect(shockSpy).toHaveBeenCalledTimes(1);
    expect(shockSpy.mock.calls[0]![0]).toBe(b);
    // No mechanical primary: every inflict that fired is the shock
    // door's own (inside shockContactImpl), never an energy spec.
    const mechanisms = inflictSpy.mock.calls.map(
      (c) => (c[1] as InflictSpec).mechanism,
    );
    expect(mechanisms).toEqual(["shock"]);
    // The target carries the contact burn.
    expect(
      b.getConditions().some(
        (c) => c.kind === "trauma" && c.mechanism === "shock",
      ),
    ).toBe(true);
    // The report read LANDED with the shock-derived band: the same
    // severity→band the engine derives from the drained current.
    const delivered = shockSpy.mock.results[0]!.value as ConductionOutcome[];
    expect(delivered).toHaveLength(1);
    const expectedBand = MaterialApi.severityToBand(
      MaterialApi.resolveShock(delivered[0]!.currentThrough)?.severity ?? null,
    );
    const landCall = narrateSpy.mock.calls.find((c) => c[0].outcome === "land");
    expect(landCall).toBeDefined();
    expect(landCall![0].channel).toBe("shock");
    expect(landCall![0].band).toBe(expectedBand);
    // First-blood and lastStruckBy behave like any landed blow.
    expect(session.hasDrawnBlood()).toBe(true);
    expect(session.getState(b)!.lastStruckBy).toBe(eel);
  });

  it("a heat innate builds {mechanism:'heat'} and wounds through the insulation fold", () => {
    const room = makeStuff(() => new TestRoom());
    const salamander = makeFighter(room, { natural: "heat", label: "sal" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(salamander, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    strikeBeat(session, salamander, b);

    expect(inflictSpy).toHaveBeenCalledTimes(1);
    const primary = inflictSpy.mock.calls[0]![1] as EnergyInflictSpec;
    expect(primary.mechanism).toBe("heat");
    // Bare tissue under the insulation fold → the burn lands.
    expect(
      b.getConditions().some((c) => c.kind === "trauma" && c.type === "burn"),
    ).toBe(true);
  });

  it("a shock innate on an Energized-less creature truthfully deflects (the documented authoring error)", () => {
    const room = makeStuff(() => new TestRoom());
    const sparkless = makeFighter(room, {
      natural: "shock",
      label: "sparkless",
    }) as HookedFighter;
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(sparkless, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    const narrateSpy = vi.spyOn(CombatNarration, "narrate");
    strikeBeat(session, sparkless, b);

    // Nothing delivered: no carrier → no shock, no primary, no blood.
    // (Delivery is the source's own shockContact since the OO sweep; a
    // sparkless fighter has no source, so absence shows as no shock
    // inflict at all.)
    expect(
      inflictSpy.mock.calls.some(
        (c) => (c[1] as { mechanism?: string }).mechanism === "shock",
      ),
    ).toBe(false);
    expect(inflictSpy).not.toHaveBeenCalled();
    expect(session.hasDrawnBlood()).toBe(false);
    expect(session.getState(b)!.lastStruckBy ?? null).toBeNull();
    // Narrated as a deflected blow, never a landed one.
    expect(
      narrateSpy.mock.calls.some((c) => c[0].outcome === "deflected"),
    ).toBe(true);
    expect(
      narrateSpy.mock.calls.some((c) => c[0].outcome === "land"),
    ).toBe(false);
  });

  it("a mechanical innate still rides the energy fold (the wolf shape, unmoved)", () => {
    const room = makeStuff(() => new TestRoom());
    const wolf = makeFighter(room, { natural: "point", label: "wolf" });
    const b = makeFighter(room, { weaponForm: "bladed" });
    const session = open(wolf, b, nonLethal);
    session.getState(b)!.poise.erode(0.6, 0);

    const inflictSpy = vi.spyOn(ConditionApi, "inflict");
    strikeBeat(session, wolf, b);

    expect(
      inflictSpy.mock.calls.some(
        (c) => (c[1] as { mechanism?: string }).mechanism === "shock",
      ),
    ).toBe(false);
    expect(inflictSpy).toHaveBeenCalledTimes(1);
    const primary = inflictSpy.mock.calls[0]![1] as EnergyInflictSpec;
    expect(primary.mechanism).toBe("point");
  });
});
