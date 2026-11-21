/** The room you stand in is drawn from what you see, even when your map has not recorded it (owner, review). */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore } from "../../../store/index";
import { NavCard } from "../NavCard";

const tag = (path: string) => ({ path, spoiler: 2 as const });

describe("a fresh player in the lounge", () => {
  beforeEach(() => {
    useStore.getState().applyMapSnapshot({ documents: [] });
    useStore.getState().applyNavSnapshot({
      zone: { v: 1, id: tag("/test/lounge"), kind: "grid", label: "the lounge" },
      // The lounge sends no position, and nothing is on your map.
      place: { v: 1, stuffId: "l", name: "the lounge", light: "lit" },
      ways: { v: 1, ways: [{ direction: "north", state: "open", crossesZone: false, destination: "Dave's Bar" }] },
    });
  });

  it("sees the room it stands in and its way out — and the way is a click to go", () => {
    const send = vi.fn();
    render(<NavCard onSendCommand={send} />);
    expect(screen.queryByTestId("nav-map-empty")).toBeNull();
    expect(screen.getAllByTestId("nav-place").map((p) => p.getAttribute("data-place-name"))).toEqual(["the lounge"]);
    expect(screen.getByTestId("nav-here")).toBeTruthy();
    const north = screen.getAllByTestId("nav-edge").find((e) => e.getAttribute("data-dir") === "north")!;
    fireEvent.click(north);
    expect(send).toHaveBeenCalledWith("go north");
    fireEvent.click(screen.getAllByTestId("nav-place")[0]!);
    expect(send).toHaveBeenLastCalledWith("look");
  });

  it("in the dark, nothing is drawn — you cannot see it", () => {
    useStore.getState().applyNavChanges([{ op: "replace", key: "place", fields: { v: 2, stuffId: "l", name: "the lounge", dark: true } }] as never);
    render(<NavCard onSendCommand={() => {}} />);
    expect(screen.getByTestId("nav-map-empty")).toBeTruthy();
  });
});
