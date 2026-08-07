/**
 * MetabolicMixin alcohol exemplar — a multi-tag beverage fans one
 * `ingest` to satiation + hydration + an `alcohol` burden; the burden
 * STORES ethanol grams and `getBAC()` derives BAC via Widmark (sex →
 * `r`, body mass); a single banded `intoxication` condition reads
 * `getBAC()` live (drunk and alcohol-poisoning are bands of one axis);
 * clearance is zero-order (linear BAC fall).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Creature } from "../../creature/Creature";
import Condition from "../../../obj/Condition";
import Material from "../../material/Material";
import type { ToxinBehavior } from "../Metabolic";
import { Quantity } from "../../quantity";
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

const ALCOHOL: ToxinBehavior = {
  toxinType: "alcohol",
  storeRaw: true,
  absorptionRate: 0.5,
  clearanceRate: 0.12,
  potency: 1,
  bands: [
    { threshold: 0.03, severity: 1 },
    { threshold: 0.08, severity: 2 },
    { threshold: 0.15, severity: 3 },
    { threshold: 0.25, severity: 4 },
    { threshold: 0.4, severity: 5 },
  ],
};

const ALCOHOL_PATH = "/obj/Condition/metabolism/alcohol";

/**
 * ⚠ **This fabricates what production's `ConditionApi.boot` stands up.**
 * A hand-built fixture at a hard-coded path passes whether or not boot
 * works — which is exactly how the inert-Condition bug survived: every
 * toxin suite was green while `findByTemplatePath` answered `null` in a
 * running world and no toxin ever cleared.
 *
 * The path is pinned against the real seed roster by
 * `obj/api/__tests__/ConditionLogic.boot.test.ts`, so a seed rename
 * breaks there rather than silently un-testing this file.
 */
function ensureAlcoholCondition(): void {
  if (StuffApi.findByTemplatePath(ALCOHOL_PATH)) return;
  makeStuffAtPath(() => {
    const c = new Condition();
    c.setName("intoxicated");
    c.setToxinBehavior(ALCOHOL);
    return c;
  }, ALCOHOL_PATH);
}

function ale(): Material {
  return makeStuff(() => {
    const m = new Material();
    m.setName("ale");
    m.setEdibility(true);
    m.setNutrients(["carb", "water"]);
    m.setToxicity([{ type: "alcohol", amount: 14 }]);
    return m;
  }) as unknown as Material;
}

const bac = (c: Creature) => c.getBAC().rawValue();
function intoxSeverity(c: Creature): number {
  const rec = c
    .getConditions()
    .find((x) => x.kind === "affliction" && x.templatePath === ALCOHOL_PATH);
  return rec && rec.kind === "affliction" ? rec.stage : -1;
}

describe("MetabolicMixin — alcohol / BAC", () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
    ensureAlcoholCondition();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it("one ale ingest fans to satiation + hydration + the alcohol burden", () => {
    const c = makeStuff(() => new Creature());
    c.adjustReserve("satiation", Quantity.of(-50, "%"));
    c.adjustReserve("hydration", Quantity.of(-50, "%"));
    c.ingest(ale(), Quantity.of(0.4, "L"), "liquid");
    expect(c.digestionPools.alcohol).toBeCloseTo(14); // the dose entered the pool
    expect(c.digestionPools.carb).toBeGreaterThan(0);
    expect(c.digestionPools.water).toBeGreaterThan(0);

    advance(c, 1200); // 20 game-min — pools absorb
    expect(c.getReserve("satiation")!.current.rawValue()).toBeGreaterThan(50);
    expect(c.getReserve("hydration")!.current.rawValue()).toBeGreaterThan(50);
    expect(c.toxinBurdens.alcohol).toBeGreaterThan(0); // ethanol absorbed
    expect(bac(c)).toBeGreaterThan(0);
  });

  it("getBAC derives g/dL from ethanol mass, body mass, and r (male vs female)", () => {
    const male = makeStuff(() => new Creature());
    const female = makeStuff(() => new Creature());
    male.setMass(Quantity.of(70, "kg"));
    female.setMass(Quantity.of(70, "kg"));
    // Set sex directly — a bare Creature has no species for setSex's
    // validation; getBAC only reads getSex() for the Widmark `r`.
    (male as unknown as { sex: string | null }).sex = "male";
    (female as unknown as { sex: string | null }).sex = "female";
    male.setToxinBurdens({ alcohol: 50 });
    female.setToxinBurdens({ alcohol: 50 });

    // male r≈0.68 → 50/(70·0.68)/10 ≈ 0.105 g/dL
    expect(bac(male)).toBeCloseTo(0.105, 2);
    // female r≈0.55 → higher BAC for the same dose + mass
    expect(bac(female)).toBeGreaterThan(bac(male));
  });

  it("intoxication severity rises through bands — drunk and poisoning are one axis", () => {
    const c = makeStuff(() => new Creature());
    c.setMass(Quantity.of(70, "kg"));
    (c as unknown as { sex: string | null }).sex = "male";
    c.getReserve("endurance"); // seed the metabolic clock

    c.setToxinBurdens({ alcohol: 50 }); // ~0.105 g/dL → "drunk" band
    advance(c, 60);
    const drunk = intoxSeverity(c);
    expect(drunk).toBeGreaterThanOrEqual(2);

    c.setToxinBurdens({ alcohol: 200 }); // ~0.42 g/dL → poisoning band
    advance(c, 60);
    const poisoned = intoxSeverity(c);
    expect(poisoned).toBeGreaterThan(drunk);
    // Same single condition the whole way up — not two states.
    expect(
      c.getConditions().filter(
        (x) => x.kind === "affliction" && x.templatePath === ALCOHOL_PATH,
      ).length,
    ).toBe(1);
  });

  it("clearance is linear (BAC falls a fixed amount per unit time)", () => {
    const c = makeStuff(() => new Creature());
    c.setMass(Quantity.of(70, "kg"));
    c.setToxinBurdens({ alcohol: 60 }); // no pool → pure clearance
    c.getReserve("endurance"); // seed
    const b0 = c.toxinBurdens.alcohol ?? 0;

    advance(c, 3000); // 50 game-min
    const b1 = c.toxinBurdens.alcohol ?? 0;
    advance(c, 3000); // another 50 game-min
    const b2 = c.toxinBurdens.alcohol ?? 0;

    const drop1 = b0 - b1;
    const drop2 = b1 - b2;
    expect(drop1).toBeGreaterThan(0);
    expect(drop2).toBeCloseTo(drop1, 1); // equal drops ⇒ zero-order
  });
});
