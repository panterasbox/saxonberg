/**
 * MetabolicMixin macro routing — the digestion buffer's tag dispatch
 * fans a multi-tag meal to the energy economy: water→hydration,
 * sugar/carb→fast satiation, fat→slow satiation, protein→the
 * tracked-but-inert tissue-repair seam (absorbs out of the pool but
 * drives nothing until vitals healing is wired).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import Material from "../../material/Material";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../platform/idea/WorldClockRegistry";
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";

const SCALE = 12;
let real = 0;

function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    c.getReserve("endurance");
    remaining -= s;
  }
}

const L = (n: number) => Quantity.of(n, "L");
const sat = (c: Creature) => c.getReserve("satiation")!.current.rawValue();
const hyd = (c: Creature) => c.getReserve("hydration")!.current.rawValue();

function food(nutrients: string[]): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName("rations");
    m.setNutrients(nutrients);
    m.setEdibility(true);
    return m;
  }) as unknown as Material;
}

describe("MetabolicMixin — macro routing", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("a full meal routes water/carb/fat/protein to their handlers", () => {
    const c = makeStuff(() => new Creature());
    c.adjustReserve("satiation", Quantity.of(-80, "%")); // 20
    c.adjustReserve("hydration", Quantity.of(-80, "%")); // 20

    c.ingest(food(["water", "carb", "fat", "protein"]), L(1.0), "solid");
    // All four tags landed in the buffer.
    expect(c.digestionPools.water).toBeGreaterThan(0);
    expect(c.digestionPools.carb).toBeGreaterThan(0);
    expect(c.digestionPools.fat).toBeGreaterThan(0);
    expect(c.digestionPools.protein).toBeGreaterThan(0);

    advance(c, 6000); // 100 game-min — drain the pools
    // Energy tags delivered to their reserves.
    expect(sat(c)).toBeGreaterThan(20); // carb + fat → satiation
    expect(hyd(c)).toBeGreaterThan(20); // water → hydration
  });

  it("protein absorbs out of its pool but drives nothing (inert seam)", () => {
    const c = makeStuff(() => new Creature());
    c.setDigestionPools({ protein: 40 });
    c.getReserve("endurance"); // seed
    const endBefore = c.getReserve("endurance")!.current.rawValue();
    const satBefore = sat(c);

    advance(c, 6000); // drain the protein pool
    // The protein pool emptied (absorbed over time)...
    expect(c.digestionPools.protein ?? 0).toBeLessThan(40);
    // ...but it delivered nothing: no reserve climbed off protein.
    // (endurance/satiation only ever fall here — no recovery fuel path
    // from protein.)
    expect(sat(c)).toBeLessThanOrEqual(satBefore);
    expect(c.getReserve("endurance")!.current.rawValue()).toBeLessThanOrEqual(
      endBefore,
    );
  });
});
