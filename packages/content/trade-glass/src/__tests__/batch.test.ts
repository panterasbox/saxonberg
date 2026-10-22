/**
 * ⭐⭐ The glass batch is MIXED, then FIRED — and neither is a recipe
 * (ceramics W0: R1 mixing is one rule, M1 firing is one rule).
 *
 * The three retired rows (`glass-batch`, `glass-batch-amber`,
 * `remelt-cullet`) are replaced by: a batch pot (a kernel `MixingVessel`
 * row) that folds what is put in it by mass — so the batch's iron IS its
 * sand's iron, and charcoal in the pot is amber — and a batch MATERIAL
 * whose heat transition melts it to glass, keeping 72 % of its mass and
 * everything dissolved in it. Remelting a bottle is phase change, pinned in
 * the server's `Thermal.pool-composition` test.
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { parse } from "yaml";
import Material from "@saxonberg/server/mud/platform/idea/material/Material";
import MixingVessel from "@saxonberg/server/mud/platform/thing/MixingVessel";
import Oven from "@saxonberg/server/mud/platform/thing/Oven";
import Good from "@saxonberg/server/mud/lib/stuff/Good";
import Place from "@saxonberg/server/mud/lib/stuff/Place";
import { HeatTransition } from "@saxonberg/server/mud/lib/material/HeatTransition";
import type { HeatTransitionSpec } from "@saxonberg/server/mud/lib/material/HeatTransition";
import type { Burner } from "@saxonberg/server/mud/lib/fire/Burner";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { chargeHot } from "@saxonberg/server/mud/lib/fire/__tests__/burner-fuel";
import { Quantity } from "@saxonberg/server/mud/lib/quantity";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { WorldClockApi } from "@saxonberg/server/mud/api/worldclock";
import "@saxonberg/server/mud/platform/idea/WorldClockRegistry";
import {
  makeStuff,
  makeStuffAtPath,
} from "@saxonberg/server/mud/lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers";
import Melt from "../thing/Melt";
import Sand from "../thing/Sand";

const here = dirname(fileURLToPath(import.meta.url));
const thingDir = join(here, "..", "..", "content", "trade", "glass", "thing");
const materialDir = join(here, "..", "..", "content", "trade", "glass", "idea", "material");
function row(dir: string, file: string): { class: string; data: Record<string, unknown> } {
  return parse(readFileSync(join(dir, file), "utf8"));
}

const IRON = "/stuff/idea/material/element/iron";
const CARBON = "/stuff/idea/material/element/carbon";

let seq = 0;
function mat(name: string, setup: (m: Material) => void = () => undefined): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setSpecificHeat(Quantity.of(840, "J/(kg·K)"));
    m.setThermalConductivity(Quantity.of(1, "W/(m·K)"));
    m.setDensity(Quantity.of(2000, "kg/m³"));
    setup(m);
    return m;
  }, `/stuff/idea/material/_test/batch-${name}-${seq}`) as unknown as Material;
}

class Lump extends Good {}

function piece<T extends Good>(make: () => T, m: Material, kg: number): T {
  const p = makeStuff(make);
  p.setMass(Quantity.of(kg, "kg"));
  p.setMaterial(m);
  return p;
}

describe("the shipped rows", () => {
  it("the batch material melts to glass by its own transition, keeping 72 %", () => {
    const r = row(materialDir, "batch.yaml");
    const specs = r.data["heatTransitions"] as HeatTransitionSpec[];
    expect(specs).toHaveLength(1);
    const t = new HeatTransition(specs[0]!);
    expect(t.getMassRetained()).toBeCloseTo(0.72, 6);
    expect(t.getReferenceK()).toBe(1400);
    expect(t.getDiscipline()).toBe("glasswork");
    expect(t.getLadder().at(-1)?.becomes).toBe("/stuff/idea/material/glass/glass");
    // ⚠ A batch does not melt as a batch — it becomes glass, and glass melts.
    expect(r.data["meltingPoint"]).toBeUndefined();
  });

  it("the batch pot is a mixing vessel naming the batch rows; no recipe survives", () => {
    const pot = row(thingDir, "batch-pot.yaml");
    expect(pot.class).toBe("/platform/thing/MixingVessel");
    expect(pot.data["blendMaterial"]).toBe("/trade/glass/idea/material/batch");
    expect(pot.data["blendTemplate"]).toBe("/trade/glass/thing/batch");
    const batch = row(thingDir, "batch.yaml");
    expect(batch.class).toBe("/trade/glass/thing/Melt");
    expect(batch.data["alloying"]).toBeUndefined(); // computed, never authored
  });
});

describe("mix, then fire", () => {
  const SCALE = 12;
  let real = 0;
  let glass: Material;
  let batchM: Material;
  let sandM: Material;
  let ashM: Material;
  let limeM: Material;
  let charcoalM: Material;

  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => real);
    glass = mat("glass", (m) => {
      m.setTags(["glass"]);
      m.setMeltingPoint(Quantity.of(1300, "K"));
    });
    batchM = mat("glass batch", (m) =>
      m.setHeatTransitions([
        {
          key: "melt",
          referenceK: 1400,
          zK: 60,
          fullDoseS: 3600,
          massRetained: 0.72,
          discipline: "glasswork",
          ladder: [{ atDegree: 1, becomes: glass.getTemplatePath()! }],
        },
      ]),
    );
    sandM = mat("sand");
    ashM = mat("ash");
    limeM = mat("quicklime");
    charcoalM = mat("charcoal", (m) => m.setComposition([{ materialPath: CARBON, fraction: 0.9 }]));
    vi.spyOn(StuffApi, "clone").mockImplementation((async () => makeStuff(() => new Melt())) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function pot(): MixingVessel {
    const v = makeStuff(() => new MixingVessel());
    (v as unknown as { blendMaterial: string }).blendMaterial = batchM.getTemplatePath()!;
    (v as unknown as { blendTemplate: string }).blendTemplate = "/trade/glass/thing/batch";
    return v;
  }

  function sandOf(ironFraction: number, kg = 4): Sand {
    const s = piece(() => new Sand(), sandM, kg);
    s.setAlloying([{ materialPath: IRON, fraction: ironFraction }]);
    return s;
  }

  async function charge(v: MixingVessel, extras: Stuff[] = []): Promise<Melt> {
    for (const p of [sandOf(0.004), sandOf(0.004), piece(() => new Lump(), ashM, 4), piece(() => new Lump(), limeM, 4), ...extras]) {
      ContainmentApi.move(p as never, v as never);
    }
    const out = await v.blend(null);
    expect(out.ok).toBe(true);
    const product = (out as { product: Stuff | null }).product as Melt;
    expect(product).toBeInstanceOf(Melt);
    return product;
  }

  it("⭐ the pot's batch carries its SAND's iron, by mass — nothing authored it", async () => {
    const batch = await charge(pot());
    expect(batch.getMaterial()?.getTemplatePath()).toBe(batchM.getTemplatePath());
    expect(batch.getMass().rawValue()).toBeCloseTo(16, 6);
    // 8 kg of sand at 0.4 % iron in 16 kg of batch → 0.2 %.
    expect(batch.fractionOf(IRON)).toBeCloseTo(0.002, 6);
  });

  it("charcoal in the pot is the amber batch — carbon by mass", async () => {
    const batch = await charge(pot(), [piece(() => new Lump(), charcoalM, 1)]);
    expect(batch.fractionOf(CARBON)).toBeCloseTo((0.9 * 1) / 17, 6);
    expect(batch.fractionOf(CARBON) * 100).toBeGreaterThan(0.1); // Tinted's amber edge
  });

  it("fired above the liquidus, the same piece becomes glass — 72 % of it, iron and all", async () => {
    const batch = await charge(pot());
    const room = makeStuff(() => new Place());
    const kiln = makeStuff(() => new Oven());
    chargeHot(kiln as unknown as Stuff & Burner, 400);
    kiln.setBurnTemperatureK(1500);
    await ContainmentApi.move(kiln, room as never);
    if (!kiln.isLit()) kiln.ignite();
    await ContainmentApi.move(batch as never, kiln as never);
    await batch.restamp();
    batch.reconcileThermal();
    real += ((6 * 3600) / SCALE) * 1000;
    batch.getTemperature();
    expect(batch.isDestroyed()).toBe(false);
    expect(batch.getMaterial()?.getTemplatePath()).toBe(glass.getTemplatePath());
    expect(batch.getMass().rawValue()).toBeCloseTo(16 * 0.72, 3);
    // ⭐ (potash D12a) what stays concentrates: the gall and gases leave,
    // the iron does not — 0.002 of the batch is 0.002 / 0.72 of the glass.
    expect(batch.fractionOf(IRON)).toBeCloseTo(0.002 / 0.72, 6);
    expect(batch.isFluid()).toBe(true);
  });
});
