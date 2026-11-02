/**
 * The Hinkley lot's CONTENT claims, checked against the seed files.
 *
 * These are the things a browser cannot keep proving. The yard's
 * born-with kit lands exactly once, on a lot's first provisioning, and
 * the portable half of it belongs to whoever picks it up — so an e2e
 * that asserts "there is a watering can in the yard" is true on the
 * first run of a fresh world and false forever after. That is the kit
 * working, not failing.
 *
 * So the reachability half stays in `e2e/tests/hinkley.spec.ts` (the
 * gate hangs, the fixtures are there, the verbs dispatch) and the
 * content half lives here, where a seed edit is what breaks it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

// The Hinkley rows and their title claims are this pack's (residences D18).
const SEEDS = fileURLToPath(new URL("../../content/", import.meta.url));
const MANIFEST = fileURLToPath(new URL("../../pack.yaml", import.meta.url));

const read = (rel: string): { class?: string; data?: Record<string, unknown> } =>
  parse(readFileSync(join(SEEDS, rel), "utf8")) as {
    class?: string;
    data?: Record<string, unknown>;
  };

const HINKLEY = "world/terminus/hinkley-hills";
/** The house blueprint's rooms (harbors review 3), by leaf. */
const rooms: Record<string, { class?: string; data?: Record<string, unknown> }> = Object.fromEntries(
  ["yard", "hall", "kitchen", "living", "bedroom", "bathroom", "garden"].map((leaf) => [
    leaf,
    read(`${HINKLEY}/house/${leaf}.yaml`),
  ]),
);

describe("the yard ships the kit that makes it workable", () => {
  const yard = read(`${HINKLEY}/house/yard.yaml`);
  const populates = (yard.data?.props ?? []) as string[];

  it("⭐ ships a WATERING CAN, because `water` is tool-conferred", () => {
    // Not decoration. `water` reaches a giver through the `watering`
    // ToolCapability at `placement: carried`, so a yard with a bed and a
    // standpipe and no can is ground you cannot actually work — the verb
    // is simply not there. This shipped broken once.
    expect(populates).toContain("/stuff/thing/vessel/watering-can");
  });

  it("ships the bed and the water source", () => {
    expect(populates).toContain("/trade/farming/thing/bed/garden");
    expect(populates).toContain(`/${HINKLEY}/thing/standpipe`);
  });

  it("is NOT a Location — a per-lot room is off the grid", () => {
    // N lots cannot share one coordinate, and a cartesian yard divided
    // its open sky by the zone's cellSize² down to 16.7 lux — under the
    // light floor its own crop needs.
    expect(yard.class).toBe("/platform/location/PersistentLocation");
    expect(yard.data?.coords).toBeUndefined();
  });
});

describe("the lane authors no exit into a lot", () => {
  const lane = read(`${HINKLEY}/location/lane.yaml`);
  const exits = (lane.data?.exits ?? {}) as Record<
    string,
    { destination?: string }
  >;

  it("⭐ nothing static points at the shared yard template", () => {
    // A static edge to a template that is cloned per lot stands the
    // TEMPLATE up as a place — an unowned yard on nobody's lot. Gates are
    // installed per sale by `PlatWarren`, deferred, named for the leaf.
    for (const [dir, spec] of Object.entries(exits)) {
      expect(
        spec.destination,
        `lane exit '${dir}' names the yard template`,
      ).not.toBe(`/${HINKLEY}/house/yard`);
    }
  });

  it("leaves only the road out", () => {
    expect(Object.keys(exits)).toEqual(["east"]);
  });
});

describe("one lot ships already sold", () => {
  const manifest = parse(readFileSync(MANIFEST, "utf8")) as {
    requires: { title: Array<Record<string, unknown>> };
  };
  const lot1 = manifest.requires.title.find(
    (p) => p.extent === `/${HINKLEY}/lots/lot-1`,
  );

  it("⭐ lot-1 exists, so the lane's prose is true on a fresh world", () => {
    // The lane says "Where a lot has been taken there is a gate in the
    // fence and, behind it, somebody's roof." Without a sold lot that
    // sentence describes a house nobody can see.
    expect(lot1).toBeDefined();
    expect(lot1?.parentParcel).toBe(`/${HINKLEY}`);
    expect(lot1?.landUse).toBe("residential");
  });

  it("is a quarter-acre, like every lot the book sells", () => {
    const book = read(`${HINKLEY}/idea/plat-book.yaml`);
    expect(lot1?.areaM2).toBe(book.data?.areaM2);
  });

  it("its leaf fits the GENERATIVE book (D10 — prefix + capacity, no roster)", () => {
    const book = read(`${HINKLEY}/idea/plat-book.yaml`);
    const holder = read(`${HINKLEY}/idea/lot-holder.yaml`);
    expect(book.data?.lots).toBeUndefined(); // the roster is retired
    const prefix = String(book.data?.lotPrefix ?? 'lot-');
    expect('lot-1'.startsWith(prefix)).toBe(true);
    expect(Number(holder.data?.defaultCapacity)).toBeGreaterThanOrEqual(1);
  });

  it("the house is a BLUEPRINT over its own rows (harbors review 3)", () => {
    const programme = read(`${HINKLEY}/idea/house-programme.yaml`);
    expect(programme.data?.blueprint).toBe(`/${HINKLEY}/idea/house-blueprint`);
    const blueprint = read(`${HINKLEY}/idea/house-blueprint.yaml`);
    expect(blueprint.data?.extent).toBe(`/${HINKLEY}/house`);
    expect(blueprint.data?.entrance).toBe(`/${HINKLEY}/house/yard`);
    expect(Object.keys(rooms)).toHaveLength(7);
  });
});

describe("⭐ a Hinkley house has hot water (cleanliness)", () => {
  it("its bathroom is the house's own row, with a tub, its tap and a copper", () => {
    expect(rooms.bathroom).toBeDefined();
    const row = read(`${HINKLEY}/house/bathroom.yaml`);
    expect(row.class).toBe("/platform/location/PersistentLocation");
    expect(row.data?.props).toEqual(
      expect.arrayContaining([
        "/stuff/thing/fixture/tub",
        "/stuff/thing/fixture/bath-tap",
        "/stuff/thing/fixture/copper",
      ]),
    );
  });
});

describe("⭐ a Hinkley house has a garden — a tract of its layout (tracts build W4)", () => {
  it("the garden is open ground, the lot's share of what the house leaves", () => {
    expect(rooms.garden?.data?.share).toBe(1);
    expect(read(`${HINKLEY}/house/garden.yaml`).class).toBe("/trade/farming/location/Tract");
  });

  it("the house and yard stand on 220 m² of a quarter-acre: the garden is about 780", () => {
    const built = Number(read(`${HINKLEY}/idea/house-blueprint.yaml`).data?.footprintM2);
    const book = read(`${HINKLEY}/idea/plat-book.yaml`);
    expect(built).toBe(220);
    expect(Number(book.data?.areaM2) - built).toBe(780);
  });

  it("the garden is west of the yard, clear of the house door and the way out", () => {
    const exits = (rooms.yard?.data?.exits ?? {}) as Record<string, { destination?: string }>;
    expect(exits.west?.destination).toBe(`/${HINKLEY}/house/garden`);
  });

  it("the garden takes a planting in a bed (a house lot takes beds, not fields)", () => {
    const props = (read(`${HINKLEY}/house/garden.yaml`).data?.props ?? []) as string[];
    expect(props).toContain("/trade/farming/thing/bed/garden");
  });
});
