/**
 * ⭐⭐ A LIVE place card's "Here" is live (navigation-server review): it is
 * rebuilt from the record's `present`, not the look's frozen prose.
 */

import { describe, it, expect } from "vitest";
import type { LookSegment, SegmentItem } from "@saxonberg/types";
import { liveHere } from "../InspectionBody";

const list = (heading: string, labels: string[]): LookSegment => ({
  shape: "list",
  heading,
  sources: [],
  text: `── ${heading}: ${labels.join(", ")}.`,
  items: labels.map((label) => ({ stuffId: label, label, keyword: label, count: 1 })),
});
const prose: LookSegment = { shape: "prose", sources: [], text: "A cobbled square." };
const chip = (label: string): SegmentItem => ({ stuffId: label, label, keyword: label, count: 1 });
const headings = (segs: LookSegment[]): (string | undefined)[] => segs.map((s) => s.heading ?? s.shape);

describe("liveHere", () => {
  it("a static card keeps the look's line (no `present`)", () => {
    const segs = [prose, list("Here", ["Mara"]), list("You also see", ["a stall"])];
    expect(liveHere(segs, undefined)).toBe(segs);
  });

  it("replaces the look's Here with who is here NOW, in the same place", () => {
    const out = liveHere([prose, list("Here", ["Mara"]), list("You also see", ["a stall"])], [chip("Mara"), chip("Bob")]);
    expect(headings(out)).toEqual(["prose", "Here", "You also see"]);
    expect(out[1]!.items!.map((i) => i.label)).toEqual(["Mara", "Bob"]);
  });

  it("somebody arrives where nobody was at the look: Here appears before 'You also see'", () => {
    const out = liveHere([prose, list("You also see", ["a stall"])], [chip("Bob")]);
    expect(headings(out)).toEqual(["prose", "Here", "You also see"]);
  });

  it("everybody left: the line goes", () => {
    const out = liveHere([prose, list("Here", ["Mara"]), list("You also see", ["a stall"])], []);
    expect(headings(out)).toEqual(["prose", "You also see"]);
  });
});
