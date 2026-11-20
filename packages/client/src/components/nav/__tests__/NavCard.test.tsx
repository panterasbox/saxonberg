/** NavCard — the map is how you move (D3): a click on an opening from where you stand is `go`. */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { NavCard } from "../NavCard";

const Z = "/test/delve";
const tag = (path: string) => ({ path, spoiler: 2 as const });

describe("NavCard", () => {
  beforeEach(() => {
    useStore.getState().applyNavSnapshot({
      zone: { v: 1, id: tag(Z), kind: "grid", label: "The Delve", cellSizeM: 3 },
      place: { v: 1, stuffId: "v", name: "the mouth of the delve", at: { x: 0, y: 0, z: 0 } },
      ways: { v: 1, ways: [{ direction: "north", state: "open", crossesZone: false }, { direction: "south", state: "open", crossesZone: true }] },
    });
    useStore.getState().applyMapSnapshot({
      documents: [
        {
          locality: "last-counted-mile",
          claims: [
            { key: "p", kind: "place", place: tag(`${Z}/vestibule`), name: "the mouth of the delve", keywords: ["mouth"], channel: "walked", at: { zone: tag(Z), x: 0, y: 0, z: 0, level: 0 }, firstSeen: 1, lastSeen: 1 },
            { key: "e1", kind: "edge", place: tag(`${Z}/vestibule`), dir: "north", to: null, toLabel: tag(`${Z}/corridor-1`), channel: "seen", state: "open", firstSeen: 1, lastSeen: 1 },
          ],
        },
      ],
    });
  });

  it("a click on the opening north of you sends `go north`", () => {
    const send = vi.fn();
    render(<NavCard onSendCommand={send} />);
    const north = screen.getAllByTestId("nav-edge").find((e) => e.getAttribute("data-dir") === "north")!;
    expect(north.getAttribute("data-shape")).toBe("opening");
    fireEvent.click(north);
    expect(send).toHaveBeenCalledWith("go north");
  });
});
