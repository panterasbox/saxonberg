/**
 * The Practicum demonstrators, end-to-end (the hearthworks pattern —
 * scenes built directly, the faked-Mongo test has no clone pipeline):
 *
 *  - the casting yard — firebolt deposits real joules into the straw
 *    dummy and REAL combustion takes over (no magic-side damage path);
 *  - the conductive gallery — spark imposes a real potential over the
 *    brine pool and the conduction walk finds the WADING CASTER too
 *    (caster-obeys-own-physics, no special case);
 *  - the warded cell — casting is refused inside, a carried glowlight
 *    goes dormant (and re-lights outside), and the mundane fire keeps
 *    burning: suppression drops what magic holds up, never an impulse.
 */

import "../../../../test-bootstrap";
import type { CompetenceBandName } from "../../../lib/advancement/CompetenceBand";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import CartesianZone from "../../../platform/idea/location/CartesianZone";
import CartesianLocation from "../../../lib/location/CartesianLocation";
import Material from "../../../lib/material/Material";
import Firewood from "../../../platform/thing/Firewood";
import Floor from "../../../platform/thing/Floor";
import BodyPlan from "../../../platform/idea/species/BodyPlan";
import Species from "../../../platform/idea/species/Species";
import { Character } from "../../../lib/character/Character";
import { HasInteractiveMixin } from "../../../lib/connection/HasInteractive";
import { LightSourceMixin } from "../../../lib/perception/LightSource";
import { EnergizedMixin } from "../../../lib/electricity/Energized";
import Thing from "../../../lib/stuff/Thing";
import SpellCatalogue from "../../../platform/idea/SpellCatalogue";
import Spell from "../../../platform/idea/magic/Spell";
import { Template } from "../../../lib/stuff/Template";
import { MagicApi } from "../../../api/magic";
import { FireApi } from "../../../api/fire";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { Quantity } from "../../../lib/quantity";
import { Reserve } from "../../../lib/reserve";
import type Interactive from "../../../platform/idea/Interactive";
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
/** A light source standing in for the arcane library's GlowlightMote — the executor clones whatever the row's `locus` names. */
class GlowlightOrb extends LightSourceMixin(Thing) {}
/** An energized locus standing in for the arcane library's SparkLocus, the same way. */
class SparkLocus extends EnergizedMixin(Thing) {}
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';

class MagicTester extends HasInteractiveMixin(Character) {
  // The band gate reads the caster's own competenceBandFor since the
  // OO sweep; the practicum pins every tester at competent.
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return "competent";
  }

  static _mixinName = "MagicTesterPracticum";
}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(dirname(__filename), "../../../../../../content/arcane-library/content/stuff/idea/magic/Spell");

let seq = 0;
let real = 0;
let catalogueSingleton: SpellCatalogue | null = null;

async function installCatalogue(): Promise<void> {
  const seeds = readdirSync(SPELL_SEEDS_DIR)
    .filter((f) => f.endsWith(".yaml"))
    .map(
      (f) =>
        (
          YAML.parse(readFileSync(join(SPELL_SEEDS_DIR, f), "utf-8")) as {
            data: Record<string, unknown>;
          }
        ).data,
    );
  const spy = vi
    .spyOn(Template, "findByClass")
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (prefix !== SPELL_CLASS) return [];
      return seeds.map((seed) => ({
        path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogueSingleton, "/platform/idea/SpellCatalogue");
  }
  catalogueSingleton.invalidateCache();
  await catalogueSingleton.postRegister();
  spy.mockRestore();
}

function oak(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName("oak");
    m.setDensity(Quantity.of(750, "kg/m³"));
    m.setSpecificHeat(Quantity.of(2000, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(0.17, "W/(m·K)"));
    m.setAutoignitionTemperature(Quantity.of(570, "K"));
    m.setHeatOfCombustion(Quantity.of(16, "MJ/kg"));
    return m;
  }, `/stuff/idea/material/_test/practicum-oak-${seq}`) as unknown as Material;
}

function saltWater(): Material {
  seq += 1;
  const m = makeStuff(() => new Material());
  m.setName("salt-water");
  m.setElectricalConductivity(Quantity.of(5, "S/m"));
  stampTemplatePathForTest(m, `/stuff/idea/material/test/practicum-salt-${seq}`);
  return m;
}

/**
 * ⚠ The dummy's mass matters and is the point: 1.5 kg of oak is
 * C = 3000 J/K, so 293 → 570 K (autoignition) needs ≈ **831 kJ**. An
 * honest firebolt carries 25.5 kJ. It chars; it does not catch.
 */
function dummyIn(room: CartesianLocation): Firewood {
  const d = makeStuff(() => {
    const f = new Firewood();
    f.setMass(Quantity.of(1.5, "kg"));
    f.setMaterial(oak());
    f.setReserve(
      new Reserve("fuel", Quantity.of(100, "%"), Quantity.of(100, "%"), "combustion", null),
    );
    return f;
  });
  ContainmentApi.move(d, room);
  d.setStampedTemperatureK(295);
  d.setLastAmbientK(295);
  return d;
}

function brineFloor(room: CartesianLocation, litres: number): Floor {
  const floor = makeStuff(() => {
    const f = new Floor();
    f.surfaceBulk = true;
    return f;
  });
  (room as unknown as { addFixture(f: unknown): boolean }).addFixture(floor);
  floor.setBulkMaterial("surface", saltWater());
  floor.setBulkAmount("surface", Quantity.of(litres, "L"));
  return floor;
}

function casterIn(room: CartesianLocation): MagicTester {
  const id = seq++;
  const plan = makeStuff(() => new BodyPlan());
  plan.setName("practicum-biped");
  plan.setSlots([]);
  plan.setBodyParts([
    { key: "body.torso", parent: null, tissues: [] },
    { key: "body.leg.left", parent: "body.torso", tissues: [] },
    {
      key: "body.leg.left.foot",
      parent: "body.leg.left",
      tissues: [{ tissuePath: "/stuff/idea/material/tissue/flesh", mass: 0.5 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/practicum-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  species.setFacultyProfile({ depth: "mid", serenity: "mid", composure: "mid" });
  species.setInnateMixins(["CasterMixin"]);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/practicum-${id}`);
  const c = makeStuff(() => new MagicTester());
  c.setSpecies(species);
  stampTemplatePathForTest(c, `/obj/test/practicum-caster-${id}`);
  c.installArcaneReserve();
  c.addInteractive({} as unknown as Interactive);
  ContainmentApi.move(c as never, room as never);
  return c;
}

/**
 * ⭐ The tinder bundle — 40 g, so ≈ 22 kJ from ambient to oak's 570 K
 * autoignition. An honest firebolt has that; the dummy needs thirty times
 * as much. The two objects are the demonstration.
 */
function tinderIn(room: CartesianLocation): Firewood {
  const t = makeStuff(() => {
    const f = new Firewood();
    f.setMass(Quantity.of(0.04, "kg"));
    f.setMaterial(oak());
    f.setReserve(
      new Reserve("fuel", Quantity.of(100, "%"), Quantity.of(100, "%"), "combustion", null),
    );
    return f;
  });
  ContainmentApi.move(t, room);
  t.setStampedTemperatureK(295);
  t.setLastAmbientK(295);
  return t;
}

describe("The Practicum — the magic demonstrators", () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    await installCatalogue();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it("⭐⭐ the casting yard: firebolt CHARS the dummy and does not light it", async () => {
    // ⚠⚠ **This assertion was inverted, and the inversion is the fix.**
    //
    // It used to read *"firebolt ignites the dummy"*, justified in a
    // comment as *"900 kJ into 1 kg of oak"* — and 900 kJ was the
    // violation: the row committed 20 τ (20 kJ) and delivered 900 kJ,
    // η ≈ 45. The content had been tuned to the broken number, and this
    // test was what held it in place.
    //
    // An honest firebolt is 25.5 kJ uncursed. Into 1.5 kg of oak
    // (C = 3000 J/K) that is ΔT ≈ 8.5 K — a scorch. Which is correct
    // under BOTH the physics and the shipped ignition model, and a
    // better demonstrator: *hit the target* and *set it alight* are
    // different acts, and the yard now shows both.
    const zone = makeStuff(() => new CartesianZone());
    const yard = makeStuff(() => new CartesianLocation());
    zone.addLocation(yard, 0, 0, 0);
    const dummy = dummyIn(yard);
    const caster = casterIn(yard);

    expect(dummy.isBurning()).toBe(false);
    const out = await caster.resolveCast("firebolt", dummy);
    expect(out.ok).toBe(true);
    expect(dummy.isBurning()).toBe(false);
    // …and it DID land — real joules went in, which is what makes this a
    // scorch rather than a miss.
    expect(dummy.getTemperature().rawValue()).toBeGreaterThan(295);
  });

  it("⭐⭐ …and LIGHTS the tinder bundle beside it", async () => {
    // Forty grams: C = 80 J/K, so 293 → 570 K needs ≈ 22 kJ, which an
    // uncursed bolt (25.5 kJ) has. This is the pair that makes the yard
    // teach something true.
    const zone = makeStuff(() => new CartesianZone());
    const yard = makeStuff(() => new CartesianLocation());
    zone.addLocation(yard, 0, 0, 0);
    const tinder = tinderIn(yard);
    const caster = casterIn(yard);

    expect(tinder.isBurning()).toBe(false);
    const out = await caster.resolveCast("firebolt", tinder);
    expect(out.ok).toBe(true);
    expect(tinder.isBurning()).toBe(true);
  });

  it("the conductive gallery: spark through the brine shocks the wading caster", async () => {
    const zone = makeStuff(() => new CartesianZone());
    const gallery = makeStuff(() => new CartesianLocation());
    zone.addLocation(gallery, 1, 0, 0);
    brineFloor(gallery, 30);
    const caster = casterIn(gallery); // wading — MIND WHERE YOU STAND

    vi.spyOn(StuffApi, "clone").mockImplementation(async () =>
      makeStuff(() => new SparkLocus()),
    );
    const out = await caster.resolveCast("spark", gallery as never);
    expect(out.ok).toBe(true);
    expect(out.reports.join(" ")).toMatch(/current snaps/i);
    // The walk found the caster's own body in the pool — a shock or its
    // contact burn rides their conditions. No special case made this
    // happen; the graph is simply honest.
    expect(
      caster.hasCondition((c) => c.kind === "shock" || c.kind === "trauma"),
    ).toBe(true);
  });

  it("the warded cell: casting refused, glowlight dormant, the mundane fire burns on", async () => {
    const zone = makeStuff(() => new CartesianZone());
    const yard = makeStuff(() => new CartesianLocation());
    const cell = makeStuff(() => new CartesianLocation());
    zone.addLocation(yard, 0, 0, 0);
    zone.addLocation(cell, 2, 0, 0);
    cell.setSuppressesMagic({ all: true });

    // the brazier: a mundane fire lit the mundane way
    const brazier = dummyIn(cell);
    brazier.ignite();
    expect(brazier.isBurning()).toBe(true);

    const caster = casterIn(yard);
    vi.spyOn(StuffApi, "clone").mockImplementation(async () =>
      makeStuff(() => new GlowlightOrb()),
    );
    await caster.resolveCast("glowlight");
    const sustained = caster
      .getConditions()
      .find((c) => c.kind === "sustained") as { boundStuffId?: string };
    const orb = StuffApi.findById(sustained.boundStuffId!)! as GlowlightOrb;
    expect(orb.getEmittedFlux().rawValue()).toBe(500);

    // casting inside the ward is refused, legibly
    ContainmentApi.move(caster as never, cell as never);
    const refused = await caster.prepareCast("glowlight");
    expect(refused.ok).toBe(false);
    expect(refused.refusal).toMatch(/suppresses/);

    // the carried working winks out on the next read…
    real += 1000;
    caster.getVitalSign("heartRate");
    expect(orb.getEmittedFlux().rawValue()).toBe(0);
    // …while the impulse-real fire keeps burning — nothing to un-happen
    expect(brazier.isBurning()).toBe(true);

    // step out — the working re-lights
    ContainmentApi.move(caster as never, yard as never);
    real += 1000;
    caster.getVitalSign("heartRate");
    expect(orb.getEmittedFlux().rawValue()).toBe(500);
  });
});
