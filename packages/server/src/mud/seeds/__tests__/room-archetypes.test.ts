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

const SEEDS = fileURLToPath(new URL("..", import.meta.url));

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

const read = (rel: string): Seed =>
  parse(readFileSync(join(SEEDS, rel), "utf8")) as Seed;

const ARCHETYPES = ["bedroom", "kitchen", "bathroom", "living"] as const;

describe("the four archetypes are template rows over ONE class (D6)", () => {
  it("all four exist and share `/lib/location/FurnishableRoom`", () => {
    for (const name of ARCHETYPES) {
      const seed = read(`obj/room/${name}.yaml`);
      expect(seed.class).toBe("/obj/location/FurnishableRoom");
    }
  });

  it("what distinguishes them is prose and their fixture set, nothing else", () => {
    const seeds = ARCHETYPES.map((n) => read(`obj/room/${n}.yaml`));
    const prose = seeds.map((s) => s.data?.longDescription);
    expect(new Set(prose).size).toBe(4);

    const fixtures = seeds.map((s) => JSON.stringify(s.data?.populates ?? []));
    expect(new Set(fixtures).size).toBe(4);
  });

  it("adds ZERO new classes — every fixture is an already-shipped one", () => {
    // The check that keeps D12 honest. If a fixture ever needs a class of
    // its own, that is a design decision, not a detail — make it explicitly.
    const shipped = new Set([
      "/obj/Chair", // bed, tub, armchair — slots authored per seed
      "/obj/Oven", // the range
      "/obj/Chest", // the larder
      "/obj/UnboundedReceptacle", // the basin
      "/obj/Surface", // the counter
      "/obj/Prop", // the toilet — prose, no capability
    ]);
    for (const file of readdirSync(join(SEEDS, "obj/fixture"))) {
      const seed = read(`obj/fixture/${file}`);
      expect(shipped.has(seed.class ?? "")).toBe(true);
    }
  });
});

describe("the bedroom — FUNCTION (D10)", () => {
  it("seeds a bed that is lieable and better than the floor", () => {
    const bed = read("obj/fixture/bed.yaml");
    const slots = bed.data?.staticSlots as Array<{ postures?: string[] }>;
    expect(slots?.[0]?.postures).toContain("lie");
    // Authored constant, not derived — the aggregation from bedding
    // freshness and tidiness needs the condition model (a non-goal).
    expect(bed.data?.restQuality).toBeGreaterThan(1);
  });

  it("the DORM bed is lieable too — the mechanic reaches the room players have", () => {
    // Sleep-as-logout is the reason a residence is worth having, and the
    // dorm is the residence every player currently has. Leaving its bed a
    // prop you cannot lie on would have shipped the mechanic somewhere
    // nobody could reach it.
    const dorm = read("domain/eternal/duncan-hall/dorm-fixtures/bed.yaml");
    const slots = dorm.data?.staticSlots as Array<{ postures?: string[] }>;
    expect(slots?.[0]?.postures).toContain("lie");
    expect(dorm.data?.restQuality).toBeGreaterThan(1);
  });

  it("...but it is the BOTTOM rung — a bed you bought is better", () => {
    // The ladder should be visible from where you start: a university-issue
    // single with a thin mattress, against a bed you chose and paid for.
    const dorm = read("domain/eternal/duncan-hall/dorm-fixtures/bed.yaml");
    const owned = read("obj/fixture/bed.yaml");
    expect(dorm.data?.restQuality as number).toBeLessThan(
      owned.data?.restQuality as number,
    );
  });

  it("the dorm retrofit changed NO class: path — no live-record migration", () => {
    // Every live dorm room holds a record keyed by its unit parcel. The
    // capability landed on the class and the slot spec landed as DATA, so
    // the template row still names the same class it always did.
    const dorm = read("domain/eternal/duncan-hall/dorm-fixtures/bed.yaml");
    expect(dorm.class).toBe("/domain/eternal/duncan-hall/Bed");
  });
});

describe("the kitchen — BUNDLE (D12)", () => {
  it("collapses the errand: heat, water, a work surface, food in reach", () => {
    const kitchen = read("obj/room/kitchen.yaml");
    expect(kitchen.data?.populates).toEqual([
      "/obj/fixture/range",
      "/obj/fixture/counter",
      "/obj/fixture/larder",
      "/obj/fixture/basin",
    ]);
  });

  it("the larder's lid is load-bearing — seeded OPEN so the gather walk reaches it", () => {
    // The craft gather walk descends one level into OPEN room containers;
    // closed, the same larder is storage. Shipped behaviour the archetype
    // now depends on, so it is pinned here.
    expect(read("obj/fixture/larder.yaml").data?.open).toBe(true);
  });

  it("authors an `air` reserve — the one decision with teeth", () => {
    // The only room in the build where you deliberately run a fire indoors.
    // A finite budget + a lit fire + no ventilation = incomplete burn, smoke
    // and CO, self-smother. Any open neighbour ventilates, so it is
    // forgiving; deleting this block restores open air with nothing else
    // touched.
    const reserves = read("obj/room/kitchen.yaml").data?.reserves as Record<
      string,
      { capacityValue?: number; theme?: string }
    >;
    expect(reserves?.air?.theme).toBe("atmosphere");
    expect(reserves?.air?.capacityValue).toBe(100);
  });

  it("no OTHER archetype authors one — a bedroom is open air", () => {
    for (const name of ["bedroom", "bathroom", "living"] as const) {
      expect(read(`obj/room/${name}.yaml`).data?.reserves).toBeUndefined();
    }
  });
});

describe("the bathroom — PRESENCE (D13)", () => {
  it("three fixtures at three rungs of the LOD ladder", () => {
    expect(read("obj/room/bathroom.yaml").data?.populates).toEqual([
      "/obj/fixture/toilet",
      "/obj/fixture/basin",
      "/obj/fixture/tub",
    ]);
  });

  it("the toilet does nothing, deliberately — prose, no capability", () => {
    // Enforced rather than remembered. `/obj/Prop` is Tangible +
    // Visible + Containable and nothing else: no slot, no surface, no
    // container, no bulk. If you are here to "finish" the toilet: don't.
    const toilet = read("obj/fixture/toilet.yaml");
    expect(toilet.class).toBe("/obj/Prop");
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
    const tub = read("obj/fixture/tub.yaml");
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
    const living = read("obj/room/living.yaml");
    expect(living.data?.populates).toBeUndefined();
    expect(living.data?.ambientIntensity).toBeGreaterThan(0);
  });

  it("seating is a good you BUY, not a fitted built-in", () => {
    const chair = read("obj/fixture/armchair.yaml");
    expect(chair.class).toBe("/obj/Chair");
    // ...and it is in no archetype's populates.
    for (const name of ARCHETYPES) {
      const populates = (read(`obj/room/${name}.yaml`).data?.populates ??
        []) as string[];
      expect(populates).not.toContain("/obj/fixture/armchair");
    }
  });

  it("no television — `watch` needs no object, so an object would model nothing", () => {
    const files = readdirSync(join(SEEDS, "obj/fixture"));
    expect(files.some((f) => /tv|television|screen/i.test(f))).toBe(false);
  });
});

describe("venue-genericity and the tier invariant (D15, D13)", () => {
  it("no archetype row is tier-specific — the frontier build adds a resolver, not edits", () => {
    // The surviving half of water-by-tier: v1 ships the tap, and the
    // invariant that costs nothing now and is expensive to retrofit is that
    // NO row encodes a locality or assumes municipal plumbing.
    for (const name of ARCHETYPES) {
      const raw = readFileSync(join(SEEDS, `obj/room/${name}.yaml`), "utf8");
      expect(raw).not.toMatch(/terminus|hinkley|municipal/i);
    }
  });

  it("no archetype names a residence — home-ness comes from the parcel above", () => {
    for (const name of ARCHETYPES) {
      const seed = read(`obj/room/${name}.yaml`);
      expect(JSON.stringify(seed.data)).not.toMatch(/apartment|tenant|lease/i);
    }
  });
});
