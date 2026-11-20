/**
 * ZoneMap — marks and layers from a `ZoneView` fixture (navigation card D1).
 * Every assertion names a mark by test id and a state by attribute.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { WireClaim } from "@saxonberg/types";
import type { CopyClaim } from "../../../store/navSlice";
import { zoneView } from "../../../store/navSelectors";
import { ZoneMap, viewBoxFor } from "../ZoneMap";

const Z = "/z";
const tag = (path: string) => ({ path, spoiler: 2 as const });
let n = 0;
const place = (name: string, x: number, y: number, extra: Partial<WireClaim> & { level?: number } = {}): CopyClaim => {
  const { level = 0, ...rest } = extra;
  return {
    locality: "a",
    claim: { key: `p${n++}`, kind: "place", place: tag(`/z/${name}`), name, keywords: [name], channel: "walked", at: { zone: tag(Z), x, y, z: level, level }, firstSeen: 1, lastSeen: 1, ...rest },
  };
};
const edge = (from: string, dir: string, extra: Partial<WireClaim> = {}): CopyClaim => ({
  locality: "a",
  claim: { key: `e${n++}`, kind: "edge", place: tag(`/z/${from}`), dir, to: null, toLabel: null, channel: "seen", state: "open", firstSeen: 1, lastSeen: 1, ...extra },
});
const copy = (...e: CopyClaim[]) => Object.fromEntries(e.map((c) => [c.claim.key, c]));

const fixture = () =>
  zoneView(
    copy(
      place("vestibule", 0, 0),
      place("corridor", 0, 1, { channel: "seen" }),
      place("vault", 1, 2),
      place("pit", 0, 1, { level: -1 }),
      edge("vestibule", "north", { to: tag("/z/corridor") }),
      edge("corridor", "northeast", { to: tag("/z/vault") }),
      edge("corridor", "west", { state: "locked" }),
      edge("corridor", "down", { to: tag("/z/pit") }),
      edge("vestibule", "pumphouse"),
    ),
    Z,
  );

describe("ZoneMap", () => {
  it("draws places in their tiers, edges by shape, and you", () => {
    render(<ZoneMap view={fixture()} level={0} here={{ x: 0, y: 0, level: 0 }} lenses={new Set(["frontier"])} />);
    const tiers = screen.getAllByTestId("nav-place").map((g) => [g.getAttribute("data-place-name"), g.getAttribute("data-tier")]);
    expect(tiers).toEqual([["vestibule", "walked"], ["corridor", "known"], ["vault", "walked"]]);
    const shapes = Object.fromEntries(screen.getAllByTestId("nav-edge").map((g) => [g.getAttribute("data-dir"), g.getAttribute("data-shape")]));
    expect(shapes).toEqual({ north: "link", northeast: "link", west: "opening", down: "vertical", pumphouse: "named" });
    expect(screen.getAllByTestId("nav-edge").find((g) => g.getAttribute("data-dir") === "west")!.getAttribute("data-state")).toBe("locked");
    expect(screen.getByTestId("nav-here")).toBeTruthy();
    // The frontier lens marks the opening.
    expect(screen.getAllByTestId("nav-frontier")).toHaveLength(1);
  });

  it("shows only the level asked for", () => {
    render(<ZoneMap view={fixture()} level={-1} />);
    expect(screen.getAllByTestId("nav-place").map((g) => g.getAttribute("data-place-name"))).toEqual(["pit"]);
  });

  it("⛔ never draws an SVG <title> (the no-native-title gate)", () => {
    const { container } = render(<ZoneMap view={fixture()} level={0} />);
    expect(container.querySelector("title")).toBeNull();
    expect(container.querySelector("[title]")).toBeNull();
  });

  it("a frontier lens off draws no `?`; the lens layers are separate groups", () => {
    const { container } = render(<ZoneMap view={fixture()} level={0} lenses={new Set()} />);
    expect(screen.queryAllByTestId("nav-frontier")).toHaveLength(0);
    const layers = [...container.querySelectorAll("[data-layer]")].map((g) => g.getAttribute("data-layer"));
    expect(layers).toEqual(["edges", "places", "glyphs", "stubs", "lens-boundaries", "lens-refusals", "lens-frontier", "lens-route", "ticks", "here"]);
  });

  it("a place click goes to the handler; the thumbnail has none", () => {
    const onPlaceClick = vi.fn();
    const { unmount } = render(<ZoneMap view={fixture()} level={0} onPlaceClick={onPlaceClick} />);
    fireEvent.click(screen.getAllByTestId("nav-place")[1]!);
    expect(onPlaceClick).toHaveBeenCalledWith(expect.objectContaining({ name: "corridor" }));
    unmount();
    render(<ZoneMap view={fixture()} level={0} thumbnail />);
    expect(screen.getByTestId("nav-thumb").getAttribute("tabindex")).toBeNull();
    expect(screen.getAllByTestId("nav-place")[0]!.getAttribute("role")).toBeNull();
  });

  it("zoom is by hops from where you stand", () => {
    const view = fixture();
    const close = viewBoxFor(view, 0, "close", { x: 0, y: 0, level: 0 });
    // The vestibule and its one neighbor, grown to 3 × 3.
    expect(close.maxX - close.minX + 1).toBe(3);
    const whole = viewBoxFor(view, 0, "whole", { x: 0, y: 0, level: 0 });
    expect(whole).toEqual({ minX: 0, maxX: 1, minY: 0, maxY: 2 });
  });

  it("names the places only at close zoom", () => {
    const { container, rerender } = render(<ZoneMap view={fixture()} level={0} zoom="nearby" />);
    expect(container.querySelector("[data-layer=places] text")).toBeNull();
    rerender(<ZoneMap view={fixture()} level={0} zoom="close" here={{ x: 0, y: 0, level: 0 }} />);
    expect(container.querySelector("[data-layer=places] text")?.textContent).toBe("vestibule");
  });
});
