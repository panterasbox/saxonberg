/**
 * `lint:carry-moves` seen to FAIL on every shape the W10i sweep removed —
 * the ternary, the `if/else`, the `||` refusal, the bare bypass — and to
 * pass the questions that stayed (owner, 2026-11-15: `directMove` retired;
 * `ContainmentApi.move(item, body)` is the only call).
 */

import { describe, expect, it } from "vitest";
import {
  collectLiveFindings,
  scanCarryMoves,
  CARRY_BRANCH_CEILING,
  DIRECT_MOVE_CEILING,
} from "../check-carry-moves";

const kinds = (src: string): string[] => scanCarryMoves(src, "X.ts").map((f) => f.kind);

describe("the classifier", () => {
  it("FINDS the ternary that chose the bypass for a carrier (GiveController's shape)", () => {
    const src = `const r = MixinApi.isCarrying(to) ? to.directMove(item) : (ContainmentApi.move(item, to as Stuff & Container), null);`;
    expect(kinds(src).sort()).toEqual(["carry-branch", "direct-move"]);
  });

  it("FINDS an if/else that moves onto the carrier in either arm (TipJar's shape)", () => {
    const src = `if (MixinApi.isCarrying(actor)) { if (refuse(c)) return; } else ContainmentApi.move(c, actor);`;
    expect(kinds(src)).toEqual(["carry-branch"]);
  });

  it("FINDS a carrier-only move in an `&&` arm", () => {
    expect(kinds(`MixinApi.isCarrying(x) && ContainmentApi.move(item, x);`)).toEqual(["carry-branch"]);
  });

  it("FINDS the retired name anywhere, even a test spy's string-free member", () => {
    expect(kinds(`body.directMove(cup);`)).toEqual(["direct-move"]);
  });

  it("a question is not a move: the dry read, a refusal of a body that does not carry", () => {
    expect(kinds(`const r = MixinApi.isCarrying(g) ? g.wouldSetDown(x) : null;`)).toEqual([]);
    expect(kinds(`if (!MixinApi.isCarrying(a)) return no; ContainmentApi.move(rope, a);`)).toEqual([]);
  });

  it("a carrier-only branch that moves elsewhere is not counted (the unequip's set-down)", () => {
    expect(kinds(`if (MixinApi.isCarrying(g) && ok) { ContainmentApi.move(t, here ?? g); }`)).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("holds at the ceilings", () => {
    const all = collectLiveFindings();
    expect(all.filter((f) => f.kind === "direct-move")).toHaveLength(DIRECT_MOVE_CEILING);
    expect(all.filter((f) => f.kind === "carry-branch")).toHaveLength(CARRY_BRANCH_CEILING);
  });
});
