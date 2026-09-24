/**
 * ComminutingMixin (docs/subsystems/crafting.md § comminution) — grind, then bolt.
 *
 * The assertion that carries the whole design is the LAST one:
 * **0.61 and 0.62 must not produce the same matter.** A band ladder
 * would have made them identical and turned the miller's decision into a
 * three-item menu; the continuous composition is what keeps it a
 * decision. Everything else here is conservation and clamping.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from "vitest";
import Thing from "../../stuff/Thing";
import Material from "../../material/Material";
import { ComminutingMixin } from "../Comminuting";
import { ToolMixin } from "../Tooled";
import { Grade } from "../Grade";
import { Quantity } from "../../quantity";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

const FLOUR = "/stuff/idea/material/food/test-flour";
const BRAN = "/stuff/idea/material/food/test-bran";

class TestMill extends ComminutingMixin(ToolMixin(Thing)) {
  static _mixinName = "TestMillComminuting";
}

function material(path: string, name: string, density: number): void {
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setDensity(Quantity.of(density, "kg/m³"));
    return m;
  }, path);
}

function mill(over: Partial<Record<string, unknown>> = {}): TestMill {
  const m = makeStuff(() => new TestMill());
  m.productMaterial = FLOUR;
  m.residueMaterial = BRAN;
  m.residueFraction = 0.25;
  m.extractionMin = 0.55;
  m.extractionMax = 1;
  m.extractionDefault = 0.75;
  m.throughputKgPerMin = 0.25;
  Object.assign(m, over);
  return m;
}

beforeEach(() => {
  StuffApi.clearAll();
  material(FLOUR, "flour", 570);
  material(BRAN, "bran", 250);
});

describe("comminution — conservation and the clamp", () => {
  it("product + residue = input, always", () => {
    const m = mill();
    for (const e of [0.55, 0.61, 0.72, 0.9, 1]) {
      const p = m.planComminution(
        { kg: 25, materialPath: "/x", gradeBand: "fine" },
        e,
      );
      expect(p.productKg + p.residueKg).toBeCloseTo(25, 9);
    }
  });

  it("the toll comes out of the PRODUCT, not out of thin air", () => {
    const m = mill({ tollFraction: 0.1, tollBinPath: "/test/bin" });
    const p = m.planComminution(
      { kg: 25, materialPath: "/x", gradeBand: "fine" },
      0.72,
    );
    expect(p.tollKg).toBeCloseTo(p.productKg * 0.1, 9);
    expect(p.tollKg).toBeLessThan(p.productKg);
  });

  it("a mill with nowhere to put a toll takes none", () => {
    const m = mill({ tollFraction: 0.1, tollBinPath: "" });
    expect(
      m.planComminution({ kg: 25, materialPath: "/x", gradeBand: "fine" }, 0.72)
        .tollKg,
    ).toBe(0);
  });

  it("extraction clamps to the instrument's range", () => {
    const m = mill();
    const low = m.planComminution({ kg: 10, materialPath: "/x", gradeBand: "" }, 0.1);
    const high = m.planComminution({ kg: 10, materialPath: "/x", gradeBand: "" }, 5);
    expect(low.extraction).toBe(0.55);
    expect(high.extraction).toBe(1);
  });

  it("no extraction named uses the row's default", () => {
    const m = mill();
    expect(
      m.planComminution({ kg: 10, materialPath: "/x", gradeBand: "" }).extraction,
    ).toBe(0.75);
  });

  it("litres come from each material's own density", () => {
    const m = mill();
    const p = m.planComminution({ kg: 20, materialPath: "/x", gradeBand: "" }, 0.75);
    expect(p.productL).toBeCloseTo(p.productKg / 0.57, 6);
    expect(p.residueL).toBeCloseTo(p.residueKg / 0.25, 6);
  });
});

describe("comminution — grade is weakest-link, floored by the instrument", () => {
  it("poor grain makes poor flour", () => {
    const m = mill();
    expect(
      m.planComminution({ kg: 10, materialPath: "/x", gradeBand: "poor" }, 0.72)
        .grade.getBand(),
    ).toBe("poor");
  });

  it("ungraded input derives at fair", () => {
    const m = mill();
    expect(
      m.planComminution({ kg: 10, materialPath: "/x", gradeBand: "" }, 0.72)
        .grade.getBand(),
    ).toBe("fair");
  });

  it("⭐ a fine mill raises the FLOOR and never the ceiling", () => {
    const m = mill();
    m.setCapabilities([{ kind: "millstone", control: "fine" }]);
    // Poor grain is lifted to the instrument's floor…
    expect(
      m.planComminution({ kg: 10, materialPath: "/x", gradeBand: "poor" }, 0.72)
        .grade.getBand(),
    ).toBe("fine");
    // …and exceptional grain is NOT dragged down to it.
    const better = m.planComminution(
      { kg: 10, materialPath: "/x", gradeBand: "exceptional" },
      0.72,
    );
    expect(better.grade.getBand()).toBe("exceptional");
    expect(better.grade.compareTo(Grade.of("fine"))).toBeGreaterThan(0);
  });
});

describe("⭐⭐ extraction is CONTINUOUS — the whole reason there is no band ladder", () => {
  it("below 1 - b the product is pure inner stock", () => {
    const m = mill(); // b = 0.25, so the threshold is 0.75
    const p = m.planComminution({ kg: 20, materialPath: "/x", gradeBand: "" }, 0.7);
    expect(p.outerShare).toBe(0);
    expect(p.composition).toHaveLength(1);
    expect(p.composition[0]!.materialPath).toBe(FLOUR);
  });

  it("above it the outer share rises with extraction, smoothly", () => {
    const m = mill();
    const shares = [0.8, 0.85, 0.9, 0.95, 1].map(
      (e) =>
        m.planComminution({ kg: 20, materialPath: "/x", gradeBand: "" }, e)
          .outerShare,
    );
    for (let i = 1; i < shares.length; i += 1) {
      expect(shares[i]!).toBeGreaterThan(shares[i - 1]!);
    }
    // At full extraction you kept everything, so the product is exactly
    // the input's own make-up: b of it is outer matter.
    expect(shares[shares.length - 1]!).toBeCloseTo(0.25, 9);
  });

  it("⭐⭐⭐ 0.61 and 0.62 do NOT produce the same flour (AC 20)", () => {
    // ⚠ This is the test the design hangs on. With a band ladder these
    // two settings land in the same band and mint the same material —
    // which makes the miller's decision a menu with three items on it.
    // With a continuous composition they are different matter, and a
    // player who mills at 0.61 has made something nobody else has.
    //
    // Both are below `1 - b` here, so the OUTER share is zero for both
    // and what differs is the servings: the same proportions of more or
    // less flour. That still reads differently on a label, because a
    // label sums servings.
    const m = mill();
    const a = m.planComminution({ kg: 25, materialPath: "/x", gradeBand: "" }, 0.61);
    const b = m.planComminution({ kg: 25, materialPath: "/x", gradeBand: "" }, 0.62);
    expect(a.composition).not.toEqual(b.composition);
    expect(a.productKg).not.toBe(b.productKg);

    // And in the band where the outer share moves, the COMPOSITION
    // differs in proportion, not merely in amount — two sacks of the
    // same weight that are made of different things.
    const c = m.planComminution({ kg: 25, materialPath: "/x", gradeBand: "" }, 0.86);
    const d = m.planComminution({ kg: 25, materialPath: "/x", gradeBand: "" }, 0.87);
    expect(c.outerShare).not.toBeCloseTo(d.outerShare, 6);
  });

  it("keeping moves with the outer share — wholemeal is wetter", () => {
    const m = mill();
    const white = m.planComminution({ kg: 20, materialPath: "/x", gradeBand: "" }, 0.7);
    const brown = m.planComminution({ kg: 20, materialPath: "/x", gradeBand: "" }, 0.9);
    const whole = m.planComminution({ kg: 20, materialPath: "/x", gradeBand: "" }, 1);
    expect(white.water.moisture).toBeLessThan(brown.water.moisture);
    expect(brown.water.moisture).toBeLessThan(whole.water.moisture);
    expect(white.water.solute).toBe(0);
  });

  it("the composition's servings always add up to the product", () => {
    const m = mill();
    for (const e of [0.6, 0.75, 0.88, 1]) {
      const p = m.planComminution(
        { kg: 25, materialPath: "/x", gradeBand: "" },
        e,
      );
      const total = p.composition.reduce((a, c) => a + c.servings, 0);
      expect(total).toBeCloseTo(p.productKg / 0.1, 6);
    }
  });
});

describe("throughput — the power seam is a hole the kernel does not fill", () => {
  it("a hand mill grinds at its unpowered rate", () => {
    const m = mill();
    expect(m.throughputNow()).toBe(0.25);
    expect(m.grindMs(5)).toBeCloseTo((5 / 0.25) * 60 * 1000, 6);
  });

  it("⭐ a powered mill with no power source grinds at ZERO, and says so", () => {
    // `availablePowerW()` answers 0 on the kernel mixin — a water mill
    // with no river is a building, not a mill. That is the honest
    // failure: it does not silently fall back to hand speed.
    const m = mill({ throughputKgPerMin: 0, kgPerMinPerKw: 0.5 });
    expect(m.availablePowerW()).toBe(0);
    expect(m.throughputNow()).toBe(0);
    expect(m.grindMs(5)).toBe(0);
  });

  it("power raises throughput, and the row's ceiling caps it", () => {
    class Driven extends TestMill {
      static _mixinName = "TestMillDriven";
      availablePowerW(): number {
        return 40000; // 40 kW
      }
    }
    const m = makeStuff(() => new Driven());
    m.productMaterial = FLOUR;
    m.residueMaterial = BRAN;
    m.throughputKgPerMin = 0;
    m.kgPerMinPerKw = 0.5;
    expect(m.throughputNow()).toBe(20); // 40 kW * 0.5
    m.maxThroughputKgPerMin = 10;
    expect(m.throughputNow()).toBe(10);
  });

  it("a reload wakes the mill IDLE — an engagement does not survive a restart", () => {
    const m = mill();
    expect(m.isGrinding()).toBe(false);
    m.setGrinding(true);
    expect(m.isGrinding()).toBe(true);
    // The flag is runtime-only and absent from fieldMeta, so nothing
    // persists it; a mill that claimed to be grinding forever would be
    // stranded with no way back.
    expect(Object.keys(TestMill.fieldMeta)).not.toContain("_grinding");
  });
});
