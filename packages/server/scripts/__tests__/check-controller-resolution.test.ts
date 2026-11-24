/** `lint:controller-resolution` seen to FAIL: an instrument hunt and a self-resolution ARE found. */

import "../../src/test-bootstrap";
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { bindingRereadsIn, instrumentHuntsIn, selfResolutionsIn } from "../check-controller-resolution";

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

describe("⭐ binding re-reads (naming overhaul D-C10, counts 3 and 4) seen to fail", () => {
  it("FINDS a .raw re-resolved here, and not a .raw echoed, tested or handed to the object (D-C4)", () => {
    expect(bindingRereadsIn(`function f(model) { const w = model.thing.raw.trim().toLowerCase(); return w; }`).raw).toEqual([1]);
    expect(bindingRereadsIn(`function f(model) { const w = model.thing.raw; if (w === 'pot') go(); }`).raw).toEqual([1]);
    expect(bindingRereadsIn(`function f(model) { const w = model.thing.raw.trim(); return stock.lineFor(w); }`).raw).toEqual([]);
    expect(bindingRereadsIn(`function f(model) { const why = room.groundRefusal(model.t.raw); if (why !== null) x(); }`).raw).toEqual([]);
    expect(bindingRereadsIn(`function f(model) { return this.fail(context, \`no '\${model.thing.raw}' here\`, 'x'); }`).raw).toEqual([]);
    expect(bindingRereadsIn(`function f(model) { const raw = model.t?.raw ?? ''; if (!raw) return; this.refuse(context, new Refusal('r', { what: raw })); }`).raw).toEqual([]);
    expect(bindingRereadsIn(`function f(model) { if (model.t && model.t.raw) say(); }`).raw).toEqual([]);
  });

  it("FINDS a .via read off the declared facets and a lowered model word, not a whole .via handed on", () => {
    expect(bindingRereadsIn(`function f(model) { return model.t.via.weird; }`).via).toEqual([1]);
    expect(bindingRereadsIn(`function f(model) { return BulkableApi.slotFor(t, model.t.via); }`).via).toEqual([]);
    expect(bindingRereadsIn(`function f(model) { return (model.purpose ?? 'x').toLowerCase(); }`).via).toEqual([1]);
    expect(bindingRereadsIn(`function f(model) { return [model.t.via.detailPath, model.t.via.relation, MqlApi.effectiveTarget(model.t.via)]; }`).via).toEqual([]);
  });
});
