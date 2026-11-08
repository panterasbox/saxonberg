/** `lint:controller-resolution` seen to FAIL: an instrument hunt and a self-resolution ARE found. */

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { instrumentHuntsIn, selfResolutionsIn } from "../check-controller-resolution";

/**
 * The self-resolution shapes live in a fixture file, not in string
 * literals here: `lint:test-bootstrap` reads a wired Api's name in a
 * string as a use of it.
 */
const SHAPES = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "__fixtures__", "controller-resolution-shapes.ts.txt"),
  "utf8",
);

describe("instrument hunts (the absorbed lint:instrument-args)", () => {
  it("FINDS a surroundings walk narrowed by a class", () => {
    const src = `const mill = room.getContents().find((c) => c instanceof GristMill);`;
    expect(instrumentHuntsIn(src, "x.ts")).toHaveLength(1);
  });

  it("asking an object it holds for its own contents is the sanctioned rung", () => {
    const src = `const charge = pit.getContents().find((c) => c instanceof Charcoal);`;
    expect(instrumentHuntsIn(src, "x.ts")).toEqual([]);
  });
});

describe("self-resolution", () => {
  it("FINDS the facade, a store find, a singleton fetch and a contents walk — and not a bound arg or a comment", () => {
    const found = selfResolutionsIn(SHAPES);
    expect(found).toHaveLength(4);
    expect(found.map((f) => f.line)).toEqual([3, 4, 5, 6]);
  });
});
