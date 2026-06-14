/**
 * MetabolicMixin toxin-burden system — a sparse per-toxin burden
 * (created on first exposure), `dose × potency / bodyMass` in over time,
 * clearance out; each burden drives one banded condition whose severity
 * reads the burden live. Acute and chronic are the SAME scalar; burdens
 * are independent (one key per toxin). Rate params come off the toxin's
 * `Condition` seed (here, in-memory fixtures at the toxin path).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import Condition from "../../vitals/Condition";
import type { ToxinBehavior } from "../Metabolic";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
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

// Burden gain per minute = absorbedDose × potency / bodyMass. For these
// fixtures bodyMass = 70 (reference), so gain ≈ absorptionRate / 70.
// Clearance must be below that gain for a burden to BUILD during
// absorption (and slow enough afterward to linger).
const GUT: ToxinBehavior = {
  toxinType: "gut",
  absorptionRate: 4, // ≈ 0.057 burden/min gain
  clearanceRate: 0.01, // slow — burden builds, then lingers
  potency: 1,
  bands: [
    { threshold: 1, severity: 1 },
    { threshold: 4, severity: 2 },
    { threshold: 8, severity: 3 },
  ],
};
const SLOW: ToxinBehavior = {
  toxinType: "slow",
  absorptionRate: 4,
  clearanceRate: 0.005,
  potency: 1,
  bands: [{ threshold: 1, severity: 1 }],
};
// A fast-clearing toxin for the clearance test (drains in minutes).
const PURGE: ToxinBehavior = {
  toxinType: "purge",
  absorptionRate: 50,
  clearanceRate: 0.5,
  potency: 1,
  bands: [
    { threshold: 1, severity: 1 },
    { threshold: 4, severity: 2 },
  ],
};

function ensureCondition(behavior: ToxinBehavior): void {
  const path = "/lib/metabolism/conditions/" + behavior.toxinType;
  if (StuffApi.findByTemplatePath(path)) return;
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName(behavior.toxinType);
    c.setToxinBehavior(behavior);
    return c;
  }, path);
}

const burden = (c: Creature, t: string) => c.toxinBurdens[t] ?? 0;
function hasCond(c: Creature, t: string): boolean {
  const path = "/lib/metabolism/conditions/" + t;
  return c
    .getConditions()
    .some((x) => x.kind === "affliction" && x.templatePath === path);
}
function severity(c: Creature, t: string): number {
  const path = "/lib/metabolism/conditions/" + t;
  const rec = c
    .getConditions()
    .find((x) => x.kind === "affliction" && x.templatePath === path);
  return rec && rec.kind === "affliction" ? rec.stage : -1;
}

describe("MetabolicMixin — toxin burdens", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    ensureCondition(GUT);
    ensureCondition(SLOW);
    ensureCondition(PURGE);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("the dose absorbs into the burden over time (not instant)", () => {
    const c = makeStuff(() => new Creature());
    c.setDigestionPools({ gut: 700 });
    c.getReserve("endurance"); // seed
    expect(burden(c, "gut")).toBe(0); // nothing absorbed yet

    advance(c, 600); // 10 game-min
    const early = burden(c, "gut");
    expect(early).toBeGreaterThan(0);

    advance(c, 1800); // more time
    expect(burden(c, "gut")).toBeGreaterThan(early); // keeps climbing
  });

  it("acute (one big dose) climbs to a high band; chronic stacks the same scalar", () => {
    const acute = makeStuff(() => new Creature());
    acute.setDigestionPools({ gut: 700 });
    acute.getReserve("endurance");
    advance(acute, 12000); // absorb the lot
    expect(severity(acute, "gut")).toBeGreaterThanOrEqual(2); // high band

    const chronic = makeStuff(() => new Creature());
    chronic.getReserve("endurance");
    let prev = 0;
    for (let i = 0; i < 6; i++) {
      const pools = { ...chronic.digestionPools };
      pools.gut = (pools.gut ?? 0) + 100;
      chronic.setDigestionPools(pools);
      advance(chronic, 600);
      const now = burden(chronic, "gut");
      expect(now).toBeGreaterThan(prev); // same scalar accumulates
      prev = now;
    }
    // Both bodies carry exactly one burden key — the same axis.
    expect(Object.keys(acute.toxinBurdens)).toEqual(["gut"]);
    expect(Object.keys(chronic.toxinBurdens)).toEqual(["gut"]);
  });

  it("clearance lowers the burden and clears the condition under threshold", () => {
    const c = makeStuff(() => new Creature());
    c.setToxinBurdens({ purge: 10 });
    c.getReserve("endurance"); // seed + cascade spawns the condition
    advance(c, 60);
    expect(hasCond(c, "purge")).toBe(true);

    advance(c, 9000); // no new dose — clearance (0.5/min) drains it
    expect(burden(c, "purge")).toBeLessThan(1); // below the lowest band
    expect(hasCond(c, "purge")).toBe(false); // condition cleared
  });

  it("burdens are independent — two toxins never conflate", () => {
    const c = makeStuff(() => new Creature());
    c.setToxinBurdens({ gut: 8, slow: 6 });
    c.getReserve("endurance");
    advance(c, 60);
    expect(hasCond(c, "gut")).toBe(true);
    expect(hasCond(c, "slow")).toBe(true);
    expect(burden(c, "gut")).not.toBe(burden(c, "slow"));
  });
});
