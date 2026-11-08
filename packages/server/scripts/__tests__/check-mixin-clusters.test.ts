/** `lint:mixin-clusters` seen to FAIL: a mixin of two ideas that never touch IS found. */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { MIXIN_CLUSTERS_CEILING, census, clustersOf, factoriesIn } from "../check-mixin-clusters";

const clusters = (src: string) => {
  const [f] = factoriesIn(parseTs("/x.ts", src));
  return clustersOf(f!.cls);
};

const TWO_IDEAS = `export function OrgMixin<T>(Base: T) {
  return class extends Base {
    roster: string[] = [];
    appoint(p: string) { this.roster.push(p); this.beginShift(p); }
    beginShift(p: string) { return this.roster.includes(p); }
    call = "rota";
    callFor() { return this._lastCalled ?? this.call; }
    _lastCalled: string | null = null;
  };
}`;

describe("the heuristic", () => {
  it("⭐ FINDS two disjoint co-use clusters", () => {
    expect(clusters(TWO_IDEAS)).toHaveLength(2);
  });

  it("the same mixin with one bridging read is one idea", () => {
    const bridged = TWO_IDEAS.replace("return this.roster.includes(p);", "return this.roster.includes(p) && !!this.call;");
    expect(clusters(bridged)).toHaveLength(1);
  });

  it("⚠ a field and its accessors are ONE node — two plain properties are not a split", () => {
    const props = `export function PMixin<T>(Base: T) {
      return class extends Base {
        _a = 1; getA() { return this._a; } setA(v: number) { this._a = v; }
        _b = 2; getB() { return this._b; } setB(v: number) { this._b = v; }
      };
    }`;
    expect(clusters(props)).toHaveLength(0);
  });
});

describe("⭐ the live tree", () => {
  it("at or below the ceiling, above zero", () => {
    const found = census();
    expect(found.length).toBeGreaterThan(0);
    expect(found.length).toBeLessThanOrEqual(MIXIN_CLUSTERS_CEILING);
  });
});
