/**
 * The Duncan Hall dorm bed against the bedroom archetype — beside its
 * content: the dorm bed is lieable (the mechanic reaches the room
 * players actually have), sits at the BOTTOM rung of the bed ladder, and
 * the retrofit changed no `class:` (no live-record migration).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const SEEDS = fileURLToPath(new URL("../../../../../../../content/world-seed/content/", import.meta.url));
// The owned bed archetype is the generic-objects pack's row (content-packs wave 3).
const OBJECTS = fileURLToPath(new URL("../../../../../../../content/generic-objects/content/", import.meta.url));

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

const read = (rel: string): Seed =>
  parse(readFileSync(join(SEEDS, rel), "utf8")) as Seed;

describe("the dorm bed against the bedroom archetype", () => {
  it("the DORM bed is lieable too — the mechanic reaches the room players have", () => {
    // Sleep-as-logout is the reason a residence is worth having, and the
    // dorm is the residence every player currently has. Leaving its bed a
    // prop you cannot lie on would have shipped the mechanic somewhere
    // nobody could reach it.
    const dorm = read("world/eternal/duncan-hall/dorm-fixtures/bed.yaml");
    const slots = dorm.data?.staticSlots as Array<{ postures?: string[] }>;
    expect(slots?.[0]?.postures).toContain("lie");
    expect(dorm.data?.restQuality).toBeGreaterThan(1);
  });

  it("...but it is the BOTTOM rung — a bed you bought is better", () => {
    // The ladder should be visible from where you start: a university-issue
    // single with a thin mattress, against a bed you chose and paid for.
    const dorm = read("world/eternal/duncan-hall/dorm-fixtures/bed.yaml");
    const owned = parse(readFileSync(join(OBJECTS, "obj/fixture/bed.yaml"), "utf8")) as Seed;
    expect(dorm.data?.restQuality as number).toBeLessThan(
      owned.data?.restQuality as number,
    );
  });

  it("the dorm retrofit changed NO class: path — no live-record migration", () => {
    // Every live dorm room holds a record keyed by its unit parcel. The
    // capability landed on the class and the slot spec landed as DATA, so
    // the template row still names the same class it always did.
    const dorm = read("world/eternal/duncan-hall/dorm-fixtures/bed.yaml");
    expect(dorm.class).toBe("/world/eternal/duncan-hall/Bed");
  });
});
