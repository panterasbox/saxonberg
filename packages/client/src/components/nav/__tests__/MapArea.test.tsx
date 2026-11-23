/** The map works like a map app (owner, review): zoom, find me, fit, drag is not a click. */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { NavSections } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { MapArea } from "../MapArea";

// jsdom has no PointerEvent: a MouseEvent that carries a pointerId.
if (typeof window.PointerEvent === "undefined") {
  class PE extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PE;
}

const Z = "/test/z";
const tag = (path: string) => ({ path, spoiler: 2 as const });
const sections: NavSections = {
  zone: { v: 1, id: tag(Z), kind: "grid", label: "Z" },
  place: { v: 1, stuffId: "p", name: "a", at: { x: 0, y: 0, z: 0 } },
};

const viewBox = (): number[] => screen.getByTestId("nav-map").getAttribute("viewBox")!.split(" ").map(Number);

describe("MapArea — a map app", () => {
  beforeEach(() => {
    useStore.getState().applyMapSnapshot({
      documents: [
        {
          locality: "l",
          claims: [
            { key: "a", kind: "place", place: tag(`${Z}/a`), name: "a", channel: "walked", at: { zone: tag(Z), x: 0, y: 0, z: 0, level: 0 }, firstSeen: 1, lastSeen: 1 },
            { key: "b", kind: "place", place: tag(`${Z}/b`), name: "b", channel: "walked", at: { zone: tag(Z), x: 9, y: 0, z: 0, level: 0 }, firstSeen: 1, lastSeen: 1 },
          ],
        },
      ],
    });
  });

  it("+ and − zoom; ⤢ fits everything; ⌖ follows you again", () => {
    render(<MapArea sections={sections} lenses={new Set()} />);
    expect(screen.getByTestId("nav-map-frame").getAttribute("data-following")).toBe("true");
    const w0 = viewBox()[2]!;
    fireEvent.click(screen.getByTestId("nav-zoom-in"));
    expect(viewBox()[2]!).toBeLessThan(w0);
    fireEvent.click(screen.getByTestId("nav-zoom-out"));
    fireEvent.click(screen.getByTestId("nav-zoom-out"));
    expect(viewBox()[2]!).toBeGreaterThan(w0);
    fireEvent.click(screen.getByTestId("nav-map-fit"));
    expect(screen.getByTestId("nav-map-frame").getAttribute("data-following")).toBe("false");
    // Both places are in the fitted box.
    const [x, , w] = viewBox();
    expect(x!).toBeLessThanOrEqual(0);
    expect(x! + w!).toBeGreaterThanOrEqual(9);
    fireEvent.click(screen.getByTestId("nav-me"));
    expect(screen.getByTestId("nav-map-frame").getAttribute("data-following")).toBe("true");
  });

  it("a drag pans and is not a click", () => {
    const onPlaceClick = vi.fn();
    render(<MapArea sections={sections} lenses={new Set()} onPlaceClick={onPlaceClick} />);
    const frame = screen.getByTestId("nav-map-frame");
    const x0 = viewBox()[0]!;
    fireEvent.pointerDown(frame, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 140, clientY: 100 });
    fireEvent.pointerMove(frame, { pointerId: 1, clientX: 180, clientY: 100 });
    fireEvent.pointerUp(frame, { pointerId: 1, clientX: 180, clientY: 100 });
    expect(viewBox()[0]!).toBeLessThan(x0);
    expect(frame.getAttribute("data-following")).toBe("false");
    fireEvent.click(screen.getAllByTestId("nav-place")[0]!);
    expect(onPlaceClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByTestId("nav-place")[0]!);
    expect(onPlaceClick).toHaveBeenCalledTimes(1);
  });
});
