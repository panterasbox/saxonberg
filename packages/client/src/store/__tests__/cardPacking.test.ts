import { describe, expect, it } from "vitest";
import { columnsFor, moveBefore, packCards } from "../cardPacking";

describe("the gallery's packing", () => {
  it("as many columns as fit at the minimum width", () => {
    expect(columnsFor(707, 320, 16)).toBe(2);
    expect(columnsFor(300, 320, 16)).toBe(1);
    expect(columnsFor(1000, 320, 16)).toBe(3);
  });

  it("⭐ each card goes into the SHORTEST column — a short card leaves no hole", () => {
    // Two columns: a tall card, then two short ones. The second short card
    // goes UNDER the first short one, not under the tall one.
    const heights = new Map([
      ["tall", 400],
      ["short1", 100],
      ["short2", 100],
    ]);
    const p = packCards(["tall", "short1", "short2"], heights, 656, 320, 16);
    expect(p.columns).toBe(2);
    const tall = p.slots.get("tall")!;
    const s1 = p.slots.get("short1")!;
    const s2 = p.slots.get("short2")!;
    expect(tall).toMatchObject({ x: 0, y: 0 });
    expect(s1.x).toBeGreaterThan(0);
    expect(s1.y).toBe(0);
    expect(s2.x).toBe(s1.x);
    expect(s2.y).toBe(116);
    // The area is as tall as its tallest column.
    expect(p.height).toBe(400);
  });

  it("columns stretch to share the width", () => {
    const p = packCards(["a", "b"], new Map(), 700, 320, 20);
    expect(p.slots.get("a")!.width).toBe(340);
    expect(p.slots.get("b")!.x).toBe(360);
  });

  it("moveBefore lifts a card and sets it down before another, or last", () => {
    expect(moveBefore(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(moveBefore(["a", "b", "c"], "a", null)).toEqual(["b", "c", "a"]);
    expect(moveBefore(["a", "b", "c"], "a", "c")).toEqual(["b", "a", "c"]);
  });

  it("⭐ never more columns than cards — one card spans the gallery", () => {
    const p = packCards(["only"], new Map(), 700, 320, 20);
    expect(p.columns).toBe(1);
    expect(p.slots.get("only")!.width).toBe(700);
  });
});
