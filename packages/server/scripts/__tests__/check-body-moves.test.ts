/** `lint:body-moves` seen to FAIL: a planted move onto a body IS found. */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { BODY_MOVES_CEILING, allSites, judge, sitesIn } from "../check-body-moves";

const planted = (body: string, rel = "lib/fake/Fake.ts") =>
  sitesIn(parseTs("/fake.ts", `class Fake {\n  act(item, buyer, actor, self) {\n${body}\n  }\n}`), rel);

describe("the classifier", () => {
  it("FINDS a move onto a body-named destination (rule 1)", () => {
    const [s] = planted("ContainmentApi.move(item, buyer as Stuff & Container);");
    expect(s!.rule).toBe(1);
    expect(s!.key).toBe("lib/fake/Fake.ts :: Fake.act :: buyer");
  });

  it("FINDS a body's own `self` only in a body's file (rule 2)", () => {
    expect(planted("ContainmentApi.move(item, self);", "lib/character/Fake.ts")[0]!.rule).toBe(2);
    expect(planted("ContainmentApi.move(item, self);")[0]!.rule).toBeNull();
  });

  it("FINDS inherit-the-container, but not a body's own room (rule 3)", () => {
    expect(planted("const where = item.getContainer();\nContainmentApi.move(x, where);")[0]!.rule).toBe(3);
    expect(planted("const room = actor.getContainer();\nContainmentApi.move(x, room);")[0]!.rule).toBeNull();
    expect(
      planted("const where = item.getContainer();\nif (MixinApi.isPlace(where)) ContainmentApi.move(x, where);")[0]!
        .rule,
    ).toBeNull();
  });

  it("FINDS a local that may evaluate to a body (rule 4)", () => {
    expect(planted("const where = ok ? buyer : null;\nContainmentApi.move(x, where);")[0]!.rule).toBe(4);
  });
});

describe("W4's port idiom — `inCarrierElse`", () => {
  it("SKIPS a move in the else of `isCarrying(<dest>)` (if/else and ternary)", () => {
    expect(planted("if (MixinApi.isCarrying(buyer)) buyer.receive(item);\nelse ContainmentApi.move(item, buyer);")).toEqual([]);
    expect(planted("MixinApi.isCarrying(buyer) ? buyer.receive(item) : ContainmentApi.move(item, buyer);")).toEqual([]);
  });

  it("COUNTS the same move with no guard, or guarded on a DIFFERENT destination", () => {
    expect(planted("ContainmentApi.move(item, buyer);")[0]!.rule).toBe(1);
    expect(
      planted("if (MixinApi.isCarrying(actor)) actor.receive(item);\nelse ContainmentApi.move(item, buyer);")[0]!.rule,
    ).toBe(1);
  });

  it("COUNTS a move in the THEN branch of the guard", () => {
    expect(planted("if (MixinApi.isCarrying(buyer)) ContainmentApi.move(item, buyer);")[0]!.rule).toBe(1);
  });
});

describe("⭐ the verdict", () => {
  it("a planted site with no roster row FAILS as unrostered", () => {
    const v = judge(planted("ContainmentApi.move(item, buyer);"), {});
    expect(v.unrostered).toHaveLength(1);
  });

  it("a roster row with no site FAILS as stale; a tagged row is counted", () => {
    const sites = planted("ContainmentApi.move(item, buyer);");
    const v = judge(sites, {
      "lib/fake/Fake.ts :: Fake.act :: buyer": { tag: "handed" },
      "lib/gone/Gone.ts :: Gone.act :: by": { tag: "made" },
    });
    expect(v.counted.map((c) => c.tag)).toEqual(["handed"]);
    expect(v.stale).toHaveLength(1);
  });

  it("`allow` and `not-body` rows are not counted", () => {
    const sites = planted("ContainmentApi.move(item, buyer);");
    expect(judge(sites, { "lib/fake/Fake.ts :: Fake.act :: buyer": { tag: "allow", why: "x" } }).counted).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("every hit rostered, no stale row, the count at the ceiling", () => {
    const v = judge(allSites());
    expect(v.unrostered).toEqual([]);
    expect(v.stale).toEqual([]);
    expect(v.counted.length).toBe(BODY_MOVES_CEILING);
  });
});
