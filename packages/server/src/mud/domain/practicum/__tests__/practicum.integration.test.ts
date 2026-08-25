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
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from "yaml";
import CartesianZone from "../../../obj/location/CartesianZone";
import CartesianLocation from "../../../lib/location/CartesianLocation";
import Material from "../../../lib/material/Material";
import Firewood from "../../../obj/Firewood";
import Floor from "../../../obj/Floor";
import BodyPlan from "../../../obj/species/BodyPlan";
import Species from "../../../obj/species/Species";
import { Character } from "../../../lib/character/Character";
import { HasInteractiveMixin } from "../../../lib/connection/HasInteractive";
import GlowlightOrb from "../../../obj/magic/GlowlightOrb";
import SpellCatalogue from "../../../obj/SpellCatalogue";
import Spell from "../../../obj/magic/Spell";
import { Template } from "../../../lib/stuff/Template";
import { MagicApi } from "../../../api/magic";
import { AdvancementApi } from "../../../api/advancement";
import { FireApi } from "../../../api/fire";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry";
import { Quantity } from "../../../lib/quantity";
import { Reserve } from "../../../lib/reserve";
import type Interactive from "../../../obj/Interactive";
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from "../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";

class MagicTester extends HasInteractiveMixin(Character) {
  static _mixinName = "MagicTesterPracticum";
}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(dirname(__filename), "../../../../../../content/arcane-library/content/obj/magic/Spell");

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
    .spyOn(Template, "findDescendants")
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (!prefix.startsWith(Spell.TEMPLATE_PATH_PREFIX)) return [];
      return seeds.map((seed) => ({
        path: `${Spell.TEMPLATE_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogueSingleton, "/obj/SpellCatalogue");
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
  }, `/obj/material/_test/practicum-oak-${seq}`) as unknown as Material;
}

function saltWater(): Material {
  seq += 1;
  const m = makeStuff(() => new Material());
  m.setName("salt-water");
  m.setElectricalConductivity(Quantity.of(5, "S/m"));
  stampTemplatePathForTest(m, `/obj/material/test/practicum-salt-${seq}`);
  return m;
}

function dummyIn(room: CartesianLocation): Firewood {
  const d = makeStuff(() => {
    const f = new Firewood();
    f.setMass(Quantity.of(1, "kg"));
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
      tissues: [{ tissuePath: "/obj/material/tissue/flesh", mass: 0.5 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/obj/species/BodyPlan/practicum-${id}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  species.setFacultyProfile({ depth: "mid", serenity: "mid", composure: "mid" });
  species.setInnateMixins(["CasterMixin"]);
  stampTemplatePathForTest(species, `/obj/species/test/practicum-${id}`);
  const c = makeStuff(() => new MagicTester());
  c.setSpecies(species);
  stampTemplatePathForTest(c, `/obj/test/practicum-caster-${id}`);
  c.installArcaneReserve();
  c.addInteractive({} as unknown as Interactive);
  ContainmentApi.move(c as never, room as never);
  return c;
}

describe("The Practicum — the magic demonstrators", () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    await installCatalogue();
    vi.spyOn(AdvancementApi, "bandFor").mockResolvedValue("competent");
    vi.spyOn(AdvancementApi, "recordSignature").mockResolvedValue(undefined);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
  });

  it("the casting yard: firebolt ignites the dummy and real combustion takes over", async () => {
    const zone = makeStuff(() => new CartesianZone());
    const yard = makeStuff(() => new CartesianLocation());
    zone.addLocation(yard, 0, 0, 0);
    const dummy = dummyIn(yard);
    const caster = casterIn(yard);

    expect(FireApi.isBurning(dummy)).toBe(false);
    const out = await MagicApi.resolveCast(caster, "firebolt", dummy);
    expect(out.ok).toBe(true);
    // 900 kJ into 1 kg of oak: ΔT = Q/C = 450 K → past the 570 K
    // autoignition point → REAL fire (spread/char are fire's job now).
    expect(FireApi.isBurning(dummy)).toBe(true);
  });

  it("the conductive gallery: spark through the brine shocks the wading caster", async () => {
    const zone = makeStuff(() => new CartesianZone());
    const gallery = makeStuff(() => new CartesianLocation());
    zone.addLocation(gallery, 1, 0, 0);
    brineFloor(gallery, 30);
    const caster = casterIn(gallery); // wading — MIND WHERE YOU STAND

    const out = await MagicApi.resolveCast(caster, "spark", gallery as never);
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
    FireApi.ignite(brazier);
    expect(FireApi.isBurning(brazier)).toBe(true);

    const caster = casterIn(yard);
    vi.spyOn(StuffApi, "clone").mockImplementation(async () =>
      makeStuff(() => new GlowlightOrb()),
    );
    await MagicApi.resolveCast(caster, "glowlight");
    const sustained = caster
      .getConditions()
      .find((c) => c.kind === "sustained") as { boundStuffId?: string };
    const orb = StuffApi.findById(sustained.boundStuffId!)! as GlowlightOrb;
    expect(orb.getEmittedFlux().rawValue()).toBe(500);

    // casting inside the ward is refused, legibly
    ContainmentApi.move(caster as never, cell as never);
    const refused = await MagicApi.prepareCast(caster, "glowlight");
    expect(refused.ok).toBe(false);
    expect(refused.refusal).toMatch(/suppresses/);

    // the carried working winks out on the next read…
    real += 1000;
    caster.getVitalSign("heartRate");
    expect(orb.getEmittedFlux().rawValue()).toBe(0);
    // …while the impulse-real fire keeps burning — nothing to un-happen
    expect(FireApi.isBurning(brazier)).toBe(true);

    // step out — the working re-lights
    ContainmentApi.move(caster as never, yard as never);
    real += 1000;
    caster.getVitalSign("heartRate");
    expect(orb.getEmittedFlux().rawValue()).toBe(500);
  });
});
