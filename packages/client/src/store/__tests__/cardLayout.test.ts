/**
 * Where each card goes (client-surface D5/D9, AC 2): a feed at one
 * column, a workspace at more; placed cards survive a narrow-and-back;
 * displacement takes the stalest unprotected flowing card, never a
 * placed, pinned, role or owed one.
 */

import { describe, it, expect } from "vitest";
import { arrangeCards } from "../cardLayout";
import type { CardState } from "../cardFeedSlice";

let t = 0;
function card(id: string, extra: Partial<CardState> = {}): CardState {
  t += 1;
  return {
    instanceId: id,
    cardId: "subject",
    key: `look ${id}`,
    live: false,
    pinned: false,
    records: [],
    openedAt: t,
    ...extra,
  };
}
const ids = (cs: CardState[]): string[] => cs.map((c) => c.instanceId);

describe("a feed (one column)", () => {
  it("placed cards first as a stable header, then flowing by touch, newest at the bottom", () => {
    const a = card("a");
    const b = card("b", { placed: { col: 0, row: 0 } });
    const c = card("c");
    const out = arrangeCards([a, b, c], 1, 10);
    expect(out.columns.map(ids)).toEqual([["b", "a", "c"]]);
  });

  it("a re-run card moves to the bottom", () => {
    const a = card("a");
    const b = card("b");
    a.touchedAt = 999;
    expect(arrangeCards([a, b], 1, 10).columns.map(ids)).toEqual([["b", "a"]]);
  });
});

describe("a workspace (two or more columns)", () => {
  it("⭐ placed cards hold their slots; flowing cards fill the shortest column", () => {
    const p = card("p", { placed: { col: 1, row: 0 } });
    const f1 = card("f1");
    const f2 = card("f2");
    const out = arrangeCards([p, f1, f2], 2, 10);
    // A tie goes to the leftmost column.
    expect(out.columns.map(ids)).toEqual([["f1", "f2"], ["p"]]);
  });

  it("⭐ narrowing folds the column that no longer fits; widening restores it (AC 2)", () => {
    const p = card("p", { placed: { col: 2, row: 0 } });
    const f = card("f");
    expect(arrangeCards([p, f], 2, 10).columns.map(ids)).toEqual([["f"], ["p"]]);
    expect(arrangeCards([p, f], 3, 10).columns.map(ids)).toEqual([["f"], [], ["p"]]);
  });
});

describe("running out of room", () => {
  it("⭐ displaces the STALEST unprotected flowing card, saying what displaced it", () => {
    const old = card("old");
    const mid = card("mid");
    const fresh = card("fresh");
    const out = arrangeCards([old, mid, fresh], 1, 2);
    expect(out.columns.map(ids)).toEqual([["mid", "fresh"]]);
    expect(out.trail[0]).toMatchObject({ reason: "displaced by look fresh" });
    expect(out.trail[0]!.card.instanceId).toBe("old");
  });

  it("⛔ never displaces a placed, pinned, role or owed card — it overflows instead", () => {
    const cards = [
      card("placed", { placed: { col: 0, row: 0 } }),
      card("pinned", { pinned: true }),
      card("role", { role: "here" }),
      card("owed", { promptId: "p1" }),
    ];
    const out = arrangeCards(cards, 1, 2);
    expect(out.trail).toEqual([]);
    expect(out.overflow).toBe(true);
    expect(out.columns[0]).toHaveLength(4);
  });

  it("no columns: every card is a chip in the glance strip", () => {
    const out = arrangeCards([card("a"), card("b")], 0, 4);
    expect(out.columns).toEqual([]);
    expect(ids(out.glance)).toEqual(["b", "a"]);
  });
});
