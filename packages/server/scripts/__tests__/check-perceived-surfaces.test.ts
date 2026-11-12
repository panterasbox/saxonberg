/** `lint:perceived-surfaces` seen to FAIL: a planted unperceived surface IS found. */

import "../../src/test-bootstrap";
import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { PERCEIVED_SURFACES_CEILING, census, judgeUnit, unitsOf } from "../check-perceived-surfaces";

const judged = (src: string, returnIsSink = false) => {
  const sf = parseTs("/x.ts", src);
  return unitsOf(sf).map((u) => ({ name: u.name, ...judgeUnit(u, sf, returnIsSink) }));
};

describe("the classifier", () => {
  it("FINDS a list resolved and written to a scene, never perceived", () => {
    const [u] = judged(`class XController { execute(g) {
      const xs = MqlApi.resolveMany("all:i", { commandGiver: g });
      MessageApi.scene(g).toSelf(xs).send();
    } }`);
    expect(u).toMatchObject({ name: "execute", surface: true, perceives: false });
  });

  it("a perceived list is not counted", () => {
    const [u] = judged(`class XController { execute(g) {
      const xs = PerceptionApi.perceived(g, g.getContents());
      MessageApi.scene(g).toSelf(xs).send();
    } }`);
    expect(u!.perceives).toBe(true);
  });

  it("system mode (commandGiver: null) is no source", () => {
    const [u] = judged(`function f() { const xs = MqlApi.resolveMany("x", { commandGiver: null }); MessageApi.scene(a); }`);
    expect(u!.surface).toBe(false);
  });

  it("in the binder a return IS the sink", () => {
    const src = `function bindOne(g) { return MqlApi.resolveOne("x", { commandGiver: g }); }`;
    expect(judged(src, false)[0]!.surface).toBe(false);
    expect(judged(src, true)[0]!.surface).toBe(true);
  });

  it("a subscribable read(stuff, viewer) is a surface; a mixin factory is not one unit", () => {
    const units = judged(`function FooMixin(Base) { return class extends Base {
      static subscribableFields = { contents: { read: (stuff, viewer) => stuff.getContents() } };
      look(g) { MessageApi.scene(g).toSelf(g.getContents()); }
    }; }`);
    expect(units.map((u) => u.name).sort()).toEqual(["look", "read"]);
    expect(units.every((u) => u.surface && !u.perceives)).toBe(true);
  });
});

describe("⭐ the live tree", () => {
  it("at the ceiling, above zero", () => {
    const n = census().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBe(PERCEIVED_SURFACES_CEILING);
  });
});
