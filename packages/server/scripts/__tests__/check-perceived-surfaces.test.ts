/** `lint:perceived-surfaces` seen to FAIL: a planted unperceived surface IS found. */

import "../../src/test-bootstrap";
import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { PERCEIVED_SURFACES_CEILING, census, judgeUnit, localPerceiversOf, unitsOf } from "../check-perceived-surfaces";

const judged = (src: string, returnIsSink = false) => {
  const sf = parseTs("/x.ts", src);
  const local = localPerceiversOf(sf);
  return unitsOf(sf).map((u) => ({ name: u.name, ...judgeUnit(u, sf, returnIsSink, local) }));
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

  it("in the binder a return IS the sink — when the unit's source is MQL", () => {
    const src = `function bindOne(g) { return MqlApi.resolveOne("x", { commandGiver: g }); }`;
    expect(judged(src, false)[0]!.surface).toBe(false);
    expect(judged(src, true)[0]!.surface).toBe(true);
    // A containment walk with no MQL in it is bookkeeping (W3's rule).
    const walk = `function below(s) { return s.getContents(); }`;
    expect(judged(walk, true)[0]!.surface).toBe(false);
  });

  it("a call to a same-module helper that perceives is the filter, named (one hop)", () => {
    const src = `function seen(r, g) { return r.filter((s) => PerceptionApi.perceives(g, s)); }
      function bindOne(g) { return seen(MqlApi.resolveMany("x", { commandGiver: g }), g); }`;
    const bind = judged(src, true).find((u) => u.name === "bindOne")!;
    expect(bind).toMatchObject({ surface: true, perceives: true });
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
  it("at the ceiling — zero since W3 (D23)", () => {
    expect(PERCEIVED_SURFACES_CEILING).toBe(0);
    expect(census()).toEqual([]);
  });
});
