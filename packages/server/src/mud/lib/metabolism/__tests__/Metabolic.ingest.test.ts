/**
 * MetabolicMixin.ingest — the digestion buffer: per-tag pools, the two
 * verb-determined sub-volumes (solid via `eat`, liquid via
 * `drink`/`sip`), and the overeat cap (the bulk partial-transfer shape
 * — accept up to the sub-capacity, refuse the excess). No world clock
 * is bootstrapped, so the reconcile is a no-op and the buffer holds
 * exactly what was put in.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import Material from "../../material/Material";
import { Quantity } from "../../quantity";
import { StuffApi } from "../../../api/stuff";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { METABOLIC_DEFAULTS } from "../Metabolic";

function food(name: string, nutrients: string[]): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName(name);
    m.setNutrients(nutrients);
    m.setEdibility(true);
    return m;
  }) as unknown as Material;
}

const L = (n: number) => Quantity.of(n, "L");

describe("MetabolicMixin.ingest — buffer + sub-volumes", () => {
  beforeEach(() => installV1QuantityMarshallers());
  afterEach(() => StuffApi.clearAll());

  it("solid intake fills the solid sub-volume and the right pool", () => {
    const c = makeStuff(() => new Creature());
    const ration = food("ration", ["carb"]);
    const accepted = c.ingest(ration, L(0.4), "solid");
    expect(accepted).toBeCloseTo(0.4);
    expect(c.solidVolume).toBeCloseTo(0.4);
    expect(c.liquidVolume).toBe(0);
    // yieldPerLitre(carb)=60 → 60 * 0.4 = 24.
    expect(c.digestionPools.carb).toBeCloseTo(24);
    expect(c.lastMealLabel).toBe("ration");
  });

  it("liquid intake fills the liquid sub-volume and the right pool", () => {
    const c = makeStuff(() => new Creature());
    const water = food("water", ["water"]);
    c.ingest(water, L(0.5), "liquid");
    expect(c.liquidVolume).toBeCloseTo(0.5);
    expect(c.solidVolume).toBe(0);
    // yieldPerLitre(water)=120 → 120 * 0.5 = 60.
    expect(c.digestionPools.water).toBeCloseTo(60);
  });

  it("overeating accepts up to the cap and refuses the excess", () => {
    const c = makeStuff(() => new Creature());
    const ration = food("ration", ["carb"]);
    const cap = METABOLIC_DEFAULTS.SOLID_CAP_LITRES;
    const accepted = c.ingest(ration, L(cap + 1), "solid");
    expect(accepted).toBeCloseTo(cap); // accepted < requested
    expect(c.solidVolume).toBeCloseTo(cap);
    // A further bite is fully refused — already at cap.
    expect(c.ingest(ration, L(0.5), "solid")).toBe(0);
    expect(c.solidVolume).toBeCloseTo(cap);
  });

  it("drink works when too full to eat (separate sub-volume)", () => {
    const c = makeStuff(() => new Creature());
    const ration = food("ration", ["carb"]);
    const water = food("water", ["water"]);
    c.ingest(ration, L(METABOLIC_DEFAULTS.SOLID_CAP_LITRES), "solid");
    expect(c.ingest(ration, L(0.3), "solid")).toBe(0); // stomach full of solids
    const drank = c.ingest(water, L(0.5), "liquid"); // liquid still has room
    expect(drank).toBeCloseTo(0.5);
    expect(c.liquidVolume).toBeCloseTo(0.5);
  });

  it("pools blend per-tag across repeated intake", () => {
    const c = makeStuff(() => new Creature());
    const ration = food("ration", ["carb"]);
    c.ingest(ration, L(0.2), "solid");
    c.ingest(ration, L(0.3), "solid");
    // 60 * (0.2 + 0.3) = 30.
    expect(c.digestionPools.carb).toBeCloseTo(30);
  });

  it("defaults to liquid phase (the drink/sip call shape)", () => {
    const c = makeStuff(() => new Creature());
    const water = food("water", ["water"]);
    c.ingest(water, L(0.25)); // no phase arg
    expect(c.liquidVolume).toBeCloseTo(0.25);
    expect(c.solidVolume).toBe(0);
  });
});
