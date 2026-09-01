/**
 * The four room archetypes (wave 8 — D6, D12, D13, D16).
 *
 * These are **content**, and the strongest assertion in this file is the
 * negative one: the archetypes add **zero new classes, mixins or verbs**.
 * That is D12's authored-not-coded constraint, and it is what makes D6's
 * "archetypes are template rows now, classes when they earn it" checkable
 * rather than asserted.
 *
 * Read as a set they are four *different kinds of answer* — function
 * (bedroom), bundle (kitchen), presence (bathroom), audience (living) —
 * which is what justified modelling all four instead of shipping one room
 * class with four prose strings.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

// A32.2 scaffolding: a kernel test reading shipped content by path. Three
// archetypes are the generic-objects pack's rows (content-packs wave 3);
// the kitchen is the hearth-cooking trade's bundle (libations — a venue
// bundle lives with the trade whose instruments it collects).
const CONTENT = fileURLToPath(new URL("../../../../../content/", import.meta.url));
const ROW: Record<string, string> = {
  bedroom: "generic-objects/content/stuff/location/room/bedroom.yaml",
  kitchen: "trade-hearth-cooking/content/trade/hearth-cooking/location/kitchen.yaml",
  bathroom: "generic-objects/content/stuff/location/room/bathroom.yaml",
  living: "generic-objects/content/stuff/location/room/living.yaml",
};

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

const SEEDS = join(CONTENT, "generic-objects/content/");
/** An archetype by name, or any generic-objects row by content-relative path. */
const read = (name: string): Seed =>
  parse(
    readFileSync(ROW[name] ? join(CONTENT, ROW[name]) : join(SEEDS, name), "utf8"),
  ) as Seed;

const ARCHETYPES = ["bedroom", "kitchen", "bathroom", "living"] as const;

describe("the four archetypes are template rows over ONE class (D6)", () => {
  it("all four exist and share `/lib/location/FurnishableRoom`", () => {
    for (const name of ARCHETYPES) {
      const seed = read(name);
      expect(seed.class).toBe("/platform/location/FurnishableRoom");
    }
  });

  it("what distinguishes them is prose and their fixture set, nothing else", () => {
    const seeds = ARCHETYPES.map((n) => read(n));
    const prose = seeds.map((s) => s.data?.longDescription);
    expect(new Set(prose).size).toBe(4);

    const fixtures = seeds.map((s) => JSON.stringify(s.data?.props ?? []));
    expect(new Set(fixtures).size).toBe(4);
  });

  it("adds ZERO new classes — every fixture is an already-shipped one", () => {
    // The check that keeps D12 honest. If a fixture ever needs a class of
    // its own, that is a design decision, not a detail — make it explicitly.
    const shipped = new Set([
      "/platform/thing/Chair", // bed, tub, armchair — slots authored per seed
      "/platform/thing/Oven", // the range
      "/platform/thing/Chest", // the larder
      // The basin. ⭐ It was `/platform/thing/UnboundedReceptacle` — but
      // that class means only *inexhaustible liquid source*, and its
      // other shipped row is a COFFEE URN, so `wash` sat on a class that
      // offered you a verb for washing a glass in the coffee.
      // `WaterFixture` is the deliberate split this test exists to
      // force: plumbed water you can work at, and the thing that affords
      // `wash` (in `peers`, so a person standing at it can actually see
      // the verb — it was in `environment`, which reaches only the
      // containers ABOVE a thing, and nobody carries a basin).
      "/platform/thing/WaterFixture",
      "/platform/thing/Surface", // the counter
      "/platform/thing/Prop", // the toilet — prose, no capability
    ]);
    for (const file of readdirSync(join(SEEDS, "stuff/thing/fixture"))) {
      const seed = read(`stuff/thing/fixture/${file}`);
      expect(shipped.has(seed.class ?? "")).toBe(true);
    }
  });
});

describe("the bedroom — FUNCTION (D10)", () => {
  it("seeds a bed that is lieable and better than the floor", () => {
    const bed = read("stuff/thing/fixture/bed.yaml");
    const slots = bed.data?.staticSlots as Array<{ postures?: string[] }>;
    expect(slots?.[0]?.postures).toContain("lie");
    // Authored constant, not derived — the aggregation from bedding
    // freshness and tidiness needs the condition model (a non-goal).
    expect(bed.data?.restQuality).toBeGreaterThan(1);
  });
  // The DORM bed's three cases live beside Duncan Hall
  // (world/eternal/duncan-hall/__tests__/dorm-bed.archetype.test.ts) —
  // a kernel test does not name shipped content.
});

describe("the kitchen — BUNDLE (D12)", () => {
  it("collapses the errand: heat, water, a work surface, food in reach", () => {
    const kitchen = read("kitchen");
    expect(kitchen.data?.props).toEqual([
      "/stuff/thing/fixture/range",
      "/stuff/thing/fixture/counter",
      "/stuff/thing/fixture/larder",
      "/stuff/thing/fixture/basin",
    ]);
  });

  it("the larder's lid is load-bearing — seeded OPEN so the gather walk reaches it", () => {
    // The craft gather walk descends one level into OPEN room containers;
    // closed, the same larder is storage. Shipped behaviour the archetype
    // now depends on, so it is pinned here.
    expect(read("stuff/thing/fixture/larder.yaml").data?.open).toBe(true);
  });

  it("authors an `air` reserve — the one decision with teeth", () => {
    // The only room in the build where you deliberately run a fire indoors.
    // A finite budget + a lit fire + no ventilation = incomplete burn, smoke
    // and CO, self-smother. Any open neighbour ventilates, so it is
    // forgiving; deleting this block restores open air with nothing else
    // touched.
    const reserves = read("kitchen").data?.reserves as Record<
      string,
      { capacityValue?: number; theme?: string }
    >;
    expect(reserves?.air?.theme).toBe("atmosphere");
    expect(reserves?.air?.capacityValue).toBe(100);
  });

  it("no OTHER archetype authors one — a bedroom is open air", () => {
    for (const name of ["bedroom", "bathroom", "living"] as const) {
      expect(read(name).data?.reserves).toBeUndefined();
    }
  });
});

describe("the bathroom — PRESENCE (D13)", () => {
  it("three fixtures at three rungs of the LOD ladder", () => {
    expect(read("bathroom").data?.props).toEqual([
      "/stuff/thing/fixture/toilet",
      "/stuff/thing/fixture/basin",
      "/stuff/thing/fixture/tub",
    ]);
  });

  it("the toilet does nothing, deliberately — prose, no capability", () => {
    // Enforced rather than remembered. `/platform/thing/Prop` is Tangible +
    // Visible + Containable and nothing else: no slot, no surface, no
    // container, no bulk. If you are here to "finish" the toilet: don't.
    const toilet = read("stuff/thing/fixture/toilet.yaml");
    expect(toilet.class).toBe("/platform/thing/Prop");
    for (const capability of [
      "staticSlots",
      "interiorBulk",
      "surfaceBulk",
      "restQuality",
      "open",
    ]) {
      expect(toilet.data?.[capability]).toBeUndefined();
    }
  });

  it("the tub is a real rest surface, and it is warm", () => {
    const tub = read("stuff/thing/fixture/tub.yaml");
    expect(tub.data?.restQuality).toBeGreaterThan(1);
    expect(tub.data?.warmth).toBeGreaterThan(0);
    const slots = tub.data?.staticSlots as Array<{ postures?: string[] }>;
    expect(slots?.[0]?.postures).toContain("lie");
  });
});

describe("the living room — AUDIENCE (D16)", () => {
  it("ships EMPTY — the empty room is the invitation", () => {
    // Every other archetype comes with built-ins the landlord fitted. This
    // one comes with a floor and light, because filling it is the player's
    // only job here.
    const living = read("living");
    expect(living.data?.props).toBeUndefined();
    expect(living.data?.ambientIntensity).toBeGreaterThan(0);
  });

  it("seating is a good you BUY, not a fitted built-in", () => {
    const chair = read("stuff/thing/fixture/armchair.yaml");
    expect(chair.class).toBe("/platform/thing/Chair");
    // ...and it is in no archetype's populates.
    for (const name of ARCHETYPES) {
      const populates = (read(name).data?.props ??
        []) as string[];
      expect(populates).not.toContain("/stuff/thing/fixture/armchair");
    }
  });

  it("no television — `watch` needs no object, so an object would model nothing", () => {
    const files = readdirSync(join(SEEDS, "stuff/thing/fixture"));
    expect(files.some((f) => /tv|television|screen/i.test(f))).toBe(false);
  });
});

describe("venue-genericity and the tier invariant (D15, D13)", () => {
  it("no archetype row is tier-specific — the frontier build adds a resolver, not edits", () => {
    // The surviving half of water-by-tier: v1 ships the tap, and the
    // invariant that costs nothing now and is expensive to retrofit is that
    // NO row encodes a locality or assumes municipal plumbing.
    for (const name of ARCHETYPES) {
      const raw = readFileSync(join(CONTENT, ROW[name]!), "utf8");
      expect(raw).not.toMatch(/terminus|hinkley|municipal/i);
    }
  });

  it("no archetype names a residence — home-ness comes from the parcel above", () => {
    for (const name of ARCHETYPES) {
      const seed = read(name);
      expect(JSON.stringify(seed.data)).not.toMatch(/apartment|tenant|lease/i);
    }
  });
});
