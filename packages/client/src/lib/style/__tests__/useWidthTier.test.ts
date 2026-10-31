/**
 * The slate's table, row by row (client-surface D9, AC 1): how many card
 * columns fit at each common CSS width, with the panel open and shut.
 * Zoom is a CSS width — a 1920 screen at 150% IS 1280 — so these rows
 * are the 125%/150% cases too.
 */

import { describe, it, expect } from "vitest";
import { tierOf, unitsFor } from "../useWidthTier";

const rem = (px: number): number => px / 16;

describe("units per CSS width (the slate's table)", () => {
  it.each([
    [1280, 0, 1],
    [1366, 1, 1],
    [1440, 1, 1],
    [1536, 1, 2],
    [1728, 2, 2],
    [1920, 2, 3],
    [2560, 4, 4],
  ])("%ipx: %i with the panel open, %i shut", (px, open, shut) => {
    expect(unitsFor(rem(px), true)).toBe(open);
    expect(unitsFor(rem(px), false)).toBe(shut);
  });
});

describe("tiers", () => {
  it.each([
    [390, "phone"],
    [900, "narrow"],
    [1440, "feed"],
    [1920, "workspace"],
    [2560, "wide"],
  ] as const)("%ipx is %s", (px, tier) => {
    expect(tierOf(rem(px))).toBe(tier);
  });

  it("at a 20px root font (a zoomed or enlarged root), 1920px is a feed, not a workspace", () => {
    expect(tierOf(1920 / 20)).toBe("feed");
  });
});
