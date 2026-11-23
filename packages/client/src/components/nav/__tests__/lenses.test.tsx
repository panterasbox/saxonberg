/** The four lenses (navigation card D11): four channels, drawn together. */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { WireClaim } from "@saxonberg/types";
import type { CopyClaim } from "../../../store/navSlice";
import { zoneView, boundariesView } from "../../../store/navSelectors";
import { ZoneMap, type LensName } from "../ZoneMap";
import { LensRow } from "../LensRow";
import { lensDoc } from "../../doc/docs";

const Z = "/z";
const tag = (path: string) => ({ path, spoiler: 2 as const });
let n = 0;
const place = (name: string, x: number, y: number, doc: string): CopyClaim => ({
  locality: doc,
  claim: { key: `p${n++}`, kind: "place", place: tag(`/z/${name}`), name, keywords: [name], channel: "walked", at: { zone: tag(Z), x, y, z: 0, level: 0 }, firstSeen: 1, lastSeen: 1 },
});
const edge = (from: string, dir: string, extra: Partial<WireClaim> = {}): CopyClaim => ({
  locality: "town",
  claim: { key: `e${n++}`, kind: "edge", place: tag(`/z/${from}`), dir, to: null, toLabel: null, channel: "seen", state: "open", firstSeen: 1, lastSeen: 1, ...extra },
});
const locality = (address: string, gov: string): CopyClaim => ({
  locality: address,
  claim: { key: `l${n++}`, kind: "locality", place: address, name: address, government: { key: gov, name: gov }, channel: "walked", firstSeen: 1, lastSeen: 1 },
});
const copyOf = (...e: CopyClaim[]) => Object.fromEntries(e.map((c) => [`${c.locality}|${c.claim.key}`, c]));

const copy = copyOf(
  place("a", 0, 0, "town"),
  place("b", 1, 0, "town/abbey"),
  place("c", 0, 1, "town"),
  locality("town", "the-town"),
  locality("town/abbey", "the-abbey"),
  edge("a", "east", { to: tag("/z/b"), state: "locked" }),
  edge("c", "north"),
);

describe("boundariesView", () => {
  it("draws a border where two adjacent cells you know are kept by different governments", () => {
    const view = zoneView(copy, Z);
    expect(boundariesView(copy, view, 0)).toEqual([{ x: 0, y: 0, side: "east" }]);
  });
});

describe("the lenses together", () => {
  it("all four on draw on four channels", () => {
    const view = zoneView(copy, Z);
    const all = new Set<LensName>(["frontier", "route", "refusals", "boundaries"]);
    render(
      <ZoneMap
        view={view}
        level={0}
        lenses={all}
        boundaries={boundariesView(copy, view, 0)}
        route={[
          {
            nodes: [],
            legs: [{ from: tag("/z/c"), to: tag("/z/a"), dir: "south", minutes: null, conditional: false }],
            cost: { minutes: 0, legs: 1, conditional: 0, unmeasured: 1 },
            assumptions: [{ kind: "unmeasured", leg: 0, text: "untimed" }],
            leastCertain: 0,
          },
        ]}
      />,
    );
    expect(screen.getAllByTestId("nav-frontier").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("nav-route-leg")).toHaveLength(1);
    expect(screen.getByTestId("nav-route-uncertain")).toBeTruthy();
    expect(screen.getAllByTestId("nav-refusal")).toHaveLength(1);
    expect(screen.getAllByTestId("nav-boundary")).toHaveLength(1);
  });

  it("the row toggles a lens; a lens with nothing to draw says so", () => {
    const onToggle = vi.fn();
    render(<LensRow on={new Set(["frontier"])} onToggle={onToggle} tipFor={(l) => lensDoc(l, l === "frontier", 0)} />);
    expect(screen.getByTestId("nav-lens-frontier").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("nav-lens-boundaries"));
    expect(onToggle).toHaveBeenCalledWith("boundaries", true);
    expect(lensDoc("boundaries", false, 0).prose).toMatch(/None here/);
  });
});
