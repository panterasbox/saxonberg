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

// The Hinkley rows and their title claims are world-seed's (content-packs wave 3).
const SEEDS = fileURLToPath(new URL("../../../../../../../content/world-seed/content/", import.meta.url));
const MANIFEST = fileURLToPath(new URL("../../../../../../../content/world-seed/pack.yaml", import.meta.url));

const read = (rel: string): { class?: string; data?: Record<string, unknown> } =>
  parse(readFileSync(join(SEEDS, rel), "utf8")) as {
    class?: string;
    data?: Record<string, unknown>;
  };

const HINKLEY = "world/terminus/hinkley-hills";

describe("the yard ships the kit that makes it workable", () => {
  const yard = read(`${HINKLEY}/yard.yaml`);
  const populates = (yard.data?.populates ?? []) as string[];

  it("⭐ ships a WATERING CAN, because `water` is tool-conferred", () => {
    // Not decoration. `water` reaches a giver through the `watering`
    // ToolCapability at `placement: carried`, so a yard with a bed and a
    // standpipe and no can is ground you cannot actually work — the verb
    // is simply not there. This shipped broken once.
    expect(populates).toContain("/obj/vessel/watering-can");
  });

  it("ships the bed and the water source", () => {
    expect(populates).toContain("/obj/bed/garden");
    expect(populates).toContain(`/${HINKLEY}/standpipe`);
  });

  it("is NOT a CartesianLocation — a per-lot room is off the grid", () => {
    // N lots cannot share one coordinate, and a cartesian yard divided
    // its open sky by the zone's cellSize² down to 16.7 lux — under the
    // light floor its own crop needs.
    expect(yard.class).toBe("/obj/location/FurnishableRoom");
    expect(yard.data?.coords).toBeUndefined();
  });
});

describe("the lane authors no exit into a lot", () => {
  const lane = read(`${HINKLEY}/lane.yaml`);
  const exits = (lane.data?.exits ?? {}) as Record<
    string,
    { destination?: string }
  >;

  it("⭐ nothing static points at the shared yard template", () => {
    // A static edge to a template that is cloned per lot stands the
    // TEMPLATE up as a place — an unowned yard on nobody's lot. Gates are
    // installed per sale by `LotHolder`, deferred, named for the leaf.
    for (const [dir, spec] of Object.entries(exits)) {
      expect(
        spec.destination,
        `lane exit '${dir}' names the yard template`,
      ).not.toBe(`/${HINKLEY}/yard`);
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
    const book = read(`${HINKLEY}/plat-book.yaml`);
    expect(lot1?.areaM2).toBe(book.data?.areaM2);
  });

  it("its leaf is one the plat book knows, so `title list` reads `sold`", () => {
    const book = read(`${HINKLEY}/plat-book.yaml`);
    expect((book.data?.lots ?? []) as string[]).toContain("lot-1");
  });
});
