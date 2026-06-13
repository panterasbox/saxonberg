/**
 * MetabolicMixin.reconcileMetabolism — the lazy, sub-stepped in-session
 * time drive: digestion absorption (gradual, per-tag rates), basal
 * drain (mass-scaled), and coupled recovery (spends both tanks,
 * hydration the tighter leash). Driven through the real
 * `WorldClockApi` test seam.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import Material from "../../material/Material";
import { Quantity } from "../../quantity";
import { WorldClockApi } from "../../../api/worldclock";
import "../../../obj/WorldClockRegistry"; // register the registry class
import { makeStuff } from "../../security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../persistence/__tests__/quantity-marshaller-test-helpers";
import { Postures } from "../../slot/Postured";

const SCALE = 12; // default game-seconds per real-second
let real = 0;

/** Advance game-time by `gameSec`, in chunks under the far-past guard,
 *  reconciling every body in `cs` (via a reserve read) at each chunk —
 *  so multiple bodies on the shared clock keep their gaps in lockstep
 *  (advancing one body's stamp without the other would push the other
 *  past the far-past guard). */
function advanceAll(cs: Creature[], gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    for (const c of cs) c.getReserve("endurance"); // force the lazy reconcile
    remaining -= s;
  }
}

/** Single-body convenience over {@link advanceAll}. */
function advance(c: Creature, gameSec: number, chunkSec = 3000): void {
  advanceAll([c], gameSec, chunkSec);
}

const Q = (n: number) => Quantity.of(n, "%");
const L = (n: number) => Quantity.of(n, "L");

function food(name: string, nutrients: string[]): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName(name);
    m.setNutrients(nutrients);
    m.setEdibility(true);
    return m;
  }) as unknown as Material;
}

function sat(c: Creature): number {
  return c.getReserve("satiation")!.current.rawValue();
}
function hyd(c: Creature): number {
  return c.getReserve("hydration")!.current.rawValue();
}
function end(c: Creature): number {
  return c.getReserve("endurance")!.current.rawValue();
}

describe("MetabolicMixin reconcile — digestion absorption", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000; // a positive base so the stamp seeds non-zero
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("fills the reserve gradually over time, not instantly", () => {
    const c = makeStuff(() => new Creature());
    c.adjustReserve("satiation", Q(-60)); // satiation 40
    c.ingest(food("ration", ["carb"]), L(0.4), "solid"); // pool carb=24
    const before = sat(c); // seeds the stamp, no integration yet
    expect(before).toBeCloseTo(40, 1);

    advance(c, 300); // 5 game-min: carb absorbs ~5 (1.0%/min)
    const mid = sat(c);
    expect(mid).toBeGreaterThan(before);
    expect(mid).toBeLessThan(before + 24); // not the whole pool — gradual

    advance(c, 1800); // 30 more game-min: drains the rest of the pool
    const later = sat(c);
    expect(later).toBeGreaterThan(mid);
  });

  it("absorbs carb faster than fat (per-tag rates)", () => {
    const carbBody = makeStuff(() => new Creature());
    const fatBody = makeStuff(() => new Creature());
    for (const b of [carbBody, fatBody]) b.adjustReserve("satiation", Q(-80));
    // Equal pools, different tags.
    carbBody.setDigestionPools({ carb: 50 });
    fatBody.setDigestionPools({ fat: 50 });
    // Seed both stamps.
    sat(carbBody);
    sat(fatBody);

    advanceAll([carbBody, fatBody], 600); // 10 game-min, in lockstep
    const carbGain = sat(carbBody) - 20;
    const fatGain = sat(fatBody) - 20;
    expect(carbGain).toBeGreaterThan(fatGain);
  });
});

describe("MetabolicMixin reconcile — basal drain", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    // _resetForTesting lazy-creates + indexes the WorldClock registry on
    // first call and zeros its anchor; we deliberately do NOT clearAll
    // here, so the registry stays indexed across this file's tests (the
    // metabolism reconcile probes for it by templatePath). Fresh bodies
    // per test keep them independent.
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("a heavier body burns satiation faster (mass-scaled basal)", () => {
    const light = makeStuff(() => new Creature());
    const heavy = makeStuff(() => new Creature());
    light.setMass(Quantity.of(70, "kg")); // reference mass → factor 1
    heavy.setMass(Quantity.of(140, "kg")); // factor 2
    sat(light);
    sat(heavy); // seed stamps; endurance full → no recovery to spend satiation

    advanceAll([light, heavy], 12000); // 200 game-min, in lockstep
    const lightDrop = 100 - sat(light);
    const heavyDrop = 100 - sat(heavy);
    expect(heavyDrop).toBeGreaterThan(lightDrop * 1.5);
  });

  it("the thermal-strategy multiplier defaults to 1.0 (inert seam)", () => {
    const c = makeStuff(() => new Creature());
    c.setMass(Quantity.of(70, "kg"));
    sat(c);
    advance(c, 6000); // 100 game-min
    // basal satiation = 0.02 %/min * 100 min * 1 * 1 = 2.0
    expect(100 - sat(c)).toBeCloseTo(2.0, 1);
  });
});

describe("MetabolicMixin reconcile — coupled recovery", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    // _resetForTesting lazy-creates + indexes the WorldClock registry on
    // first call and zeros its anchor; we deliberately do NOT clearAll
    // here, so the registry stays indexed across this file's tests (the
    // metabolism reconcile probes for it by templatePath). Fresh bodies
    // per test keep them independent.
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("at rest rebuilds endurance by spending both tanks", () => {
    const c = makeStuff(() => new Creature());
    c.setPosture(Postures.Lie);
    c.adjustReserve("endurance", Q(-50)); // 50
    end(c); // seed
    const sat0 = sat(c);
    const hyd0 = hyd(c);

    advance(c, 1200); // 20 game-min at rest
    expect(end(c)).toBeGreaterThan(50); // endurance climbed
    expect(sat(c)).toBeLessThan(sat0); // fuel spent
    expect(hyd(c)).toBeLessThan(hyd0); // water spent
  });

  it("hydration is the tighter leash (drawn harder than satiation)", () => {
    const c = makeStuff(() => new Creature());
    c.setPosture(Postures.Lie);
    c.adjustReserve("endurance", Q(-60));
    end(c);
    const sat0 = sat(c);
    const hyd0 = hyd(c);

    advance(c, 1200);
    const satSpent = sat0 - sat(c);
    const hydSpent = hyd0 - hyd(c);
    // Hydration spent includes basal too, but the recovery draw alone is
    // the tighter leash (0.7 vs 0.5 per % endurance).
    expect(hydSpent).toBeGreaterThan(satSpent);
  });

  it("standing recovers slower than lying (posture base)", () => {
    const lying = makeStuff(() => new Creature());
    const standing = makeStuff(() => new Creature());
    lying.setPosture(Postures.Lie);
    standing.setPosture(Postures.Stand);
    for (const b of [lying, standing]) b.adjustReserve("endurance", Q(-50));
    end(lying);
    end(standing);

    advanceAll([lying, standing], 600);
    expect(end(lying)).toBeGreaterThan(end(standing));
  });
});

describe("MetabolicMixin reconcile — honest integration", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    // _resetForTesting lazy-creates + indexes the WorldClock registry on
    // first call and zeros its anchor; we deliberately do NOT clearAll
    // here, so the registry stays indexed across this file's tests (the
    // metabolism reconcile probes for it by templatePath). Fresh bodies
    // per test keep them independent.
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("one big-Δt reconcile ≈ many small reconciles (sub-stepping)", () => {
    const big = makeStuff(() => new Creature());
    const small = makeStuff(() => new Creature());
    for (const b of [big, small]) {
      b.setPosture(Postures.Lie);
      b.adjustReserve("endurance", Q(-50));
      b.adjustReserve("satiation", Q(-40));
      b.setDigestionPools({ carb: 80 });
      end(b); // seed both stamps at the same now
    }

    // Drive the same 7200s span: `small` reads (reconciles) every 60s,
    // while `big` is read only once at the very end — so `big` does one
    // reconcile over the whole gap (sub-stepping internally) and `small`
    // does 120 small reconciles. Honest integration ⇒ they agree.
    for (let i = 0; i < 120; i++) {
      real += (60 / SCALE) * 1000;
      end(small);
    }
    end(big);

    expect(end(big)).toBeCloseTo(end(small), 1);
    expect(sat(big)).toBeCloseTo(sat(small), 1);
    expect(hyd(big)).toBeCloseTo(hyd(small), 1);
  });
});
